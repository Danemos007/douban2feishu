import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TriggerSyncDto } from './dto/sync.dto';

/**
 * 同步控制器 - 同步操作API端点
 */
@ApiTags('Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * 触发同步任务
   */
  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '触发同步任务',
    description: '创建新的豆瓣到飞书同步任务',
  })
  @ApiResponse({
    status: 202,
    description: '同步任务已创建',
    schema: {
      properties: {
        syncId: { type: 'string', format: 'uuid' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 409, description: '已有同步任务在进行中' })
  async triggerSync(
    @CurrentUser('id') userId: string,
    @Body() triggerSyncDto: TriggerSyncDto,
  ) {
    const syncId = await this.syncService.triggerSync(userId, triggerSyncDto);
    
    return {
      syncId,
      message: 'Sync task created successfully',
      status: 'QUEUED',
    };
  }

  /**
   * 获取同步状态
   */
  @Get(':syncId/status')
  @ApiOperation({
    summary: '获取同步状态',
    description: '获取指定同步任务的详细状态',
  })
  @ApiParam({
    name: 'syncId',
    description: '同步任务ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: '同步状态获取成功',
  })
  @ApiResponse({ status: 404, description: '同步任务未找到' })
  async getSyncStatus(@Param('syncId') syncId: string) {
    return this.syncService.getSyncStatus(syncId);
  }

  /**
   * 获取同步历史
   */
  @Get('history')
  @ApiOperation({
    summary: '获取同步历史',
    description: '获取当前用户的同步历史记录',
  })
  @ApiQuery({
    name: 'limit',
    description: '返回记录数量',
    type: 'number',
    required: false,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '同步历史获取成功',
  })
  async getSyncHistory(
    @CurrentUser('id') userId: string,
    @Query('limit') limit: string = '10',
  ) {
    return this.syncService.getSyncHistory(userId, parseInt(limit));
  }

  /**
   * 取消同步任务
   */
  @Delete(':syncId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '取消同步任务',
    description: '取消正在进行的同步任务',
  })
  @ApiParam({
    name: 'syncId',
    description: '同步任务ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 204,
    description: '同步任务已取消',
  })
  @ApiResponse({ status: 404, description: '同步任务未找到或无法取消' })
  async cancelSync(
    @Param('syncId') syncId: string,
    @CurrentUser('id') userId: string,
  ) {
    const cancelled = await this.syncService.cancelSync(syncId, userId);
    
    if (!cancelled) {
      return { message: 'Sync not found or cannot be cancelled' };
    }
    
    return { message: 'Sync cancelled successfully' };
  }

  /**
   * 获取队列统计信息
   */
  @Get('queue/stats')
  @ApiOperation({
    summary: '获取队列统计',
    description: '获取同步队列的统计信息',
  })
  @ApiResponse({
    status: 200,
    description: '队列统计获取成功',
  })
  async getQueueStats() {
    return this.syncService.getQueueStats();
  }
}