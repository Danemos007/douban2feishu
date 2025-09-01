import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';

import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  UpdateDoubanConfigDto,
  UpdateFeishuConfigDto,
  UpdateSyncConfigDto,
} from './dto/config.dto';

/**
 * 配置控制器 - 用户配置管理API
 */
@ApiTags('Configuration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 获取用户配置
   */
  @Get()
  @ApiOperation({
    summary: '获取用户配置',
    description: '获取当前用户的所有配置信息',
  })
  @ApiResponse({
    status: 200,
    description: '配置信息获取成功',
  })
  async getUserConfig(@CurrentUser('id') userId: string) {
    return this.configService.getUserConfig(userId);
  }

  /**
   * 更新豆瓣配置
   */
  @Put('douban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新豆瓣配置',
    description: '更新豆瓣Cookie配置，加密存储',
  })
  @ApiResponse({
    status: 200,
    description: '豆瓣配置更新成功',
  })
  async updateDoubanConfig(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDoubanConfigDto,
  ) {
    return this.configService.updateDoubanConfig(userId, dto);
  }

  /**
   * 更新飞书配置
   */
  @Put('feishu')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新飞书配置',
    description: '更新飞书应用ID和密钥，加密存储',
  })
  @ApiResponse({
    status: 200,
    description: '飞书配置更新成功',
  })
  async updateFeishuConfig(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateFeishuConfigDto,
  ) {
    return this.configService.updateFeishuConfig(userId, dto);
  }

  /**
   * 更新同步配置
   */
  @Put('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '更新同步配置',
    description: '更新同步偏好设置和表格映射',
  })
  @ApiResponse({
    status: 200,
    description: '同步配置更新成功',
  })
  async updateSyncConfig(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSyncConfigDto,
  ) {
    return this.configService.updateSyncConfig(userId, dto);
  }

  /**
   * 删除指定配置
   */
  @Delete(':type')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除配置',
    description: '删除指定类型的配置信息',
  })
  @ApiParam({
    name: 'type',
    description: '配置类型',
    enum: ['douban', 'feishu', 'sync', 'all'],
  })
  @ApiResponse({
    status: 204,
    description: '配置删除成功',
  })
  async deleteConfig(
    @CurrentUser('id') userId: string,
    @Param('type') type: 'douban' | 'feishu' | 'sync' | 'all',
  ) {
    return this.configService.deleteUserConfig(userId, type);
  }

  /**
   * 验证配置完整性
   */
  @Get('validate')
  @ApiOperation({
    summary: '验证配置',
    description: '验证用户配置的完整性和有效性',
  })
  @ApiResponse({
    status: 200,
    description: '配置验证结果',
  })
  async validateConfig(@CurrentUser('id') userId: string) {
    return this.configService.validateConfig(userId);
  }
}