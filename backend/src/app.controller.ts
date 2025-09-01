import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';

/**
 * 应用主控制器 - 系统级接口
 */
@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * 根路径 - 欢迎信息
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: '服务欢迎页',
    description: '获取D2F服务的基本信息',
  })
  @ApiResponse({
    status: 200,
    description: '服务信息',
  })
  getWelcome() {
    return this.appService.getWelcome();
  }

  /**
   * 健康检查端点
   */
  @Public()
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '健康检查',
    description: '检查服务和依赖项的健康状态',
  })
  @ApiResponse({
    status: 200,
    description: '健康状态正常',
    schema: {
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number', description: '运行时间(秒)' },
        version: { type: 'string', example: '1.0.0' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'healthy' },
            redis: { type: 'string', example: 'healthy' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: '服务不可用',
  })
  async getHealth() {
    return this.appService.getHealthCheck();
  }

  /**
   * 版本信息
   */
  @Public()
  @Get('version')
  @ApiOperation({
    summary: '版本信息',
    description: '获取应用版本和构建信息',
  })
  @ApiResponse({
    status: 200,
    description: '版本信息',
  })
  getVersion() {
    return this.appService.getVersion();
  }
}
