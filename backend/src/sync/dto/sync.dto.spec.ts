import { validate } from 'class-validator';
import {
  TriggerSyncDto,
  QuerySyncHistoryDto,
  CancelSyncDto,
  IntegratedSyncDto,
} from './sync.dto';

describe('TriggerSyncDto', () => {
  describe('基本验证', () => {
    it('应该成功验证所有字段都有效的DTO', async () => {
      const dto = new TriggerSyncDto();
      dto.triggerType = 'MANUAL';
      dto.delayMs = 1000;
      dto.options = {
        categories: ['books', 'movies'],
        limit: 100,
        forceUpdate: false,
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该成功验证仅包含必填字段的DTO（使用默认值）', async () => {
      const dto = new TriggerSyncDto();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.triggerType).toBe('MANUAL');
    });
  });

  describe('triggerType字段验证', () => {
    it('应该接受MANUAL触发类型', async () => {
      const dto = new TriggerSyncDto();
      dto.triggerType = 'MANUAL';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受AUTO触发类型', async () => {
      const dto = new TriggerSyncDto();
      dto.triggerType = 'AUTO';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效的触发类型', async () => {
      const dto = new TriggerSyncDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).triggerType = 'INVALID_TYPE';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('应该拒绝非字符串的triggerType值', async () => {
      const dto = new TriggerSyncDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).triggerType = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该允许triggerType为undefined（使用默认值）', async () => {
      const dto = new TriggerSyncDto();
      dto.triggerType = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('delayMs字段验证', () => {
    it('应该接受有效的延迟时间（正整数）', async () => {
      const dto = new TriggerSyncDto();
      dto.delayMs = 5000;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受延迟时间为0', async () => {
      const dto = new TriggerSyncDto();
      dto.delayMs = 0;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝负数的延迟时间', async () => {
      const dto = new TriggerSyncDto();
      dto.delayMs = -100;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('应该拒绝非数字的delayMs值', async () => {
      const dto = new TriggerSyncDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).delayMs = '5000';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('应该允许delayMs为undefined', async () => {
      const dto = new TriggerSyncDto();
      dto.delayMs = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('options字段验证', () => {
    it('应该接受有效的options对象', async () => {
      const dto = new TriggerSyncDto();
      dto.options = {
        categories: ['books', 'movies', 'tv'],
        limit: 100,
        forceUpdate: false,
        fullSync: true,
        conflictStrategy: 'douban_wins',
      };

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非对象的options值', async () => {
      const dto = new TriggerSyncDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).options = 'invalid';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isObject');
    });

    it('应该允许options为undefined', async () => {
      const dto = new TriggerSyncDto();
      dto.options = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});

describe('QuerySyncHistoryDto', () => {
  describe('基本验证', () => {
    it('应该成功验证所有字段都有效的DTO', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.limit = 20;
      dto.status = 'SUCCESS';
      dto.categories = ['books', 'movies'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该成功验证仅包含默认值的DTO', async () => {
      const dto = new QuerySyncHistoryDto();

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
      expect(dto.limit).toBe(10);
    });
  });

  describe('limit字段验证', () => {
    it('应该接受有效的limit值（正整数）', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.limit = 50;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受最小有效值1', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.limit = 1;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝小于1的limit值', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.limit = 0;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('应该拒绝非数字的limit值', async () => {
      const dto = new QuerySyncHistoryDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).limit = '10';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('应该允许limit为undefined（使用默认值10）', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.limit = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('status字段验证', () => {
    it('应该接受QUEUED状态', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.status = 'QUEUED';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受RUNNING状态', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.status = 'RUNNING';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受SUCCESS状态', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.status = 'SUCCESS';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受FAILED状态', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.status = 'FAILED';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效的状态值', async () => {
      const dto = new QuerySyncHistoryDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).status = 'INVALID_STATUS';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('应该允许status为undefined', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.status = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('categories字段验证', () => {
    it('应该接受有效的单个分类', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.categories = ['books'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受多个有效分类', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.categories = ['books', 'movies', 'tv', 'documentary'];

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝包含无效分类的数组', async () => {
      const dto = new QuerySyncHistoryDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).categories = ['books', 'invalid_category'];

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('应该拒绝非数组的categories值', async () => {
      const dto = new QuerySyncHistoryDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).categories = 'books';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isArray');
    });

    it('应该允许categories为undefined', async () => {
      const dto = new QuerySyncHistoryDto();
      dto.categories = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});

describe('CancelSyncDto', () => {
  describe('基本验证', () => {
    it('应该成功验证所有字段都有效的DTO', async () => {
      const dto = new CancelSyncDto();
      dto.syncId = 'uuid-123-456';
      dto.reason = '用户手动取消';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该成功验证仅包含必填字段的DTO', async () => {
      const dto = new CancelSyncDto();
      dto.syncId = 'uuid-123-456';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('syncId字段验证', () => {
    it('应该接受有效的syncId字符串', async () => {
      const dto = new CancelSyncDto();
      dto.syncId = 'valid-sync-id-12345';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受空字符串的syncId（IsString不验证最小长度）', async () => {
      const dto = new CancelSyncDto();
      dto.syncId = '';

      const errors = await validate(dto);
      // 注意：@IsString() 装饰器不会拒绝空字符串
      // 如需拒绝空字符串，需要添加 @MinLength(1) 装饰器
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非字符串的syncId值', async () => {
      const dto = new CancelSyncDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).syncId = 12345;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('应该拒绝缺失syncId字段', async () => {
      const dto = new CancelSyncDto();

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('reason字段验证', () => {
    it('应该接受有效的reason字符串', async () => {
      const dto = new CancelSyncDto();
      dto.syncId = 'uuid-123';
      dto.reason = '系统维护需要取消';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非字符串的reason值', async () => {
      const dto = new CancelSyncDto();
      dto.syncId = 'uuid-123';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).reason = 123;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('应该允许reason为undefined', async () => {
      const dto = new CancelSyncDto();
      dto.syncId = 'uuid-123';
      dto.reason = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});

describe('IntegratedSyncDto', () => {
  describe('基本验证', () => {
    it('应该成功验证所有字段都有效的DTO', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'bid=123; ll="118282"';
      dto.isEncrypted = false;
      dto.status = 'collect';
      dto.limit = 100;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该成功验证仅包含必填字段的DTO', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'movies';
      dto.cookie = 'bid=123; ll="118282"';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('category字段验证', () => {
    it('应该接受books分类', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受movies分类', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'movies';
      dto.cookie = 'test-cookie';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受tv分类', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'tv';
      dto.cookie = 'test-cookie';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效的分类值', async () => {
      const dto = new IntegratedSyncDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).category = 'documentary';
      dto.cookie = 'test-cookie';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('应该拒绝非字符串的category值', async () => {
      const dto = new IntegratedSyncDto();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).category = 123;
      dto.cookie = 'test-cookie';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝缺失category字段', async () => {
      const dto = new IntegratedSyncDto();
      dto.cookie = 'test-cookie';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('cookie字段验证', () => {
    it('应该接受有效的cookie字符串', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'bid=abc123; __utma=123456789';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受空字符串的cookie（IsString不验证最小长度）', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = '';

      const errors = await validate(dto);
      // 注意：@IsString() 装饰器不会拒绝空字符串
      // 如需拒绝空字符串，需要添加 @MinLength(1) 装饰器
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非字符串的cookie值', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).cookie = { bid: '123' };

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isString');
    });

    it('应该拒绝缺失cookie字段', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('isEncrypted字段验证', () => {
    it('应该接受true值', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.isEncrypted = true;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受false值', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.isEncrypted = false;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝非布尔值的isEncrypted', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).isEncrypted = 'false';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isBoolean');
    });

    it('应该允许isEncrypted为undefined（使用默认值false）', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.isEncrypted = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('status字段验证', () => {
    it('应该接受wish状态', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.status = 'wish';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受do状态', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.status = 'do';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受collect状态', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.status = 'collect';

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝无效的status值', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).status = 'invalid';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEnum');
    });

    it('应该允许status为undefined', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.status = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('limit字段验证', () => {
    it('应该接受有效的limit值', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.limit = 500;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该接受最小有效值1', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.limit = 1;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('应该拒绝小于1的limit值', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.limit = 0;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('应该拒绝非数字的limit值', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (dto as any).limit = '100';

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('应该允许limit为undefined', async () => {
      const dto = new IntegratedSyncDto();
      dto.category = 'books';
      dto.cookie = 'test-cookie';
      dto.limit = undefined;

      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});

describe('类型导出验证', () => {
  it('应该正确导出TriggerSyncDto类型', () => {
    expect(TriggerSyncDto).toBeDefined();
    expect(typeof TriggerSyncDto).toBe('function');
  });

  it('应该正确导出QuerySyncHistoryDto类型', () => {
    expect(QuerySyncHistoryDto).toBeDefined();
    expect(typeof QuerySyncHistoryDto).toBe('function');
  });

  it('应该正确导出CancelSyncDto类型', () => {
    expect(CancelSyncDto).toBeDefined();
    expect(typeof CancelSyncDto).toBe('function');
  });

  it('应该正确导出IntegratedSyncDto类型', () => {
    expect(IntegratedSyncDto).toBeDefined();
    expect(typeof IntegratedSyncDto).toBe('function');
  });
});
