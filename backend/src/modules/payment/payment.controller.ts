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
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiResponse,
} from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import {
  ICreateOrderResponse,
  IOrderStatusResponse,
  RoleEnum,
} from 'share-lib';
import { PaymentService, WebhookProcessResult } from './services/payment.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { SepayWebhookDto } from './dto/sepay-webhook.dto.js';

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
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getOrderStatus(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @Param('orderCode') orderCode: string,
  ): Promise<ApiResponse<IOrderStatusResponse>> {
    const result = await this.paymentService.getOrderStatus(userId, role, orderCode);
    return ApiResponse.success(result, 'Lấy trạng thái đơn hàng thành công');
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
  ): Promise<WebhookProcessResult> {
    const rawBody = req.rawBody ?? (req.body ? Buffer.from(JSON.stringify(req.body), 'utf8') : undefined);
    return await this.paymentService.processSepayWebhook(headers, rawBody, payload);
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
  ): Promise<WebhookProcessResult> {
    const rawBody = req.rawBody ?? (req.body ? Buffer.from(JSON.stringify(req.body), 'utf8') : undefined);
    return await this.paymentService.processSepayWebhook(headers, rawBody, payload);
  }
}

