import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { DoubanService } from './douban.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { FetchUserDataDto, ValidateCookieDto } from './dto/douban.dto';

/**
 * 豆瓣控制器 - 豆瓣数据抓取API
 */
@ApiTags('Douban')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('douban')
export class DoubanController {
  constructor(private readonly doubanService: DoubanService) {}

  /**
   * 验证豆瓣Cookie
   */
  @Post('validate-cookie')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '验证豆瓣Cookie',
    description: '检查豆瓣Cookie是否有效，未被封禁',
  })
  @ApiResponse({
    status: 200,
    description: 'Cookie验证结果',
    schema: {
      properties: {
        valid: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async validateCookie(@Body() dto: ValidateCookieDto) {
    const isValid = await this.doubanService.validateCookie(dto.cookie);
    
    return {
      valid: isValid,
      message: isValid ? 'Cookie is valid' : 'Cookie is invalid or expired',
    };
  }

  /**
   * 获取请求统计
   */
  @Post('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取抓取统计',
    description: '获取当前的请求统计和模式信息',
  })
  @ApiResponse({
    status: 200,
    description: '统计信息',
  })
  getRequestStats() {
    return this.doubanService.getRequestStats();
  }

  /**
   * 重置请求计数
   */
  @Post('reset-counter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '重置请求计数',
    description: '重置请求计数器，退出慢速模式',
  })
  @ApiResponse({
    status: 200,
    description: '计数器已重置',
  })
  resetRequestCount() {
    this.doubanService.resetRequestCount();
    return { message: 'Request counter reset successfully' };
  }
}