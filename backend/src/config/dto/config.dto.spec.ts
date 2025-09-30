/**
 * 配置DTO单元测试
 *
 * 测试原则:
 * 1. 验证所有DTO的正向和反向验证逻辑
 * 2. 测试class-validator装饰器的验证行为
 * 3. 确保85%以上的代码覆盖率
 * 4. 验证类型推导和DTO导出的正确性
 * 5. 特别关注可选字段和复杂嵌套对象的验证
 *
 * 目标覆盖率: 85%+
 */

import { validate } from 'class-validator';
import {
  UpdateDoubanConfigDto,
  UpdateFeishuConfigDto,
  UpdateSyncConfigDto,
} from './config.dto';

describe('UpdateDoubanConfigDto', () => {
  describe('成功路径 (Happy Path)', () => {
    it('应该通过有效的豆瓣Cookie验证', async () => {
      const dto = new UpdateDoubanConfigDto();
      dto.cookie = 'bid=abc123; __utma=123456789';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受长Cookie字符串（100+字符）', async () => {
      const dto = new UpdateDoubanConfigDto();
      dto.cookie = 'a'.repeat(150); // 150字符的长Cookie

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('cookie 字段验证', () => {
    it('应该拒绝空的Cookie', async () => {
      const dto = new UpdateDoubanConfigDto();
      dto.cookie = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cookieError = errors.find((err) => err.property === 'cookie');
      expect(cookieError).toBeDefined();
      expect(cookieError?.constraints?.minLength).toContain(
        'Cookie长度至少为10个字符',
      );
    });

    it('应该拒绝少于10个字符的Cookie', async () => {
      const dto = new UpdateDoubanConfigDto();
      dto.cookie = 'short123'; // 只有8个字符

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cookieError = errors.find((err) => err.property === 'cookie');
      expect(cookieError).toBeDefined();
      expect(cookieError?.constraints?.minLength).toContain(
        'Cookie长度至少为10个字符',
      );
    });

    it('应该拒绝缺少cookie字段', async () => {
      const dto = new UpdateDoubanConfigDto();
      // 故意不设置 cookie

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cookieError = errors.find((err) => err.property === 'cookie');
      expect(cookieError).toBeDefined();
    });

    it('应该拒绝非字符串的cookie值', async () => {
      const dto = new UpdateDoubanConfigDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).cookie = 12345678901; // 故意使用错误类型以测试验证器

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const cookieError = errors.find((err) => err.property === 'cookie');
      expect(cookieError).toBeDefined();
      expect(cookieError?.constraints?.isString).toContain(
        'Cookie必须是字符串',
      );
    });
  });
});

describe('UpdateFeishuConfigDto', () => {
  describe('成功路径 (Happy Path)', () => {
    it('应该通过有效的飞书配置验证', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appId = 'cli_a1b2c3d4e5f6g7h8';
      dto.appSecret = 'abcdef123456789';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受标准格式的appId和appSecret', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appId = 'cli_your_app_id_here';
      dto.appSecret = 'your_app_secret_here';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('appId 字段验证', () => {
    it('应该拒绝空的appId', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appId = '';
      dto.appSecret = 'valid_secret123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const appIdError = errors.find((err) => err.property === 'appId');
      expect(appIdError).toBeDefined();
      expect(appIdError?.constraints?.minLength).toContain(
        '应用ID长度至少为3个字符',
      );
    });

    it('应该拒绝少于3个字符的appId', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appId = 'ab'; // 只有2个字符
      dto.appSecret = 'valid_secret123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const appIdError = errors.find((err) => err.property === 'appId');
      expect(appIdError).toBeDefined();
      expect(appIdError?.constraints?.minLength).toContain(
        '应用ID长度至少为3个字符',
      );
    });

    it('应该拒绝缺少appId字段', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appSecret = 'valid_secret123';
      // 故意不设置 appId

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const appIdError = errors.find((err) => err.property === 'appId');
      expect(appIdError).toBeDefined();
    });

    it('应该拒绝非字符串的appId值', async () => {
      const dto = new UpdateFeishuConfigDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).appId = 12345; // 故意使用错误类型以测试验证器
      dto.appSecret = 'valid_secret123';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const appIdError = errors.find((err) => err.property === 'appId');
      expect(appIdError).toBeDefined();
      expect(appIdError?.constraints?.isString).toContain('应用ID必须是字符串');
    });
  });

  describe('appSecret 字段验证', () => {
    it('应该拒绝空的appSecret', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appId = 'cli_valid_app_id';
      dto.appSecret = '';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const appSecretError = errors.find((err) => err.property === 'appSecret');
      expect(appSecretError).toBeDefined();
      expect(appSecretError?.constraints?.minLength).toContain(
        '应用密钥长度至少为10个字符',
      );
    });

    it('应该拒绝少于10个字符的appSecret', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appId = 'cli_valid_app_id';
      dto.appSecret = 'short123'; // 只有8个字符

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const appSecretError = errors.find((err) => err.property === 'appSecret');
      expect(appSecretError).toBeDefined();
      expect(appSecretError?.constraints?.minLength).toContain(
        '应用密钥长度至少为10个字符',
      );
    });

    it('应该拒绝缺少appSecret字段', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appId = 'cli_valid_app_id';
      // 故意不设置 appSecret

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const appSecretError = errors.find((err) => err.property === 'appSecret');
      expect(appSecretError).toBeDefined();
    });

    it('应该拒绝非字符串的appSecret值', async () => {
      const dto = new UpdateFeishuConfigDto();
      dto.appId = 'cli_valid_app_id';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).appSecret = 12345678901; // 故意使用错误类型以测试验证器

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const appSecretError = errors.find((err) => err.property === 'appSecret');
      expect(appSecretError).toBeDefined();
      expect(appSecretError?.constraints?.isString).toContain(
        '应用密钥必须是字符串',
      );
    });
  });
});

