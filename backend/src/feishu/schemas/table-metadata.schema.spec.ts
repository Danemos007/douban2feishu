/**
 * 飞书表格元数据 Schema 单元测试
 * 
 * 测试原则:
 * 1. 验证表格和应用信息能正确解析
 * 2. 验证视图配置的复杂结构
 * 3. 测试权限和协作者信息
 * 4. 确保统计和配置信息的准确性
 */

import {
  FeishuTableInfoSchema,
  FeishuAppInfoSchema,
  FeishuTablesListResponseSchema,
  FeishuAppInfoResponseSchema,
  FeishuViewSchema,
  FeishuViewsListResponseSchema,
  FeishuTableStatsSchema,
  FeishuPermissionSchema,
  FeishuCollaboratorSchema,
  FeishuCollaboratorsResponseSchema,
  TableConfigurationSchema,
  type FeishuTableInfo,
  type FeishuAppInfo,
  type FeishuView,
  type TableConfiguration,
} from './table-metadata.schema';

describe('FeishuTableInfoSchema', () => {
  it('should validate complete table info', () => {
    const validTableInfo = {
      table_id: 'tblsRc9GRRXKqhvW',
      table_name: '豆瓣书籍',
      revision: 123,
      created_time: 1694764800000,
      last_modified_time: 1694851200000,
      created_by: {
        id: 'ou_123456789',
        name: '张三',
      },
      last_modified_by: {
        id: 'ou_987654321',
        name: '李四',
      },
      extra_field: 'should be preserved',
    };

    const result = FeishuTableInfoSchema.safeParse(validTableInfo);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.table_id).toBe('tblsRc9GRRXKqhvW');
      expect(result.data.table_name).toBe('豆瓣书籍');
      expect(result.data.created_by?.name).toBe('张三');
      expect(result.data.extra_field).toBe('should be preserved');
    }
  });

  it('should validate minimal table info', () => {
    const minimalTableInfo = {
      table_id: 'tblsRc9GRRXKqhvW',
      table_name: '豆瓣电影',
    };

    const result = FeishuTableInfoSchema.safeParse(minimalTableInfo);
    expect(result.success).toBe(true);
  });

  it('should reject empty table_id or table_name', () => {
    const invalidInfo1 = { table_id: '', table_name: '测试' };
    const invalidInfo2 = { table_id: 'tbl123', table_name: '' };

    expect(FeishuTableInfoSchema.safeParse(invalidInfo1).success).toBe(false);
    expect(FeishuTableInfoSchema.safeParse(invalidInfo2).success).toBe(false);
  });
});

describe('FeishuAppInfoSchema', () => {
  it('should validate complete app info', () => {
    const validAppInfo = {
      app_token: 'bascnCMII2ORuAUfUn',
      app_name: '豆瓣数据同步',
      folder_token: 'fld123456',
      url: 'https://example.feishu.cn/base/bascnCMII2ORuAUfUn',
      created_time: 1694764800000,
      last_modified_time: 1694851200000,
      created_by: {
        id: 'ou_123456789',
        name: '创建者',
      },
      last_modified_by: {
        id: 'ou_987654321', 
        name: '修改者',
      },
    };

    const result = FeishuAppInfoSchema.safeParse(validAppInfo);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.app_token).toBe('bascnCMII2ORuAUfUn');
      expect(result.data.url).toContain('feishu.cn');
    }
  });

  it('should validate minimal app info', () => {
    const minimalInfo = {
      app_token: 'bascnCMII2ORuAUfUn',
      app_name: '测试应用',
    };

    const result = FeishuAppInfoSchema.safeParse(minimalInfo);
    expect(result.success).toBe(true);
  });

  it('should reject invalid URL format', () => {
    const invalidInfo = {
      app_token: 'bascnCMII2ORuAUfUn',
      app_name: '测试应用',
      url: 'not-a-valid-url',
    };

    const result = FeishuAppInfoSchema.safeParse(invalidInfo);
    expect(result.success).toBe(false);
  });
});

describe('FeishuTablesListResponseSchema', () => {
  it('should validate tables list response', () => {
    const validResponse = {
      code: 0,
      msg: 'success',
      data: {
        tables: [
          {
            table_id: 'tbl1',
            table_name: '书籍表',
          },
          {
            table_id: 'tbl2',
            table_name: '电影表',
            revision: 5,
          },
        ],
        total: 2,
        has_more: false,
        page_token: 'next_page',
      },
    };

    const result = FeishuTablesListResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.tables).toHaveLength(2);
      expect(result.data.data.total).toBe(2);
    }
  });

  it('should validate empty tables list', () => {
    const emptyResponse = {
      code: 0,
      msg: 'success',
      data: {
        tables: [],
        total: 0,
        has_more: false,
      },
    };

    const result = FeishuTablesListResponseSchema.safeParse(emptyResponse);
    expect(result.success).toBe(true);
  });

  it('should reject non-zero error code', () => {
    const errorResponse = {
      code: 400,
      msg: 'error',
      data: { tables: [], total: 0, has_more: false },
    };

    const result = FeishuTablesListResponseSchema.safeParse(errorResponse);
    expect(result.success).toBe(false);
  });
});

