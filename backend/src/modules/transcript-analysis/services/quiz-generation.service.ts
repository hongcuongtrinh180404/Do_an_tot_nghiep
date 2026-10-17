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
   * Xây dựng Prompt trắc nghiệm cho bài học
   */
  public buildQuizPrompt(
    lessonTitle: string,
    durationSeconds: number,
    formattedTranscript: string,
    count = 10,
  ): string {
    return `Bạn là một chuyên gia khảo thí và sư phạm bài giảng trực tuyến.
Nhiệm vụ của bạn là phân tích transcript video bài giảng và sinh ra ĐÚNG ${count} CÂU HỎI TRẮC NGHIỆM đánh giá kiến thức người học.

THÔNG TIN BÀI GIẢNG:
- Tiêu đề bài học: "${lessonTitle}"
- Thời lượng video: ${durationSeconds} giây

QUY TẮC CÂU HỎI TRẮC NGHIỆM BẮT BUỘC:
1. SỐ LƯỢNG: Phải tạo ra ĐÚNG ${count} câu hỏi trắc nghiệm (không thừa, không thiếu).
2. PHÂN BỔ DÒNG THỜI GIAN: Các câu hỏi phải phân bổ đều theo trình tự video từ đầu đến cuối bài học.
3. THUỘC TÍNH CỦA MỖI CÂU HỎI:
   - "order": Số nguyên từ 1 đến ${count}.
   - "timestamp": Mốc thời gian (tính bằng GIÂY, số nguyên từ 0 đến ${durationSeconds}) trong video xuất hiện kiến thức của câu hỏi đó để người học có thể dừng lại kiểm tra hoặc xem lại.
   - "question": Câu hỏi rõ ràng, bám sát nội dung bài giảng bằng tiếng Việt.
   - "questionType": "SINGLE" (chỉ có 1 đáp án đúng).
   - "options": Mảng đúng 4 lựa chọn (A, B, C, D).
     Mỗi lựa chọn gồm:
     + "id": Chuỗi định danh (ví dụ: "opt-1-A", "opt-1-B", ...)
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
      "question": "Nội dung câu hỏi trắc nghiệm số 1?",
      "questionType": "SINGLE",
      "options": [
        { "id": "opt-1-A", "label": "A", "text": "Nội dung lựa chọn A", "isCorrect": true },
        { "id": "opt-1-B", "label": "B", "text": "Nội dung lựa chọn B", "isCorrect": false },
        { "id": "opt-1-C", "label": "C", "text": "Nội dung lựa chọn C", "isCorrect": false },
        { "id": "opt-1-D", "label": "D", "text": "Nội dung lựa chọn D", "isCorrect": false }
      ],
      "explanation": "Giải thích chi tiết vì sao đáp án A là đúng..."
    }
  ]
}

TRANSCRIPT BÀI GIẢNG CÓ MỐC THỜI GIAN:
${formattedTranscript}`;
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
      `Bắt đầu sinh Quiz (${count} câu) cho bài học ${trimmedLessonId} ("${lesson.title}").`,
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

    const quizzes = geminiResult.data?.quizzes || [];

    // 5. Kiểm tra chặt chẽ tính hợp lệ (10 câu, 4 options, 1 đúng, timestamp hợp lệ)
    QuizValidator.validateOrFail(quizzes, durationSeconds, count);

    // 6. Lưu bản nháp (Draft) nếu được yêu cầu
    const shouldSaveDraft = dto?.saveAsDraft ?? true;
    if (shouldSaveDraft) {
      await this.lessonQuizDraftRepo.saveDraftByLessonId(
        trimmedLessonId,
        quizzes,
        userId,
      );
      this.logger.log(`Đã lưu bản nháp Quiz cho bài học ${trimmedLessonId}`);
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
