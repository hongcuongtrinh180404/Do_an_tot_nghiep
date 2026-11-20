import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';
import { CHATBOT_MAX_MESSAGE_LENGTH } from '../chatbot.limits.js';
import { CHATBOT_CONTEXT_MAX_LENGTH } from './chatbot-context.service.js';

export class CreateChatbotMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHATBOT_MAX_MESSAGE_LENGTH)
  message: string;

  @ValidateIf((_object: unknown, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHATBOT_CONTEXT_MAX_LENGTH)
  context?: string;
}