describe('FeishuViewSchema', () => {
  it('should validate simple view', () => {
    const simpleView = {
      view_id: 'vew123456',
      view_name: '默认视图',
      view_type: 'grid',
    };

    const result = FeishuViewSchema.safeParse(simpleView);
    expect(result.success).toBe(true);
  });

  it('should validate complex view with filters and sorting', () => {
    const complexView = {
      view_id: 'vew789012',
      view_name: '已读书籍',
      view_type: 'grid',
      property: {
        filter_info: {
          conjunction: 'and' as const,
          conditions: [
            {
              field_id: 'fld123',
              operator: 'is',
              value: '已读',
            },
            {
              field_id: 'fld456',
              operator: 'isEmpty',
            },
          ],
        },
        sort_info: [
          {
            field_id: 'fld789',
            desc: true,
          },
          {
            field_id: 'fld012',
            desc: false,
          },
        ],
        group_info: [
          {
            field_id: 'fld345',
            desc: false,
          },
        ],
      },
    };

    const result = FeishuViewSchema.safeParse(complexView);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.property?.filter_info?.conditions).toHaveLength(2);
      expect(result.data.property?.sort_info).toHaveLength(2);
      expect(result.data.property?.group_info).toHaveLength(1);
    }
  });

  it('should reject empty view_id or view_name', () => {
    const invalidView = { view_id: '', view_name: '测试视图' };
    expect(FeishuViewSchema.safeParse(invalidView).success).toBe(false);
  });
});

describe('FeishuViewsListResponseSchema', () => {
  it('should validate views list response', () => {
    const validResponse = {
      code: 0,
      msg: 'success',
      data: {
        views: [
          {
            view_id: 'vew1',
            view_name: '表格视图',
            view_type: 'grid',
          },
          {
            view_id: 'vew2',
            view_name: '看板视图',
            view_type: 'kanban',
          },
        ],
        total: 2,
        has_more: false,
      },
    };

    const result = FeishuViewsListResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.views).toHaveLength(2);
      expect(result.data.data.views[1].view_type).toBe('kanban');
    }
  });
});

describe('FeishuTableStatsSchema', () => {
  it('should validate complete table statistics', () => {
    const validStats = {
      table_id: 'tblsRc9GRRXKqhvW',
      record_count: 1250,
      field_count: 16,
      view_count: 3,
      last_activity_time: 1694851200000,
      storage_usage: 2048576, // 2MB in bytes
      extra_metric: 'additional data',
    };

    const result = FeishuTableStatsSchema.safeParse(validStats);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.record_count).toBe(1250);
      expect(result.data.storage_usage).toBe(2048576);
      expect(result.data.extra_metric).toBe('additional data');
    }
  });

  it('should validate minimal stats', () => {
    const minimalStats = {
      table_id: 'tbl123',
      record_count: 0,
      field_count: 0,
      view_count: 0,
    };

    const result = FeishuTableStatsSchema.safeParse(minimalStats);
    expect(result.success).toBe(true);
  });

  it('should reject negative counts', () => {
    const invalidStats = {
      table_id: 'tbl123',
      record_count: -1,
      field_count: 5,
      view_count: 2,
    };

    const result = FeishuTableStatsSchema.safeParse(invalidStats);
    expect(result.success).toBe(false);
  });
});

describe('FeishuPermissionSchema', () => {
  it('should validate complete permission set', () => {
    const validPermission = {
      role: 'editor' as const,
      can_read: true,
      can_write: true,
      can_delete: false,
      can_share: true,
      can_manage: false,
    };

    const result = FeishuPermissionSchema.safeParse(validPermission);
    expect(result.success).toBe(true);
  });

  it('should validate minimal permission set', () => {
    const minimalPermission = {
      can_read: true,
      can_write: false,
      can_delete: false,
      can_share: false,
      can_manage: false,
    };

    const result = FeishuPermissionSchema.safeParse(minimalPermission);
    expect(result.success).toBe(true);
  });

  it('should validate all role types', () => {
    const roles = ['owner', 'editor', 'reader', 'commenter'] as const;
    
    roles.forEach(role => {
      const permission = {
        role,
        can_read: true,
        can_write: role === 'owner' || role === 'editor',
        can_delete: role === 'owner',
        can_share: role === 'owner' || role === 'editor',
        can_manage: role === 'owner',
      };

      const result = FeishuPermissionSchema.safeParse(permission);
      expect(result.success).toBe(true);
    });
  });
});

