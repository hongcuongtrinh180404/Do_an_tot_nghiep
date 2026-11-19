import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CHATBOT_MAX_MESSAGE_LENGTH } from '../chatbot.limits.js';

export class CreateChatbotMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(CHATBOT_MAX_MESSAGE_LENGTH)
  message: string;
}
