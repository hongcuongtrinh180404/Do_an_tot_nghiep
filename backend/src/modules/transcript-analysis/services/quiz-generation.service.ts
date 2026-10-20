import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  IGeneratedQuizItem,
  ILessonQuiz,
  ILessonQuizDraft,
  LessonTranscriptionStatusEnum,
  QuizQuestionTypeEnum,
} from 'share-lib';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { LessonQuizDraftRepository } from '../../course/repositories/lesson-quiz-draft.repository.js';
import { QuizValidator } from '../validators/quiz.validator.js';
import { GenerateQuizDto } from '../dto/generate-quiz.dto.js';

export interface QuizGenerationResponse {
  lessonId: string;
  quizzes: IGeneratedQuizItem[];
  metadata: {
    model: string;
    keyIndex: number;
    maskedKey: string;
    executionTimeMs: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

@Injectable()
export class QuizGenerationService {
  private readonly logger = new Logger(QuizGenerationService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly lessonRepo: LessonRepository,
    private readonly lessonTranscriptRepo: LessonTranscriptRepository,
    private readonly lessonQuizRepo: LessonQuizRepository,
    private readonly lessonQuizDraftRepo: LessonQuizDraftRepository,
  ) {}

  /**
   * Định dạng transcript với mốc giây để Gemini tham chiếu timestamp cho câu hỏi
   */
  public formatTranscriptWithTimestamps(
    sentences: Array<{ text: string; start: number; end: number }>,
    rawTranscript: string,
  ): string {
    if (sentences && sentences.length > 0) {
      return sentences
        .map((s) => {
          const startSec = Math.floor(s.start / 1000);
          const mins = Math.floor(startSec / 60)
            .toString()
            .padStart(2, '0');
          const secs = (startSec % 60).toString().padStart(2, '0');
          return `[${mins}:${secs} - ${startSec}s] ${s.text.trim()}`;
        })
        .join('\n');
    }

    return rawTranscript?.trim() || '';
  }

  /**
   * Xây dựng Prompt trắc nghiệm cho bài học theo nguyên tắc chất lượng hơn số lượng
   */
  public buildQuizPrompt(
    lessonTitle: string,
    durationSeconds: number,
    formattedTranscript: string,
    maxCount = 10,
  ): string {
    return `Bạn là một chuyên gia khảo thí và sư phạm bài giảng trực tuyến hàng đầu.
Nhiệm vụ của bạn là phân tích sâu transcript video bài giảng và sinh ra danh sách CÂU HỎI TRẮC NGHIỆM đánh giá kiến thức người học theo các tiêu chí chất lượng nghiêm ngặt sau:

THÔNG TIN BÀI GIẢNG:
- Tiêu đề bài học: "${lessonTitle}"
- Thời lượng video: ${durationSeconds} giây
- Giới hạn trần câu hỏi: Tối đa ${maxCount} câu hỏi (KHÔNG bắt buộc phải sinh đủ ${maxCount} câu).

QUY TẮC SỐ LƯỢNG VÀ CHỌN LỌC KIẾN THỨC (NGUYÊN TẮC: CHẤT LƯỢNG HƠN SỐ LƯỢNG):
1. ĐÁNH GIÁ TRƯỚC - QUYẾT ĐỊNH SAU:
   - Hãy đánh giá kỹ nội dung transcript trước, xác định những kiến thức thực sự đáng kiểm tra rồi mới quyết định số lượng câu hỏi phù hợp (từ 0 đến tối đa ${maxCount} câu).
   - Chỉ tạo câu hỏi khi nội dung transcript chứa kiến thức quan trọng, có giá trị học tập và đủ dữ kiện để xây dựng một câu hỏi chất lượng cao.
   - Ưu tiên các kiến thức cốt lõi, khái niệm quan trọng, nguyên lý, quy trình, mối quan hệ nhân quả, sự khác biệt giữa các khái niệm hoặc những nội dung cần ghi nhớ và vận dụng sâu.
   - Không tạo câu hỏi cho những thông tin vụn vặt, ít giá trị, lời chào hỏi/mở đầu/kết thúc, nội dung lặp lại hoặc những chi tiết không đủ quan trọng để kiểm tra mức độ hiểu bài.
   - Không cố chia nhỏ một kiến thức thành nhiều câu hỏi tương tự nhau chỉ để đạt đủ ${maxCount} câu.
   - Nếu transcript chỉ có đủ nội dung để tạo 4 câu hỏi chất lượng, HÃY CHỈ TẠO 4 CÂU. Nếu chỉ có 6 câu hỏi thực sự hữu ích, HÃY CHỈ TẠO 6 CÂU. Chỉ tạo đủ ${maxCount} câu khi nội dung thực sự phong phú và có đủ kiến thức quan trọng để xây dựng ${maxCount} câu hỏi khác biệt, có giá trị.
   - Nếu nội dung quá ngắn, quá đơn giản hoặc không đủ kiến thức phù hợp để tạo câu hỏi, hãy trả về ít câu hỏi hơn, thậm chí không tạo câu hỏi nào (trả về danh sách rỗng []) nếu cần thiết.
   - Mỗi câu hỏi phải kiểm tra một kiến thức hoặc năng lực hiểu bài có ý nghĩa riêng biệt. Tránh trùng lặp về kiến thức được kiểm tra, cách hỏi hoặc đáp án.
   - Tuyệt đối không bổ sung kiến thức ngoài transcript chỉ để tăng số lượng câu hỏi. Mọi câu hỏi và đáp án phải có căn cứ xác thực từ nội dung transcript.

2. THUỘC TÍNH BẮT BUỘC CỦA MỖI CÂU HỎI:
   - "order": Số nguyên tuần tự từ 1 đến N (với N <= ${maxCount}).
   - "timestamp": Mốc thời gian (tính bằng GIÂY, số nguyên từ 0 đến ${durationSeconds}) trong video xuất hiện kiến thức của câu hỏi đó để người học có thể dừng lại kiểm tra hoặc xem lại.
   - "question": Câu hỏi rõ ràng, bám sát nội dung bài giảng bằng tiếng Việt.
   - "questionType": "single" (viết thường, chỉ có 1 đáp án đúng).
   - "options": Mảng đúng 4 lựa chọn (A, B, C, D).
     Mỗi lựa chọn gồm:
     + "id": Chuỗi định danh duy nhất (ví dụ: "opt-1-A", "opt-1-B", ...)
     + "label": "A" hoặc "B" hoặc "C" hoặc "D"
     + "text": Nội dung đáp án bằng tiếng Việt
     + "isCorrect": true nếu là đáp án đúng, false nếu là đáp án sai.
     LƯU Ý CỰC KỲ QUAN TRỌNG: Mỗi câu hỏi phải có ĐÚNG 1 đáp án "isCorrect: true" và 3 đáp án "isCorrect: false".
   - "explanation": Giải thích ngắn gọn nhưng rõ ràng vì sao đáp án đó là chính xác, trích dẫn ý giảng từ video.

ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC LÀ JSON THUẦN HỢP LỆ VỚI KHÓA "quizzes"):
{
  "quizzes": [
    {
      "order": 1,
      "timestamp": 25,
      "question": "Nội dung câu hỏi trắc nghiệm trọng tâm số 1?",
      "questionType": "single",
      "options": [
        { "id": "opt-1-A", "label": "A", "text": "Nội dung lựa chọn A", "isCorrect": true },
        { "id": "opt-1-B", "label": "B", "text": "Nội dung lựa chọn B", "isCorrect": false },
        { "id": "opt-1-C", "label": "C", "text": "Nội dung lựa chọn C", "isCorrect": false },
        { "id": "opt-1-D", "label": "D", "text": "Nội dung lựa chọn D", "isCorrect": false }
      ],
      "explanation": "Giải thích chi tiết vì sao đáp án A là đúng căn cứ vào nội dung giảng..."
    }
  ]
}
(Lưu ý: Nếu nội dung transcript không đủ dữ kiện để tạo câu hỏi chất lượng, trả về { "quizzes": [] }).

TRANSCRIPT BÀI GIẢNG CÓ MỐC THỜI GIAN:
${formattedTranscript}`;
  }

  /**
   * Chuẩn hóa và làm sạch dữ liệu câu hỏi AI trả về trước khi validate và lưu trữ
   */
  public sanitizeAndNormalizeQuizzes(
    rawInput: unknown,
    durationSeconds: number,
    maxCount = 10,
  ): IGeneratedQuizItem[] {
    let list: Array<Record<string, unknown>> = [];
    if (Array.isArray(rawInput)) {
      list = rawInput as Array<Record<string, unknown>>;
    } else if (rawInput && typeof rawInput === 'object') {
      const obj = rawInput as Record<string, unknown>;
      if (Array.isArray(obj.quizzes)) {
        list = obj.quizzes as Array<Record<string, unknown>>;
      } else if (Array.isArray(obj.data)) {
        list = obj.data as Array<Record<string, unknown>>;
      } else if (Array.isArray(obj.questions)) {
        list = obj.questions as Array<Record<string, unknown>>;
      }
    }

    if (list.length > maxCount) {
      list = list.slice(0, maxCount);
    }

    return list.map((item, index) => {
      const order = Number(item.order) || index + 1;
      let timestamp = Number(item.timestamp);
      if (isNaN(timestamp)) {
        timestamp = Math.floor((durationSeconds / (list.length + 1)) * (index + 1));
      } else {
        timestamp = Math.round(timestamp);
        if (durationSeconds > 0 && timestamp > durationSeconds) {
          timestamp = Math.min(durationSeconds, timestamp);
        }
        if (timestamp < 0) timestamp = 0;
      }

      const rawQType = (item.questionType || '').toString().toLowerCase();
      const questionType =
        rawQType === 'single' || !rawQType
          ? QuizQuestionTypeEnum.SINGLE
          : (item.questionType as QuizQuestionTypeEnum);

      const options = Array.isArray(item.options)
        ? (item.options as Array<Record<string, unknown>>).map((opt, optIdx) => {
            const labels = ['A', 'B', 'C', 'D'];
            const defaultLabel = labels[optIdx] || String.fromCharCode(65 + optIdx);
            const label = (opt.label || defaultLabel).toString().trim().toUpperCase();
            const id = opt.id
              ? String(opt.id).trim()
              : `opt-${order}-${label}`;
            const text = (opt.text || '').toString().trim();
            const isCorrect =
              opt.isCorrect === true ||
              opt.isCorrect === 'true' ||
              opt.isCorrect === 1;

            return {
              id,
              label,
              text,
              isCorrect,
            };
          })
        : [];

      return {
        order,
        timestamp,
        question: (item.question || '').toString().trim(),
        questionType,
        options,
        explanation: (item.explanation || '').toString().trim(),
      };
    });
  }

  /**
   * Sinh danh sách câu hỏi trắc nghiệm từ transcript qua Gemini
   */
  async generateQuiz(
    lessonId: string,
    dto?: GenerateQuizDto,
    userId?: string,
  ): Promise<QuizGenerationResponse> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    const count = dto?.count ?? 10;

    // 1. Kiểm tra bài học
    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
    }

    // 2. Lấy transcript
    const transcript = await this.lessonTranscriptRepo.findByLessonId(trimmedLessonId);
    if (!transcript) {
      throw new BadRequestException(
        `Bài học "${lesson.title}" chưa có dữ liệu transcript. Vui lòng trích xuất transcript trước.`,
      );
    }

    if (transcript.status !== LessonTranscriptionStatusEnum.READY) {
      throw new BadRequestException(
        `Trạng thái trích xuất transcript là: ${transcript.status}. Chưa sẵn sàng để phân tích AI.`,
      );
    }

    const durationSeconds =
      transcript.durationSeconds || lesson.content?.duration || 600;

    const formattedTranscript = this.formatTranscriptWithTimestamps(
      transcript.sentences,
      transcript.rawTranscript,
    );

    if (!formattedTranscript) {
      throw new BadRequestException('Nội dung transcript rỗng, không đủ dữ liệu để phân tích.');
    }

    this.logger.log(
      `Bắt đầu sinh Quiz (tối đa ${count} câu chất lượng cao) cho bài học ${trimmedLessonId} ("${lesson.title}").`,
    );

    // 3. Xây dựng prompt
    const prompt = this.buildQuizPrompt(
      lesson.title,
      durationSeconds,
      formattedTranscript,
      count,
    );

    // 4. Gọi Gemini API
    const geminiResult = await this.geminiService.generateJson<{
      quizzes: IGeneratedQuizItem[];
    }>(prompt, {
      temperature: 0.25,
    });

    // 5. Chuẩn hóa và làm sạch dữ liệu AI trả về
    const quizzes = this.sanitizeAndNormalizeQuizzes(
      geminiResult.data,
      durationSeconds,
      count,
    );

    // 6. Kiểm tra tính hợp lệ
    QuizValidator.validateOrFail(quizzes, durationSeconds, count);

    // 7. Lưu câu hỏi: Mặc định (saveAsDraft: false) lưu trực tiếp thành câu hỏi chính thức cho bài học
    const shouldSaveDraft = dto?.saveAsDraft ?? false;
    if (shouldSaveDraft) {
      await this.lessonQuizDraftRepo.saveDraftByLessonId(
        trimmedLessonId,
        quizzes,
        userId,
      );
      this.logger.log(
        `Đã lưu bản nháp Quiz (${quizzes.length} câu hỏi) cho bài học ${trimmedLessonId}`,
      );
    } else {
      if (quizzes.length > 0) {
        // Chuyển đổi format sang LessonQuiz Entity và lưu trực tiếp thành chính thức
        const quizzesToInsert = quizzes.map((q) => ({
          timestamp: q.timestamp,
          order: q.order,
          question: q.question,
          questionType: q.questionType || QuizQuestionTypeEnum.SINGLE,
          options: q.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            text: opt.text,
            isCorrect: opt.isCorrect,
          })),
          explanation: q.explanation || null,
        }));

