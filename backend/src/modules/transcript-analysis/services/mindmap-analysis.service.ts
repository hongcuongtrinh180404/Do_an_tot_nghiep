import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ILessonMindmap,
  ILessonMindmapData,
  LessonTranscriptionStatusEnum,
} from 'share-lib';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonMindmapRepository } from '../../course/repositories/lesson-mindmap.repository.js';
import { MindmapValidator } from '../validators/mindmap.validator.js';
import { GenerateMindmapDto } from '../dto/generate-mindmap.dto.js';

export interface MindmapGenerationResponse {
  lessonId: string;
  mindmap: ILessonMindmapData;
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
export class MindmapAnalysisService {
  private readonly logger = new Logger(MindmapAnalysisService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly lessonRepo: LessonRepository,
    private readonly lessonTranscriptRepo: LessonTranscriptRepository,
    private readonly lessonMindmapRepo: LessonMindmapRepository,
  ) { }

  /**
   * Tạo chuỗi transcript có đánh dấu mốc giây để Gemini trích xuất timestamp chính xác
   */
  public formatTranscriptWithTimestamps(
    sentences: Array<{ text: string; start: number; end: number }>,
    rawTranscript: string,
  ): string {
    if (sentences && sentences.length > 0) {
      return sentences
        .map((s) => {
          // start trong DB tính bằng mili-giây -> đổi sang giây
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
   * Xây dựng Prompt phân tích cấu trúc cây Mindmap tiếng Việt
   */
  public buildMindmapPrompt(
    lessonTitle: string,
    durationSeconds: number,
    formattedTranscript: string,
  ): string {
    return `Bạn là một chuyên gia sư phạm và cấu trúc tri thức bài giảng trực tuyến.
Nhiệm vụ của bạn là phân tích transcript của video bài giảng thành một sơ đồ tư duy (Mindmap) dạng cây phân cấp JSON chuẩn.

THÔNG TIN BÀI GIẢNG:
- Tiêu đề bài học: "${lessonTitle}"
- Thời lượng video: ${durationSeconds} giây

QUY TẮC CẤU TRÚC CÂY BẮT BUỘC:
Phân tích dữ liệu transcript bài giảng (gồm các đoạn/câu kèm mốc thời gian "start", "end" tính bằng giây) để trích xuất thành cây sơ đồ tư duy phân cấp ngữ nghĩa.

I. RÀNG BUỘC ĐỘ SÂU LEVEL (TỐI ĐA 4 LEVEL):
1. Cấu trúc cây có TỐI ĐA 4 LEVEL tính từ node gốc "root":
   - Level 1 (Node Root duy nhất): Đại diện cho toàn bộ bài học, tiêu đề BẮT BUỘC là tên video bài giảng ("${lessonTitle}"), "id": "root", mốc thời gian "timestamp": 0.
   - Level 2: Các chủ đề / phân đoạn kiến thức chính của bài học (các nhánh con trực tiếp của root).
   - Level 3: Các ý chi tiết, cơ chế, phương pháp, quy trình triển khai cho từng chủ đề (các nhánh con của Level 2).
   - Level 4: Các chi tiết cụ thể, từ khóa cốt lõi hoặc ví dụ minh họa điển hình (các nhánh con của Level 3). Đây là LEVEL TỐI ĐA của cây, TUYỆT ĐỐI KHÔNG ĐƯỢC có thêm node con ("children").
2. KHÔNG CÓ MỨC TỐI THIỂU CHO MỖI NODE:
   - Độ sâu của từng nhánh hoàn toàn linh hoạt theo độ phong phú của nội dung bài giảng thực tế.
   - KHÔNG bắt buộc một node phải có node con. Một nhánh có thể kết thúc ở Level 2, Level 3 hoặc Level 4 (không ép buộc mọi nhánh phải đạt đủ 4 level).
   - Chỉ tạo thêm nhánh con khi thực sự cần phân tách làm rõ nội dung; nếu ý kiến thức đã rõ ràng thì dừng lại mà không cần đào sâu thêm.

II. XỬ LÝ VĂN BẢN & SỬA LỖI NHẬN DIỆN GIỌNG NÓI (ASR CORRECTION):
1. Tự động phát hiện và sửa các lỗi chính tả âm học hoặc thuật ngữ chuyên ngành bị phiên âm sai dựa theo ngữ cảnh bài học.
2. Tự động ngắt ý theo ngữ nghĩa thực tế ngay cả khi dữ liệu đầu vào bị thiếu dấu chấm câu hoặc gộp nhiều đoạn dài vào chung một phần tử "sentences".

III. QUY TẮC CHỌN LỌC & PHÂN TÁCH NODE:
1. BẮT BUỘC TÁCH thành node riêng đối với các thông tin mang giá trị cốt lõi:
   - Chủ đề chính, khái niệm hoặc thuật ngữ chuyên môn.
   - Cơ chế hoạt động, bản chất khoa học hoặc mối quan hệ nguyên nhân - kết quả.
   - Điều kiện tiên quyết, lưu ý kỹ thuật hoặc yếu tố làm tăng/giảm hiệu quả.
   - Các bước trong quy trình thực hiện.
   - Ứng dụng thực tế hoặc ví dụ minh họa điển hình.
2. BỎ QUA (không đưa vào Mindmap) các thông tin phụ:
   - Phần mở đầu chào hỏi, dẫn nhập chung chung hoặc lời kết xã giao.
   - Câu chuyển tiếp giữa các phần, từ đệm trong văn nói, câu cảm thán.
   - Lời giải thích dài dòng lặp lại ý đã nêu ở node trước đó.

IV. QUY TẮC ĐẶT TIÊU ĐỀ ("title"):
1. Tiêu đề ("title") phải cô đọng, súc tích (ưu tiên dưới 12 từ), truyền tải trực tiếp nội dung kiến thức (ví dụ: thay vì viết "Điều kiện thực hiện", hãy viết rõ "Điều kiện: Lửa lớn và nguyên liệu phải khô").

V. QUY TẮC TÍNH MỐC THỜI GIAN ("timestamp" - Đơn vị: giây):
1. Trường hợp câu ngắn bình thường: Lấy mốc "start" của phần tử "sentences" bắt đầu đề cập đến ý của node đó.
2. Trường hợp câu bị dính dài (Run-on sentence): Khi một phần tử trong mảng "sentences" kéo dài hàng chục giây và chứa nhiều ý hoặc nhiều chủ đề nối tiếp nhau, TUYỆT ĐỐI KHÔNG gán cùng một mốc "start" đầu câu cho mọi node bên trong. Hãy ước lượng nội suy (interpolate) giá trị "timestamp" trong khoảng [start, end] của câu đó dựa theo vị trí tương đối của từ khóa bắt đầu ý mới.

ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC LÀ JSON THUẦN HỢP LỆ):
{
  "root": {
    "id": "root",
    "title": "${lessonTitle}",
    "timestamp": 0,
    "children": [
      {
        "id": "node-1",
        "title": "Tên chủ đề 1",
        "timestamp": 15,
        "children": [
          {
            "id": "node-1-1",
            "title": "Ý chi tiết 1.1",
            "timestamp": 35,
            "children": [
              {
                "id": "node-1-1-1",
                "title": "Từ khóa cốt lõi",
                "timestamp": 50
              }
            ]
          }
        ]
      }
    ]
  }
}

TRANSCRIPT BÀI GIẢNG CÓ MỐC THỜI GIAN:
${formattedTranscript}`;
  }

  /**
   * Sinh sơ đồ tư duy bài học từ transcript với Gemini API
   */
  async generateMindmap(
    lessonId: string,
    dto?: GenerateMindmapDto,
    userId?: string,
  ): Promise<MindmapGenerationResponse> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    // 1. Kiểm tra bài học tồn tại
    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
    }

    // 2. Lấy transcript từ collection lesson_transcripts
    const transcript = await this.lessonTranscriptRepo.findByLessonId(trimmedLessonId);
    if (!transcript) {
      throw new BadRequestException(
        `Bài học "${lesson.title}" chưa có dữ liệu transcript. Vui lòng trích xuất transcript trước.`,
      );
    }

    if (transcript.status !== LessonTranscriptionStatusEnum.READY) {
      throw new BadRequestException(
        `Quá trình trích xuất transcript cho bài học đang ở trạng thái: ${transcript.status}. Chưa sẵn sàng để phân tích AI.`,
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
      `Bắt đầu sinh Mindmap cho bài học ${trimmedLessonId} ("${lesson.title}"), độ dài transcript: ${formattedTranscript.length} ký tự.`,
    );

    // 3. Xây dựng prompt độc lập cho Mindmap
    const prompt = this.buildMindmapPrompt(
      lesson.title,
      durationSeconds,
      formattedTranscript,
    );

    // 4. Gọi Gemini qua GeminiService với JSON output
    const geminiResult = await this.geminiService.generateJson<ILessonMindmapData>(
      prompt,
      {
        temperature: 0.2, // Nhiệt độ thấp để cấu trúc ổn định và bám sát transcript
      },
    );

    // 5. Kiểm tra chặt chẽ cấu trúc cây và mốc timestamp (MindmapValidator)
    MindmapValidator.validateOrFail(geminiResult.data, durationSeconds, 3);

    // 6. Lưu bản nháp (Draft) nếu được yêu cầu (mặc định: true)
    const shouldSaveDraft = dto?.saveAsDraft ?? true;
    if (shouldSaveDraft) {
      await this.lessonMindmapRepo.saveDraftByLessonId(
        trimmedLessonId,
        geminiResult.data,
        userId,
      );
      this.logger.log(`Đã lưu bản nháp Mindmap cho bài học ${trimmedLessonId}`);
    }

    return {
      lessonId: trimmedLessonId,
      mindmap: geminiResult.data,
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
   * Lấy sơ đồ tư duy hiện tại của bài học (gồm bản chính thức và bản nháp nếu có)
   */
  async getMindmap(lessonId: string): Promise<ILessonMindmap | null> {
    const trimmedId = lessonId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    return this.lessonMindmapRepo.findByLessonId(trimmedId);
  }

  /**
   * Áp dụng bản nháp Mindmap thành kết quả chính thức cho học viên xem
   */
  async applyDraft(lessonId: string, userId?: string): Promise<ILessonMindmap> {
    const trimmedId = lessonId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    const applied = await this.lessonMindmapRepo.applyDraftByLessonId(
      trimmedId,
      userId,
    );

    if (!applied) {
      throw new BadRequestException(
        'Không tìm thấy bản nháp Mindmap nào để áp dụng cho bài học này.',
      );
    }

    this.logger.log(`Đã áp dụng bản nháp Mindmap thành chính thức cho bài học ${trimmedId}`);
    return applied;
  }
}