describe('FeishuCollaboratorSchema', () => {
  it('should validate user collaborator', () => {
    const userCollaborator = {
      member_type: 'user' as const,
      member_id: 'ou_123456789',
      member_name: '张三',
      avatar_url: 'https://avatar.feishu.cn/avatar/123',
      permission: {
        role: 'editor' as const,
        can_read: true,
        can_write: true,
        can_delete: false,
        can_share: true,
        can_manage: false,
      },
    };

    const result = FeishuCollaboratorSchema.safeParse(userCollaborator);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.member_type).toBe('user');
      expect(result.data.permission?.role).toBe('editor');
    }
  });

  it('should validate app collaborator', () => {
    const appCollaborator = {
      member_type: 'app' as const,
      member_id: 'cli_123456789',
      member_name: '豆瓣同步助手',
    };

    const result = FeishuCollaboratorSchema.safeParse(appCollaborator);
    expect(result.success).toBe(true);
  });

  it('should validate minimal collaborator', () => {
    const minimalCollaborator = {
      member_id: 'ou_minimal_user',
    };

    const result = FeishuCollaboratorSchema.safeParse(minimalCollaborator);
    expect(result.success).toBe(true);
  });
});

describe('FeishuCollaboratorsResponseSchema', () => {
  it('should validate collaborators response', () => {
    const validResponse = {
      code: 0,
      msg: 'success',
      data: {
        collaborators: [
          {
            member_type: 'user',
            member_id: 'ou_123',
            member_name: '用户A',
          },
          {
            member_type: 'app',
            member_id: 'cli_456',
            member_name: '应用B',
          },
        ],
        total: 2,
      },
    };

    const result = FeishuCollaboratorsResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data.collaborators).toHaveLength(2);
      expect(result.data.data.total).toBe(2);
    }
  });
});

describe('TableConfigurationSchema', () => {
  it('should validate complete table configuration', () => {
    const validConfig = {
      appToken: 'bascnCMII2ORuAUfUn',
      tableId: 'tblsRc9GRRXKqhvW',
      tableName: '豆瓣书籍表',
      primaryFieldId: 'fld123456',
      fieldMappings: {
        '书名': 'fld001',
        'Subject ID': 'fld002',
        '豆瓣评分': 'fld003',
      },
      lastSyncTime: '2025-09-08T12:00:00Z',
      syncStatus: 'active' as const,
      recordCount: 1250,
      healthScore: 95,
      customProperty: 'additional data',
    };

    const result = TableConfigurationSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.syncStatus).toBe('active');
      expect(result.data.healthScore).toBe(95);
      expect(result.data.fieldMappings?.['书名']).toBe('fld001');
      expect(result.data.customProperty).toBe('additional data');
    }
  });

  it('should validate minimal configuration', () => {
    const minimalConfig = {
      appToken: 'bascnCMII2ORuAUfUn',
      tableId: 'tblsRc9GRRXKqhvW',
      tableName: '测试表',
    };

    const result = TableConfigurationSchema.safeParse(minimalConfig);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.syncStatus).toBe('active'); // default value
    }
  });

  it('should reject invalid health score', () => {
    const invalidConfig = {
      appToken: 'bascnCMII2ORuAUfUn',
      tableId: 'tblsRc9GRRXKqhvW',
      tableName: '测试表',
      healthScore: 150, // exceeds max 100
    };

    const result = TableConfigurationSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should validate all sync status options', () => {
    const statuses = ['active', 'paused', 'error'] as const;
    
    statuses.forEach(status => {
      const config = {
        appToken: 'test',
        tableId: 'test',
        tableName: 'test',
        syncStatus: status,
      };

      const result = TableConfigurationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });
});

describe('Type Safety Integration', () => {
  it('should ensure TypeScript types match Schema inference', () => {
    const tableInfo: FeishuTableInfo = {
      table_id: 'tbl123',
      table_name: '测试表',
    };

    const appInfo: FeishuAppInfo = {
      app_token: 'bas123',
      app_name: '测试应用',
    };

    const view: FeishuView = {
      view_id: 'vew123',
      view_name: '测试视图',
    };

    // 类型推导包含默认值，但 TS 需要明确赋值
    const config = {
      appToken: 'bas123',
      tableId: 'tbl123',
      tableName: '测试表',
    };

    const parsedConfig = TableConfigurationSchema.parse(config);
    expect(parsedConfig.syncStatus).toBe('active'); // default value

    // 验证类型安全
    const typedConfig: TableConfiguration = parsedConfig;

    // 编译时类型检查 - 如果类型不匹配，TypeScript 会报错
    expect(tableInfo.table_id).toBe('tbl123');
    expect(appInfo.app_token).toBe('bas123');
    expect(view.view_id).toBe('vew123');
    expect(typedConfig.syncStatus).toBe('active'); // default value
  });

  it('should support complex nested structures', () => {
    const complexView: FeishuView = {
      view_id: 'vew123',
      view_name: '复杂视图',
      property: {
        filter_info: {
          conjunction: 'and',
          conditions: [
            {
              field_id: 'fld123',
              operator: 'is',
              value: '已读',
            },
          ],
        },
        sort_info: [
          {
            field_id: 'fld456',
            desc: true,
          },
        ],
      },
    };

    // 编译时验证复杂嵌套结构的类型安全
    expect(complexView.property?.filter_info?.conjunction).toBe('and');
    expect(complexView.property?.sort_info?.[0].desc).toBe(true);
  });
});