import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Query,
  Res,
  Header,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiResponse,
  ParseObjectIdPipe,
} from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import {
  ICreateOrderResponse,
  IOrderStatusResponse,
  ICheckoutOrderResponse,
  RoleEnum,
} from 'share-lib';
import { PaymentService, WebhookProcessResult } from './services/payment.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { SepayWebhookDto } from './dto/sepay-webhook.dto.js';
import { ReconciliationQueryDto, ReprocessPaymentDto, ResolvePaymentDto } from './dto/reconciliation.dto.js';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Tạo đơn hàng mua khóa học qua SePay VietQR
   */
  @Post('create-order')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<ApiResponse<ICreateOrderResponse>> {
    const result = await this.paymentService.createOrder(userId, dto.courseId);
    return ApiResponse.success(result, 'Khởi tạo đơn hàng thanh toán thành công');
  }

  /**
   * Kiểm tra trạng thái đơn hàng (Polling từ frontend)
   */
  @Get('order-status/:orderCode')
  @Header('Cache-Control', 'no-store')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getOrderStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @Param('orderCode') orderCode: string,
  ): Promise<ApiResponse<IOrderStatusResponse>> {
    const result = await this.paymentService.getOrderStatus(userId, role, orderCode);
    return ApiResponse.success(result, 'Lấy trạng thái đơn hàng thành công');
  }

  @Get('orders/:orderCode')
  @Header('Cache-Control', 'no-store')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getCheckoutOrder(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @Param('orderCode') orderCode: string,
  ): Promise<ApiResponse<ICheckoutOrderResponse>> {
    return ApiResponse.success(await this.paymentService.getCheckoutOrder(userId, role, orderCode));
  }

  @Get('reconciliation')
  @Header('Cache-Control', 'no-store')
  @Roles(RoleEnum.ADMIN)
  async getReconciliationQueue(@Query() query: ReconciliationQueryDto) {
    return ApiResponse.success(await this.paymentService.getReconciliationQueue(query.page, query.limit));
  }

  @Get('reconciliation/:paymentId')
  @Header('Cache-Control', 'no-store')
  @Roles(RoleEnum.ADMIN)
  async getReconciliationPayment(@Param('paymentId', ParseObjectIdPipe) paymentId: string) {
    return ApiResponse.success(await this.paymentService.findByIdOrFail(paymentId));
  }

  @Post('reconciliation/:paymentId/reprocess')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.ADMIN)
  async reprocessPayment(
    @Param('paymentId', ParseObjectIdPipe) paymentId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: ReprocessPaymentDto,
  ): Promise<ApiResponse<WebhookProcessResult>> {
    return ApiResponse.success(await this.paymentService.reprocessPayment(paymentId, actorId, dto));
  }

  @Post('reconciliation/:paymentId/resolve')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.ADMIN)
  async resolvePayment(
    @Param('paymentId', ParseObjectIdPipe) paymentId: string,
    @CurrentUser('id') actorId: string,
    @Body() dto: ResolvePaymentDto,
  ) {
    return ApiResponse.success(await this.paymentService.resolvePayment(paymentId, actorId, dto));
  }

  /**
   * Endpoint nhận Webhook từ SePay khi có biến động số dư chuyển khoản
   * Endpoint chính thức: POST /api/v1/payments/sepay/webhook
   */
  @Post('sepay/webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleSepayWebhook(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: SepayWebhookDto,
    @Res() response: Response,
  ): Promise<void> {
    await this.paymentService.processSepayWebhook(headers, req.rawBody, payload);
    // SePay requires this exact top-level response, not the application's ApiResponse envelope.
    response.status(HttpStatus.OK).json({ success: true });
  }

  /**
   * Endpoint dự phòng tương thích alias: POST /api/v1/payments/webhook
   */
  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhookAlias(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: SepayWebhookDto,
    @Res() response: Response,
  ): Promise<void> {
    await this.handleSepayWebhook(headers, req, payload, response);
  }
}
