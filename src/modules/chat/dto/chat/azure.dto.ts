// create-chat-thread.dto.ts
import { IsString, IsArray, ArrayNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ParticipantDto {
    @IsString()
    id: string;

    @IsString()
    displayName: string;
}

export class CreateChatThreadDto {
    @IsString()
    topic: string;

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ParticipantDto)
    participants: ParticipantDto[];
}
