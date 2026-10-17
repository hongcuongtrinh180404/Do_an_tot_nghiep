import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RoleEnum,
  ILessonMindmap,
  ILessonQuiz,
  ILessonQuizDraft,
  ILessonSummary,
} from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  MindmapAnalysisService,
  MindmapGenerationResponse,
} from './services/mindmap-analysis.service.js';
import {
  QuizGenerationService,
  QuizGenerationResponse,
} from './services/quiz-generation.service.js';
import {
  SummaryGenerationService,
  SummaryGenerationResponse,
} from './services/summary-generation.service.js';
import { GenerateMindmapDto } from './dto/generate-mindmap.dto.js';
import { GenerateQuizDto } from './dto/generate-quiz.dto.js';
import { GenerateSummaryDto } from './dto/generate-summary.dto.js';

@Controller('lessons')
export class TranscriptAnalysisController {
  constructor(
    private readonly mindmapAnalysisService: MindmapAnalysisService,
    private readonly quizGenerationService: QuizGenerationService,
    private readonly summaryGenerationService: SummaryGenerationService,
  ) {}

  // ==========================================
  // MINDMAP ENDPOINTS
  // ==========================================

  /**
   * Tạo mới hoặc tạo lại sơ đồ tư duy (Mindmap) từ transcript video bài học
   */
  @Post(':id/analysis/mindmap')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async generateMindmap(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: GenerateMindmapDto,
    @CurrentUser('id') userId?: string,
  ): Promise<ApiResponse<MindmapGenerationResponse>> {
    const result = await this.mindmapAnalysisService.generateMindmap(
      id,
      dto,
      userId,
    );
    return ApiResponse.success(result, 'Phân tích và tạo sơ đồ tư duy thành công');
  }

  /**
   * Lấy sơ đồ tư duy hiện tại của bài học
   */
  @Get(':id/analysis/mindmap')
  @Public()
  async getMindmap(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ApiResponse<ILessonMindmap | null>> {
    const mindmap = await this.mindmapAnalysisService.getMindmap(id);
    return ApiResponse.success(mindmap, 'Lấy sơ đồ tư duy bài học thành công');
  }

  /**
   * Áp dụng bản nháp Mindmap thành kết quả chính thức cho bài học
   */
  @Post(':id/analysis/mindmap/apply')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async applyDraftMindmap(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId?: string,
  ): Promise<ApiResponse<ILessonMindmap>> {
    const applied = await this.mindmapAnalysisService.applyDraft(id, userId);
    return ApiResponse.success(
      applied,
      'Áp dụng sơ đồ tư duy chính thức cho bài học thành công',
    );
  }

  // ==========================================
  // QUIZ ENDPOINTS
  // ==========================================

  /**
   * Tạo mới hoặc tạo lại bộ 10 câu hỏi trắc nghiệm từ transcript video bài học
   */
  @Post(':id/analysis/quiz')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async generateQuiz(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: GenerateQuizDto,
    @CurrentUser('id') userId?: string,
  ): Promise<ApiResponse<QuizGenerationResponse>> {
    const result = await this.quizGenerationService.generateQuiz(
      id,
      dto,
      userId,
    );
    return ApiResponse.success(result, 'Phân tích và tạo câu hỏi trắc nghiệm thành công');
  }

  /**
   * Lấy bản nháp Quiz hiện tại của bài học
   */
  @Get(':id/analysis/quiz')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getQuizDraft(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ApiResponse<ILessonQuizDraft | null>> {
    const draft = await this.quizGenerationService.getQuizDraft(id);
    return ApiResponse.success(draft, 'Lấy bản nháp câu hỏi trắc nghiệm thành công');
  }

  /**
   * Áp dụng bản nháp Quiz thành danh sách câu hỏi chính thức cho bài học
   */
  @Post(':id/analysis/quiz/apply')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async applyDraftQuiz(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId?: string,
  ): Promise<ApiResponse<ILessonQuiz[]>> {
    const applied = await this.quizGenerationService.applyDraft(id, userId);
    return ApiResponse.success(
      applied,
      'Áp dụng bộ câu hỏi trắc nghiệm chính thức cho bài học thành công',
    );
  }

  // ==========================================
  // SUMMARY ENDPOINTS
  // ==========================================

  /**
   * Tạo mới hoặc tạo lại bản tóm tắt bài học từ transcript video bài học
   */
  @Post(':id/analysis/summary')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async generateSummary(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: GenerateSummaryDto,
    @CurrentUser('id') userId?: string,
  ): Promise<ApiResponse<SummaryGenerationResponse>> {
    const result = await this.summaryGenerationService.generateSummary(
      id,
      dto,
      userId,
    );
    return ApiResponse.success(result, 'Phân tích và tạo bản tóm tắt bài học thành công');
  }

  /**
   * Lấy bản tóm tắt hiện tại của bài học (chính thức & bản nháp nếu có)
   */
  @Get(':id/analysis/summary')
  @Public()
  async getSummary(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ApiResponse<ILessonSummary | null>> {
    const summary = await this.summaryGenerationService.getSummary(id);
    return ApiResponse.success(summary, 'Lấy bản tóm tắt bài học thành công');
  }

  /**
   * Áp dụng bản nháp Summary thành kết quả chính thức cho bài học
   */
  @Post(':id/analysis/summary/apply')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async applyDraftSummary(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId?: string,
  ): Promise<ApiResponse<ILessonSummary>> {
    const applied = await this.summaryGenerationService.applyDraft(id, userId);
    return ApiResponse.success(
      applied,
      'Áp dụng bản tóm tắt chính thức cho bài học thành công',
    );
  }
}
