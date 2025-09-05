import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsObject, IsNumber, Min } from 'class-validator';

/**
 * 触发同步DTO
 */
export class TriggerSyncDto {
  @ApiProperty({
    description: '触发类型',
    enum: ['MANUAL', 'AUTO'],
    default: 'MANUAL',
  })
  @IsEnum(['MANUAL', 'AUTO'], { message: '触发类型必须是MANUAL或AUTO' })
  @IsOptional()
  triggerType?: 'MANUAL' | 'AUTO' = 'MANUAL';

  @ApiProperty({
    description: '延迟执行时间(毫秒)',
    example: 0,
    required: false,
  })
  @IsNumber({}, { message: '延迟时间必须是数字' })
  @Min(0, { message: '延迟时间不能为负数' })
  @IsOptional()
  delayMs?: number;

  @ApiProperty({
    description: '同步选项',
    example: {
      categories: ['books', 'movies', 'music'],
      limit: 100,
      forceUpdate: false,
    },
  })
  @IsObject({ message: '选项必须是对象' })
  @IsOptional()
  options?: {
    categories?: string[];
    limit?: number;
    forceUpdate?: boolean;
    tableMapping?: Record<string, string>;
  };
}