        await this.lessonQuizRepo.replaceAllQuizzesForLesson(
          trimmedLessonId,
          quizzesToInsert,
        );

        // Dọn dẹp bản nháp cũ nếu có
        await this.lessonQuizDraftRepo.clearDraftByLessonId(trimmedLessonId);

        this.logger.log(
          `Đã lưu và áp dụng trực tiếp ${quizzes.length} câu hỏi Quiz chính thức cho bài học ${trimmedLessonId}`,
        );
      } else {
        this.logger.log(
          `AI sinh 0 câu hỏi do transcript không đủ dữ kiện, bảo toàn câu hỏi chính thức hiện tại cho bài học ${trimmedLessonId}`,
        );
      }
    }

    return {
      lessonId: trimmedLessonId,
      quizzes,
      metadata: {
        model: geminiResult.model,
        keyIndex: geminiResult.keyIndex,
        maskedKey: geminiResult.maskedKey,
        executionTimeMs: geminiResult.executionTimeMs,
        usage: geminiResult.usage,
      },
    };
  }

  /**
   * Lấy bản nháp Quiz hiện tại của bài học
   */
  async getQuizDraft(lessonId: string): Promise<ILessonQuizDraft | null> {
    const trimmedId = lessonId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    return this.lessonQuizDraftRepo.findByLessonId(trimmedId);
  }

  /**
   * Áp dụng bản nháp Quiz thành danh sách câu hỏi chính thức cho bài học
   */
  async applyDraft(lessonId: string, _userId?: string): Promise<ILessonQuiz[]> {
    const trimmedId = lessonId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    const draft = await this.lessonQuizDraftRepo.findByLessonId(trimmedId);
    if (!draft || !draft.quizzes || draft.quizzes.length === 0) {
      throw new BadRequestException(
        'Không tìm thấy bản nháp Quiz nào để áp dụng cho bài học này.',
      );
    }

    // Chuyển đổi format sang LessonQuiz Entity
    const quizzesToInsert = draft.quizzes.map((q) => ({
      timestamp: q.timestamp,
      order: q.order,
      question: q.question,
      questionType: q.questionType || QuizQuestionTypeEnum.SINGLE,
      options: q.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
      explanation: q.explanation || null,
    }));

    const officialQuizzes = await this.lessonQuizRepo.replaceAllQuizzesForLesson(
      trimmedId,
      quizzesToInsert,
    );

    // Xóa bản nháp sau khi đã áp dụng thành công
    await this.lessonQuizDraftRepo.clearDraftByLessonId(trimmedId);

    this.logger.log(
      `Đã áp dụng thành công ${officialQuizzes.length} câu hỏi Quiz chính thức cho bài học ${trimmedId}`,
    );

    return officialQuizzes;
  }
}