describe('UpdateSyncConfigDto', () => {
  describe('成功路径 (Happy Path)', () => {
    it('应该通过有效的同步配置验证（仅必填字段）', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该通过包含可选字段syncSchedule的完整配置', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'FOUR_TABLES';
      dto.autoSyncEnabled = true;
      dto.syncSchedule = {
        frequency: 'daily',
        time: '02:00',
        timezone: 'Asia/Shanghai',
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该通过包含可选字段tableMappings的完整配置', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;
      dto.tableMappings = {
        books: {
          tableId: 'tblXXXXXXXXXXXXXX',
          fieldMappings: {
            title: 'fldYYYYYYYYYYYYYY',
            author: 'fldZZZZZZZZZZZZZZ',
          },
        },
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该通过包含所有字段的完整配置', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'FOUR_TABLES';
      dto.autoSyncEnabled = true;
      dto.syncSchedule = {
        frequency: 'weekly',
        time: '22:30',
        timezone: 'Asia/Shanghai',
        daysOfWeek: [1, 3, 5], // 周一、三、五
      };
      dto.tableMappings = {
        books: {
          tableId: 'tblBooks123456789',
          fieldMappings: {
            title: 'fldTitle',
            author: 'fldAuthor',
          },
        },
        movies: {
          tableId: 'tblMovies123456789',
          fieldMappings: {
            title: 'fldTitle',
            director: 'fldDirector',
          },
        },
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('mappingType 字段验证', () => {
    it('应该接受THREE_TABLES映射类型', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受FOUR_TABLES映射类型', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'FOUR_TABLES';
      dto.autoSyncEnabled = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效的映射类型', async () => {
      const dto = new UpdateSyncConfigDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).mappingType = 'INVALID_TYPE'; // 故意使用错误类型以测试验证器
      dto.autoSyncEnabled = false;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const mappingTypeError = errors.find(
        (err) => err.property === 'mappingType',
      );
      expect(mappingTypeError).toBeDefined();
      expect(mappingTypeError?.constraints?.isEnum).toContain(
        '映射类型必须是THREE_TABLES或FOUR_TABLES',
      );
    });

    it('应该拒绝缺少mappingType字段', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.autoSyncEnabled = false;
      // 故意不设置 mappingType

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const mappingTypeError = errors.find(
        (err) => err.property === 'mappingType',
      );
      expect(mappingTypeError).toBeDefined();
    });

    it('应该拒绝非字符串的mappingType值', async () => {
      const dto = new UpdateSyncConfigDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).mappingType = 12345; // 故意使用错误类型以测试验证器
      dto.autoSyncEnabled = false;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const mappingTypeError = errors.find(
        (err) => err.property === 'mappingType',
      );
      expect(mappingTypeError).toBeDefined();
    });
  });

  describe('autoSyncEnabled 字段验证', () => {
    it('应该接受true值', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受false值', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝缺少autoSyncEnabled字段', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      // 故意不设置 autoSyncEnabled

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const autoSyncError = errors.find(
        (err) => err.property === 'autoSyncEnabled',
      );
      expect(autoSyncError).toBeDefined();
    });

    it('应该拒绝非布尔值的autoSyncEnabled', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).autoSyncEnabled = 'yes'; // 故意使用错误类型以测试验证器

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const autoSyncError = errors.find(
        (err) => err.property === 'autoSyncEnabled',
      );
      expect(autoSyncError).toBeDefined();
      expect(autoSyncError?.constraints?.isBoolean).toContain(
        '自动同步设置必须是布尔值',
      );
    });
  });

  describe('syncSchedule 可选字段验证', () => {
    it('应该允许省略syncSchedule字段', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;
      // 故意不设置 syncSchedule

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受有效的syncSchedule对象（包含frequency）', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = true;
      dto.syncSchedule = {
        frequency: 'daily',
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受包含所有可选属性的syncSchedule', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'FOUR_TABLES';
      dto.autoSyncEnabled = true;
      dto.syncSchedule = {
        frequency: 'monthly',
        time: '03:30',
        timezone: 'America/New_York',
        daysOfWeek: [0, 6], // 周日和周六
        dayOfMonth: 15, // 每月15号
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非对象的syncSchedule值', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).syncSchedule = 'invalid-schedule'; // 故意使用错误类型以测试验证器

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const syncScheduleError = errors.find(
        (err) => err.property === 'syncSchedule',
      );
      expect(syncScheduleError).toBeDefined();
      expect(syncScheduleError?.constraints?.isObject).toContain(
        '同步调度必须是对象',
      );
    });
  });

  describe('tableMappings 可选字段验证', () => {
    it('应该允许省略tableMappings字段', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;
      // 故意不设置 tableMappings

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受有效的tableMappings对象（单个表）', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;
      dto.tableMappings = {
        books: {
          tableId: 'tblBooks123',
          fieldMappings: {
            title: 'fldTitle',
          },
        },
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受包含多个表的tableMappings', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'FOUR_TABLES';
      dto.autoSyncEnabled = false;
      dto.tableMappings = {
        books: {
          tableId: 'tblBooks123',
          fieldMappings: {
            title: 'fldTitle',
            author: 'fldAuthor',
          },
        },
        movies: {
          tableId: 'tblMovies456',
          fieldMappings: {
            title: 'fldTitle',
            director: 'fldDirector',
          },
        },
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受包含所有表类型的tableMappings（books, movies, music, unified）', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;
      dto.tableMappings = {
        books: {
          tableId: 'tblBooks123',
          fieldMappings: { title: 'fldTitle' },
        },
        movies: {
          tableId: 'tblMovies456',
          fieldMappings: { title: 'fldTitle' },
        },
        music: {
          tableId: 'tblMusic789',
          fieldMappings: { title: 'fldTitle' },
        },
        unified: {
          tableId: 'tblUnified000',
          fieldMappings: { title: 'fldTitle' },
        },
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非对象的tableMappings值', async () => {
      const dto = new UpdateSyncConfigDto();
      dto.mappingType = 'THREE_TABLES';
      dto.autoSyncEnabled = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).tableMappings = 'invalid-mappings'; // 故意使用错误类型以测试验证器

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const tableMappingsError = errors.find(
        (err) => err.property === 'tableMappings',
      );
      expect(tableMappingsError).toBeDefined();
      expect(tableMappingsError?.constraints?.isObject).toContain(
        '表格映射必须是对象',
      );
    });
  });
});

describe('类型推导和导出', () => {
  it('应该确保所有DTO类能正确实例化', () => {
    const doubanDto = new UpdateDoubanConfigDto();
    const feishuDto = new UpdateFeishuConfigDto();
    const syncDto = new UpdateSyncConfigDto();

    expect(doubanDto).toBeInstanceOf(UpdateDoubanConfigDto);
    expect(feishuDto).toBeInstanceOf(UpdateFeishuConfigDto);
    expect(syncDto).toBeInstanceOf(UpdateSyncConfigDto);
  });

  it('应该验证DTO属性的可赋值性', () => {
    const doubanDto = new UpdateDoubanConfigDto();
    doubanDto.cookie = 'test_cookie_string';
    expect(doubanDto.cookie).toBe('test_cookie_string');

    const feishuDto = new UpdateFeishuConfigDto();
    feishuDto.appId = 'cli_test_app_id';
    feishuDto.appSecret = 'test_app_secret';
    expect(feishuDto.appId).toBe('cli_test_app_id');
    expect(feishuDto.appSecret).toBe('test_app_secret');

    const syncDto = new UpdateSyncConfigDto();
    syncDto.mappingType = 'THREE_TABLES';
    syncDto.autoSyncEnabled = true;
    expect(syncDto.mappingType).toBe('THREE_TABLES');
    expect(syncDto.autoSyncEnabled).toBe(true);
  });

  it('应该验证UpdateSyncConfigDto的复杂类型推导', () => {
    const syncDto = new UpdateSyncConfigDto();
    syncDto.mappingType = 'FOUR_TABLES';
    syncDto.autoSyncEnabled = false;

    // 验证可选的复杂嵌套对象
    syncDto.syncSchedule = {
      frequency: 'weekly',
      time: '10:00',
      timezone: 'Asia/Tokyo',
      daysOfWeek: [1, 2, 3, 4, 5],
    };

    syncDto.tableMappings = {
      books: {
        tableId: 'tblBooks',
        fieldMappings: {
          title: 'fldTitle',
          author: 'fldAuthor',
          isbn: 'fldISBN',
        },
      },
    };

    expect(syncDto.syncSchedule?.frequency).toBe('weekly');
    expect(syncDto.syncSchedule?.daysOfWeek).toEqual([1, 2, 3, 4, 5]);
    expect(syncDto.tableMappings?.books?.tableId).toBe('tblBooks');
    expect(syncDto.tableMappings?.books?.fieldMappings.title).toBe('fldTitle');
  });
});
