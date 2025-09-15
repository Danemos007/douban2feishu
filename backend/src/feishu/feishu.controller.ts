import {
  Controller,
  Post,
  Get,
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

import { FeishuService } from './feishu.service';
import { FeishuAuthService } from './services/feishu-auth.service';
import { FeishuTableService } from './services/feishu-table.service';
import { FieldMappingService } from './services/field-mapping.service';
import { SyncEngineService } from './services/sync-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetTableFieldsDto } from './dto/feishu.dto';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { FeishuField } from './interfaces/feishu.interface';
import { TokenStats } from './schemas';
import {
  SyncState,
  MappingStats,
  TableStatsResult,
} from './interfaces/api-responses.interface';

/**
 * 导入字段映射配置的数据结构
 */
interface ImportMappingData {
  appToken: string;
  tableId: string;
  mappings: Record<string, string>;
  dataType: 'books' | 'movies' | 'tv' | 'documentary';
}

/**
 * 飞书控制器 - 飞书API操作
 */
@ApiTags('Feishu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feishu')
export class FeishuController {
  constructor(
    private readonly feishuService: FeishuService,
    private readonly authService: FeishuAuthService,
    private readonly tableService: FeishuTableService,
    private readonly fieldMappingService: FieldMappingService,
    private readonly syncEngineService: SyncEngineService,
  ) {}

  /**
   * 获取表格字段信息
   */
  @Post('table/fields')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取表格字段',
    description: '获取飞书多维表格的字段信息和Field ID映射',
  })
  @ApiResponse({
    status: 200,
    description: '字段信息获取成功',
  })
  @ApiResponse({
    status: 401,
    description: '飞书认证失败',
  })
  async getTableFields(@Body() dto: GetTableFieldsDto) {
    const fields = await this.feishuService.getTableFields(
      dto.appId,
      dto.appSecret,
      dto.appToken,
      dto.tableId,
    );

    return {
      fields,
      fieldMappings: fields.reduce(
        (acc: Record<string, string>, field: FeishuField) => {
          acc[field.field_name] = field.field_id;
          return acc;
        },
        {},
      ),
    };
  }

  /**
   * 智能字段映射发现
   */
  @Post('field-mapping/discover')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '智能字段映射发现',
    description: '根据豆瓣数据结构自动发现并推荐飞书表格字段映射',
  })
  @ApiResponse({ status: 200, description: '字段映射发现完成' })
  async discoverFieldMappings(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      appId: string;
      appSecret: string;
      appToken: string;
      tableId: string;
      dataType: 'books' | 'movies' | 'tv';
    },
  ) {
    return this.fieldMappingService.autoConfigureFieldMappings(
      user.id,
      body.appId,
      body.appSecret,
      body.appToken,
      body.tableId,
      body.dataType,
    );
  }

  /**
   * 设置字段映射
   */
  @Post('field-mapping/set')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '设置字段映射',
    description: '手动设置豆瓣字段到飞书Field ID的映射关系',
  })
  @ApiResponse({ status: 200, description: '字段映射设置成功' })
  async setFieldMappings(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      appToken: string;
      tableId: string;
      mappings: Record<string, string>;
      dataType: 'books' | 'movies' | 'tv';
    },
  ) {
    await this.fieldMappingService.setFieldMappings(
      user.id,
      body.appToken,
      body.tableId,
      body.mappings,
      body.dataType,
    );

    return { message: 'Field mappings saved successfully' };
  }

  /**
   * 获取字段映射
   */
  @Get('field-mapping/:appToken/:tableId')
  @ApiOperation({
    summary: '获取字段映射',
    description: '获取指定表格的字段映射配置',
  })
  @ApiParam({ name: 'appToken', description: '飞书应用Token' })
  @ApiParam({ name: 'tableId', description: '表格ID' })
  async getFieldMappings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appToken') appToken: string,
    @Param('tableId') tableId: string,
  ) {
    const mappings = await this.fieldMappingService.getFieldMappings(
      user.id,
      appToken,
      tableId,
    );

    return { mappings };
  }

  /**
   * 执行增量同步
   */
  @Post('sync/incremental')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '执行增量同步',
    description: '基于Subject ID的增量数据同步，只同步变更的记录',
  })
  @ApiResponse({ status: 200, description: '增量同步完成' })
  async performIncrementalSync(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      appId: string;
      appSecret: string;
      appToken: string;
      tableId: string;
      dataType: 'books' | 'movies' | 'tv';
      subjectIdField: string;
      doubanData: unknown[];
      fullSync?: boolean;
      deleteOrphans?: boolean;
    },
  ) {
    return this.syncEngineService.performIncrementalSync(
      user.id,
      {
        appId: body.appId,
        appSecret: body.appSecret,
        appToken: body.appToken,
        tableId: body.tableId,
        dataType: body.dataType,
        subjectIdField: body.subjectIdField,
      },
      body.doubanData,
      {
        fullSync: body.fullSync,
        conflictStrategy: 'douban_wins',
      },
    );
  }

  /**
   * 获取同步状态
   */
  @Get('sync/status/:tableId')
  @ApiOperation({
    summary: '获取同步状态',
    description: '获取指定表格的同步状态和进度信息',
  })
  @ApiParam({ name: 'tableId', description: '表格ID' })
  async getSyncStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tableId') tableId: string,
  ): Promise<{ status: SyncState | null }> {
    const status = await this.syncEngineService.getSyncState(user.id, tableId);
    return { status };
  }

  /**
   * 验证飞书凭证
   */
  @Post('auth/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '验证飞书凭证',
    description: '验证飞书App ID和Secret的有效性',
  })
  @ApiResponse({ status: 200, description: '凭证验证结果' })
  async validateCredentials(
    @Body() body: { appId: string; appSecret: string },
  ) {
    const isValid = await this.authService.validateCredentials(
      body.appId,
      body.appSecret,
    );

    return { valid: isValid };
  }

  /**
   * 获取Token统计信息
   */
  @Get('auth/token-stats')
  @ApiOperation({
    summary: '获取Token统计',
    description: '获取飞书Token缓存和使用统计信息',
  })
  async getTokenStats(): Promise<{ stats: TokenStats | null }> {
    const stats = await this.authService.getTokenStats();
    return { stats };
  }

  /**
   * 清除指定应用的Token缓存
   */
  @Post('auth/clear-token/:appId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '清理指定Token缓存',
    description: '清理指定应用的飞书访问Token缓存',
  })
  @ApiParam({ name: 'appId', description: '飞书应用ID' })
  async clearTokenCache(@Param('appId') appId: string) {
    await this.authService.clearTokenCache(appId);
    return { message: `Token cache cleared for app: ${appId}` };
  }

  /**
   * 获取字段映射统计
   */
  @Get('field-mapping/stats')
  @ApiOperation({
    summary: '获取字段映射统计',
    description: '获取用户的字段映射配置统计信息',
  })
  async getMappingStats(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ stats: MappingStats | null }> {
    const stats = await this.fieldMappingService.getMappingStats(user.id);
    return { stats };
  }

  /**
   * 导出字段映射配置
   */
  @Get('field-mapping/export')
  @ApiOperation({
    summary: '导出字段映射配置',
    description: '导出用户的所有字段映射配置，用于备份或迁移',
  })
  async exportMappings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MappingStats | null> {
    return this.fieldMappingService.getMappingStats(user.id);
  }

  /**
   * 导入字段映射配置
   */
  @Post('field-mapping/import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '导入字段映射配置',
    description: '从备份文件导入字段映射配置',
  })
  @ApiResponse({ status: 200, description: '配置导入成功' })
  async importMappings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() importData: ImportMappingData,
  ) {
    await this.fieldMappingService.setFieldMappings(
      user.id,
      importData.appToken,
      importData.tableId,
      importData.mappings,
      importData.dataType,
    );
    return { message: 'Field mappings imported successfully' };
  }

  // =============== V2 API: 新的精确匹配 + 自动创建策略 ===============

  /**
   * 一键式字段映射配置（V2）
   */
  @Post('field-mapping-v2/auto-configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '一键式字段映射配置（V2）',
    description: '自动配置字段映射：精确匹配现有字段 + 自动创建缺失字段',
  })
  @ApiResponse({ status: 200, description: '字段映射自动配置完成' })
  async autoConfigureFieldMappings(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      appId: string;
      appSecret: string;
      appToken: string;
      tableId: string;
      dataType: 'books' | 'movies' | 'tv' | 'documentary';
    },
  ) {
    return this.fieldMappingService.autoConfigureFieldMappings(
      user.id,
      body.appId,
      body.appSecret,
      body.appToken,
      body.tableId,
      body.dataType,
    );
  }

  /**
   * 预览字段映射配置（V2）
   */
  @Post('field-mapping-v2/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '预览字段映射配置（V2）',
    description: '预览将要匹配和创建的字段，不执行实际操作',
  })
  @ApiResponse({ status: 200, description: '字段映射预览完成' })
  async previewFieldMappings(
    @Body()
    body: {
      appId: string;
      appSecret: string;
      appToken: string;
      tableId: string;
      dataType: 'books' | 'movies' | 'tv' | 'documentary';
    },
  ) {
    return this.fieldMappingService.previewFieldMappings(
      body.appId,
      body.appSecret,
      body.appToken,
      body.tableId,
      body.dataType,
    );
  }

  /**
   * 获取字段映射配置（V2）
   */
  @Get('field-mapping-v2/:appToken/:tableId')
  @ApiOperation({
    summary: '获取字段映射配置（V2）',
    description: '获取指定表格的字段映射配置（新版本）',
  })
  @ApiParam({ name: 'appToken', description: '飞书应用Token' })
  @ApiParam({ name: 'tableId', description: '表格ID' })
  async getFieldMappingsV2(
    @CurrentUser() user: AuthenticatedUser,
    @Param('appToken') appToken: string,
    @Param('tableId') tableId: string,
  ) {
    const mappings = await this.fieldMappingService.getFieldMappings(
      user.id,
      appToken,
      tableId,
    );

    return { mappings };
  }

  /**
   * 获取字段映射统计（V2）
   */
  @Get('field-mapping-v2/stats')
  @ApiOperation({
    summary: '获取字段映射统计（V2）',
    description: '获取用户的字段映射配置统计信息（新版本）',
  })
  async getMappingStatsV2(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ stats: MappingStats | null }> {
    const stats = await this.fieldMappingService.getMappingStats(user.id);
    return { stats };
  }

  /**
   * 获取表格统计信息
   */
  @Get('table/stats/:appToken/:tableId')
  @ApiOperation({
    summary: '获取表格统计',
    description: '获取飞书表格的缓存和操作统计信息',
  })
  @ApiParam({ name: 'appToken', description: '应用Token' })
  @ApiParam({ name: 'tableId', description: '表格ID' })
  async getTableStats(
    @Param('appToken') appToken: string,
    @Param('tableId') tableId: string,
  ): Promise<{ stats: TableStatsResult | null }> {
    const stats = await this.tableService.getTableStats(appToken, tableId);
    return { stats };
  }
}
