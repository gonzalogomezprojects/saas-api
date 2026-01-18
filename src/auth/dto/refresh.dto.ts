import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
