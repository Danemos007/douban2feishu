import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BatchCreateRecordsDto, GetTableFieldsDto } from './feishu.dto';
import { FeishuRecordData } from '../interfaces/feishu.interface';

describe('DTO Validation Suite - feishu.dto.ts', () => {
  // ============================================================================
  // BatchCreateRecordsDto Tests
  // ============================================================================
  describe('BatchCreateRecordsDto - Validation & Structure Tests', () => {
    // Mock data constants
    const mockValidData = {
      appId: 'cli_a1b2c3d4e5f6g7h8',
      appSecret: 'abcdef123456789',
      appToken: 'bascnCMII2ORbcJlrZwVQrqAbh',
      tableId: 'tblsRc9GRRXKqhvW',
      records: [
        { title: 'Test Book', rating: 5 },
        { fields: { title: 'Test Movie', rating: 4.5 } },
      ] as FeishuRecordData[],
      tableMapping: {
        title: 'fldXXXXXXXXXXXXXX',
        rating: 'fldYYYYYYYYYYYYYY',
      },
    };

    describe('Class Instantiation & Structure', () => {
      it('should be defined and properly instantiated', () => {
        const dto = new BatchCreateRecordsDto();
        expect(dto).toBeDefined();
        expect(dto).toBeInstanceOf(BatchCreateRecordsDto);
      });

      it('should have all required properties defined', () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        expect(dto.appId).toBeDefined();
        expect(dto.appSecret).toBeDefined();
        expect(dto.appToken).toBeDefined();
        expect(dto.tableId).toBeDefined();
        expect(dto.records).toBeDefined();
        expect(dto.tableMapping).toBeDefined();
      });

      it('should have correct property types after instantiation', () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        expect(typeof dto.appId).toBe('string');
        expect(typeof dto.appSecret).toBe('string');
        expect(typeof dto.appToken).toBe('string');
        expect(typeof dto.tableId).toBe('string');
        expect(Array.isArray(dto.records)).toBe(true);
        expect(typeof dto.tableMapping).toBe('object');
      });
    });

    describe('Property Validation - appId', () => {
      it('should accept valid appId string', async () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        const errors = await validate(dto);
        const appIdErrors = errors.filter((e) => e.property === 'appId');
        expect(appIdErrors).toHaveLength(0);
      });

      it('should accept empty string for appId (no @IsNotEmpty)', async () => {
        const validData = { ...mockValidData, appId: '' };
        const dto = plainToInstance(BatchCreateRecordsDto, validData);
        const errors = await validate(dto);
        const appIdErrors = errors.filter((e) => e.property === 'appId');
        expect(appIdErrors).toHaveLength(0);
      });

      it('should reject non-string values for appId', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appId: 12345 as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const appIdErrors = errors.filter((e) => e.property === 'appId');
        expect(appIdErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for appId', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appId: 12345 as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const appIdErrors = errors.filter((e) => e.property === 'appId');
        expect(appIdErrors[0]?.constraints?.isString).toBe(
          '应用ID必须是字符串',
        );
      });
    });

    describe('Property Validation - appSecret', () => {
      it('should accept valid appSecret string', async () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        const errors = await validate(dto);
        const appSecretErrors = errors.filter(
          (e) => e.property === 'appSecret',
        );
        expect(appSecretErrors).toHaveLength(0);
      });

      it('should accept empty string for appSecret (no @IsNotEmpty)', async () => {
        const validData = { ...mockValidData, appSecret: '' };
        const dto = plainToInstance(BatchCreateRecordsDto, validData);
        const errors = await validate(dto);
        const appSecretErrors = errors.filter(
          (e) => e.property === 'appSecret',
        );
        expect(appSecretErrors).toHaveLength(0);
      });

      it('should reject non-string values for appSecret', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appSecret: true as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const appSecretErrors = errors.filter(
          (e) => e.property === 'appSecret',
        );
        expect(appSecretErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for appSecret', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appSecret: null as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const appSecretErrors = errors.filter(
          (e) => e.property === 'appSecret',
        );
        expect(appSecretErrors[0]?.constraints?.isString).toBe(
          '应用Secret必须是字符串',
        );
      });
    });

    describe('Property Validation - appToken', () => {
      it('should accept valid appToken string', async () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        const errors = await validate(dto);
        const appTokenErrors = errors.filter((e) => e.property === 'appToken');
        expect(appTokenErrors).toHaveLength(0);
      });

      it('should accept empty string for appToken (no @IsNotEmpty)', async () => {
        const validData = { ...mockValidData, appToken: '' };
        const dto = plainToInstance(BatchCreateRecordsDto, validData);
        const errors = await validate(dto);
        const appTokenErrors = errors.filter((e) => e.property === 'appToken');
        expect(appTokenErrors).toHaveLength(0);
      });

      it('should reject non-string values for appToken', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appToken: ['invalid'] as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const appTokenErrors = errors.filter((e) => e.property === 'appToken');
        expect(appTokenErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for appToken', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appToken: {} as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const appTokenErrors = errors.filter((e) => e.property === 'appToken');
        expect(appTokenErrors[0]?.constraints?.isString).toBe(
          'App Token必须是字符串',
        );
      });
    });

    describe('Property Validation - tableId', () => {
      it('should accept valid tableId string', async () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        const errors = await validate(dto);
        const tableIdErrors = errors.filter((e) => e.property === 'tableId');
        expect(tableIdErrors).toHaveLength(0);
      });

      it('should accept empty string for tableId (no @IsNotEmpty)', async () => {
        const validData = { ...mockValidData, tableId: '' };
        const dto = plainToInstance(BatchCreateRecordsDto, validData);
        const errors = await validate(dto);
        const tableIdErrors = errors.filter((e) => e.property === 'tableId');
        expect(tableIdErrors).toHaveLength(0);
      });

      it('should reject non-string values for tableId', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, tableId: 999 as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const tableIdErrors = errors.filter((e) => e.property === 'tableId');
        expect(tableIdErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for tableId', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, tableId: false as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const tableIdErrors = errors.filter((e) => e.property === 'tableId');
        expect(tableIdErrors[0]?.constraints?.isString).toBe(
          '表格ID必须是字符串',
        );
      });
    });

    describe('Property Validation - records', () => {
      it('should accept valid records array', async () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        const errors = await validate(dto);
        const recordsErrors = errors.filter((e) => e.property === 'records');
        expect(recordsErrors).toHaveLength(0);
      });

      it('should accept empty records array', async () => {
        const validData = { ...mockValidData, records: [] };
        const dto = plainToInstance(BatchCreateRecordsDto, validData);
        const errors = await validate(dto);
        const recordsErrors = errors.filter((e) => e.property === 'records');
        expect(recordsErrors).toHaveLength(0);
      });

      it('should reject non-array values for records', async () => {
        const invalidData = {
          ...mockValidData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          records: 'not-an-array' as any,
        };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const recordsErrors = errors.filter((e) => e.property === 'records');
        expect(recordsErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for records', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, records: {} as any };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const recordsErrors = errors.filter((e) => e.property === 'records');
        expect(recordsErrors[0]?.constraints?.isArray).toBe('记录必须是数组');
      });

      it('should accept records with complex FeishuRecordData structure', async () => {
        const complexRecords = [
          { title: 'Simple Format', rating: 5 },
          {
            fields: {
              title: 'Nested Format',
              rating: 4.5,
              tags: ['tag1', 'tag2'],
            },
          },
          { fields: { status: 'active', count: 100 } },
        ] as FeishuRecordData[];
        const validData = { ...mockValidData, records: complexRecords };
        const dto = plainToInstance(BatchCreateRecordsDto, validData);
        const errors = await validate(dto);
        const recordsErrors = errors.filter((e) => e.property === 'records');
        expect(recordsErrors).toHaveLength(0);
      });
    });

    describe('Property Validation - tableMapping (Optional)', () => {
      it('should accept undefined tableMapping (optional field)', async () => {
        const { tableMapping: _tableMapping, ...dataWithoutMapping } =
          mockValidData;
        const dto = plainToInstance(BatchCreateRecordsDto, dataWithoutMapping);
        const errors = await validate(dto);
        const tableMappingErrors = errors.filter(
          (e) => e.property === 'tableMapping',
        );
        expect(tableMappingErrors).toHaveLength(0);
      });

      it('should accept valid tableMapping object', async () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        const errors = await validate(dto);
        const tableMappingErrors = errors.filter(
          (e) => e.property === 'tableMapping',
        );
        expect(tableMappingErrors).toHaveLength(0);
      });

      it('should accept empty tableMapping object', async () => {
        const validData = { ...mockValidData, tableMapping: {} };
        const dto = plainToInstance(BatchCreateRecordsDto, validData);
        const errors = await validate(dto);
        const tableMappingErrors = errors.filter(
          (e) => e.property === 'tableMapping',
        );
        expect(tableMappingErrors).toHaveLength(0);
      });

      it('should reject non-object values for tableMapping', async () => {
        const invalidData = {
          ...mockValidData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          tableMapping: 'not-an-object' as any,
        };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const tableMappingErrors = errors.filter(
          (e) => e.property === 'tableMapping',
        );
        expect(tableMappingErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for tableMapping', async () => {
        const invalidData = {
          ...mockValidData,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          tableMapping: ['array'] as any,
        };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        const tableMappingErrors = errors.filter(
          (e) => e.property === 'tableMapping',
        );
        expect(tableMappingErrors[0]?.constraints?.isObject).toBe(
          '表格映射必须是对象',
        );
      });
    });

    describe('Complete DTO Validation', () => {
      it('should pass validation with all required fields valid', async () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should pass validation with optional tableMapping provided', async () => {
        const dto = plainToInstance(BatchCreateRecordsDto, mockValidData);
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
        expect(dto.tableMapping).toBeDefined();
      });

      it('should fail validation when required fields are missing', async () => {
        const invalidData = {
          appId: 'cli_test',
          // Missing: appSecret, appToken, tableId, records
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData as any);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);

        const missingFields = errors.map((e) => e.property);
        expect(missingFields).toContain('appSecret');
        expect(missingFields).toContain('appToken');
        expect(missingFields).toContain('tableId');
        expect(missingFields).toContain('records');
      });

      it('should accumulate multiple validation errors', async () => {
        const invalidData = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appId: 123 as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appSecret: null as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appToken: [] as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          tableId: {} as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          records: 'not-array' as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          tableMapping: 'not-object' as any,
        };
        const dto = plainToInstance(BatchCreateRecordsDto, invalidData);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThanOrEqual(6);
      });
    });
  });

  // ============================================================================
  // GetTableFieldsDto Tests
  // ============================================================================
  describe('GetTableFieldsDto - Validation & Structure Tests', () => {
    // Mock data constants
    const mockValidData = {
      appId: 'cli_a1b2c3d4e5f6g7h8',
      appSecret: 'abcdef123456789',
      appToken: 'bascnCMII2ORbcJlrZwVQrqAbh',
      tableId: 'tblsRc9GRRXKqhvW',
    };

    describe('Class Instantiation & Structure', () => {
      it('should be defined and properly instantiated', () => {
        const dto = new GetTableFieldsDto();
        expect(dto).toBeDefined();
        expect(dto).toBeInstanceOf(GetTableFieldsDto);
      });

      it('should have all required properties defined', () => {
        const dto = plainToInstance(GetTableFieldsDto, mockValidData);
        expect(dto.appId).toBeDefined();
        expect(dto.appSecret).toBeDefined();
        expect(dto.appToken).toBeDefined();
        expect(dto.tableId).toBeDefined();
      });

      it('should have correct property types after instantiation', () => {
        const dto = plainToInstance(GetTableFieldsDto, mockValidData);
        expect(typeof dto.appId).toBe('string');
        expect(typeof dto.appSecret).toBe('string');
        expect(typeof dto.appToken).toBe('string');
        expect(typeof dto.tableId).toBe('string');
      });
    });

    describe('Property Validation - appId', () => {
      it('should accept valid appId string', async () => {
        const dto = plainToInstance(GetTableFieldsDto, mockValidData);
        const errors = await validate(dto);
        const appIdErrors = errors.filter((e) => e.property === 'appId');
        expect(appIdErrors).toHaveLength(0);
      });

      it('should accept empty string for appId (no @IsNotEmpty)', async () => {
        const validData = { ...mockValidData, appId: '' };
        const dto = plainToInstance(GetTableFieldsDto, validData);
        const errors = await validate(dto);
        const appIdErrors = errors.filter((e) => e.property === 'appId');
        expect(appIdErrors).toHaveLength(0);
      });

      it('should reject non-string values for appId', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appId: 12345 as any };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        const appIdErrors = errors.filter((e) => e.property === 'appId');
        expect(appIdErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for appId', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appId: true as any };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        const appIdErrors = errors.filter((e) => e.property === 'appId');
        expect(appIdErrors[0]?.constraints?.isString).toBe(
          '应用ID必须是字符串',
        );
      });
    });

    describe('Property Validation - appSecret', () => {
      it('should accept valid appSecret string', async () => {
        const dto = plainToInstance(GetTableFieldsDto, mockValidData);
        const errors = await validate(dto);
        const appSecretErrors = errors.filter(
          (e) => e.property === 'appSecret',
        );
        expect(appSecretErrors).toHaveLength(0);
      });

      it('should accept empty string for appSecret (no @IsNotEmpty)', async () => {
        const validData = { ...mockValidData, appSecret: '' };
        const dto = plainToInstance(GetTableFieldsDto, validData);
        const errors = await validate(dto);
        const appSecretErrors = errors.filter(
          (e) => e.property === 'appSecret',
        );
        expect(appSecretErrors).toHaveLength(0);
      });

      it('should reject non-string values for appSecret', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appSecret: null as any };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        const appSecretErrors = errors.filter(
          (e) => e.property === 'appSecret',
        );
        expect(appSecretErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for appSecret', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appSecret: 999 as any };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        const appSecretErrors = errors.filter(
          (e) => e.property === 'appSecret',
        );
        expect(appSecretErrors[0]?.constraints?.isString).toBe(
          '应用Secret必须是字符串',
        );
      });
    });

    describe('Property Validation - appToken', () => {
      it('should accept valid appToken string', async () => {
        const dto = plainToInstance(GetTableFieldsDto, mockValidData);
        const errors = await validate(dto);
        const appTokenErrors = errors.filter((e) => e.property === 'appToken');
        expect(appTokenErrors).toHaveLength(0);
      });

      it('should accept empty string for appToken (no @IsNotEmpty)', async () => {
        const validData = { ...mockValidData, appToken: '' };
        const dto = plainToInstance(GetTableFieldsDto, validData);
        const errors = await validate(dto);
        const appTokenErrors = errors.filter((e) => e.property === 'appToken');
        expect(appTokenErrors).toHaveLength(0);
      });

      it('should reject non-string values for appToken', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appToken: {} as any };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        const appTokenErrors = errors.filter((e) => e.property === 'appToken');
        expect(appTokenErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for appToken', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, appToken: ['test'] as any };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        const appTokenErrors = errors.filter((e) => e.property === 'appToken');
        expect(appTokenErrors[0]?.constraints?.isString).toBe(
          'App Token必须是字符串',
        );
      });
    });

    describe('Property Validation - tableId', () => {
      it('should accept valid tableId string', async () => {
        const dto = plainToInstance(GetTableFieldsDto, mockValidData);
        const errors = await validate(dto);
        const tableIdErrors = errors.filter((e) => e.property === 'tableId');
        expect(tableIdErrors).toHaveLength(0);
      });

      it('should accept empty string for tableId (no @IsNotEmpty)', async () => {
        const validData = { ...mockValidData, tableId: '' };
        const dto = plainToInstance(GetTableFieldsDto, validData);
        const errors = await validate(dto);
        const tableIdErrors = errors.filter((e) => e.property === 'tableId');
        expect(tableIdErrors).toHaveLength(0);
      });

      it('should reject non-string values for tableId', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, tableId: false as any };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        const tableIdErrors = errors.filter((e) => e.property === 'tableId');
        expect(tableIdErrors.length).toBeGreaterThan(0);
      });

      it('should provide correct validation error message for tableId', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const invalidData = { ...mockValidData, tableId: 123 as any };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        const tableIdErrors = errors.filter((e) => e.property === 'tableId');
        expect(tableIdErrors[0]?.constraints?.isString).toBe(
          '表格ID必须是字符串',
        );
      });
    });

    describe('Complete DTO Validation', () => {
      it('should pass validation with all required fields valid', async () => {
        const dto = plainToInstance(GetTableFieldsDto, mockValidData);
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('should fail validation when any required field is missing', async () => {
        const invalidData = {
          appId: 'cli_test',
          appSecret: 'secret',
          // Missing: appToken, tableId
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dto = plainToInstance(GetTableFieldsDto, invalidData as any);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);

        const missingFields = errors.map((e) => e.property);
        expect(missingFields).toContain('appToken');
        expect(missingFields).toContain('tableId');
      });

      it('should accumulate multiple validation errors', async () => {
        const invalidData = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appId: null as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appSecret: 123 as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appToken: true as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          tableId: [] as any,
        };
        const dto = plainToInstance(GetTableFieldsDto, invalidData);
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  // ============================================================================
  // Integration Tests & Edge Cases
  // ============================================================================
  describe('DTO Integration & Edge Cases', () => {
    describe('Cross-DTO Compatibility', () => {
      it('should share same credential fields between both DTOs', () => {
        const sharedData = {
          appId: 'cli_a1b2c3d4e5f6g7h8',
          appSecret: 'abcdef123456789',
          appToken: 'bascnCMII2ORbcJlrZwVQrqAbh',
          tableId: 'tblsRc9GRRXKqhvW',
        };

        const batchDto = plainToInstance(BatchCreateRecordsDto, {
          ...sharedData,
          records: [],
        });
        const getFieldsDto = plainToInstance(GetTableFieldsDto, sharedData);

        expect(batchDto.appId).toBe(getFieldsDto.appId);
        expect(batchDto.appSecret).toBe(getFieldsDto.appSecret);
        expect(batchDto.appToken).toBe(getFieldsDto.appToken);
        expect(batchDto.tableId).toBe(getFieldsDto.tableId);
      });

      it('should have consistent validation rules for shared fields', async () => {
        const invalidSharedData = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appId: 123 as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appSecret: null as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          appToken: true as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
          tableId: [] as any,
        };

        const batchDto = plainToInstance(BatchCreateRecordsDto, {
          ...invalidSharedData,
          records: [],
        });
        const getFieldsDto = plainToInstance(
          GetTableFieldsDto,
          invalidSharedData,
        );

        const batchErrors = await validate(batchDto);
        const getFieldsErrors = await validate(getFieldsDto);

        // Both should have errors for the same shared fields
        const batchSharedErrors = batchErrors.filter((e) =>
          ['appId', 'appSecret', 'appToken', 'tableId'].includes(e.property),
        );
        const getFieldsSharedErrors = getFieldsErrors.filter((e) =>
          ['appId', 'appSecret', 'appToken', 'tableId'].includes(e.property),
        );

        expect(batchSharedErrors.length).toBe(getFieldsSharedErrors.length);
      });
    });

    describe('Edge Cases & Boundary Conditions', () => {
      it('should handle extremely long string values', async () => {
        const longString = 'a'.repeat(10000);
        const data = {
          appId: longString,
          appSecret: longString,
          appToken: longString,
          tableId: longString,
          records: [],
        };
        const dto = plainToInstance(BatchCreateRecordsDto, data);
        const errors = await validate(dto);

        // Should pass validation (no length constraint in validators)
        expect(errors).toHaveLength(0);
      });

      it('should handle special characters in string fields', async () => {
        const specialChars = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
        const data = {
          appId: `cli_${specialChars}`,
          appSecret: `secret_${specialChars}`,
          appToken: `token_${specialChars}`,
          tableId: `tbl_${specialChars}`,
          records: [],
        };
        const dto = plainToInstance(BatchCreateRecordsDto, data);
        const errors = await validate(dto);

        // Should pass validation (special chars are allowed)
        expect(errors).toHaveLength(0);
      });

      it('should handle null vs undefined vs empty string differences', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const nullData = { appId: null as any };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
        const undefinedData = { appId: undefined as any };
        const emptyData = { appId: '' };

        const nullDto = plainToInstance(BatchCreateRecordsDto, nullData);
        const undefinedDto = plainToInstance(
          BatchCreateRecordsDto,
          undefinedData,
        );
        const emptyDto = plainToInstance(BatchCreateRecordsDto, emptyData);

        const nullErrors = await validate(nullDto);
        const undefinedErrors = await validate(undefinedDto);
        const emptyErrors = await validate(emptyDto);

        // null and undefined should fail validation
        expect(
          nullErrors.filter((e) => e.property === 'appId').length,
        ).toBeGreaterThan(0);
        expect(
          undefinedErrors.filter((e) => e.property === 'appId').length,
        ).toBeGreaterThan(0);
        // empty string is valid (no @IsNotEmpty decorator)
        expect(emptyErrors.filter((e) => e.property === 'appId').length).toBe(
          0,
        );
      });

      it('should handle large arrays in records field', async () => {
        const largeRecords = Array.from({ length: 1000 }, (_, i) => ({
          title: `Record ${i}`,
          index: i,
        })) as FeishuRecordData[];

        const data = {
          appId: 'cli_test',
          appSecret: 'secret',
          appToken: 'token',
          tableId: 'table',
          records: largeRecords,
        };
        const dto = plainToInstance(BatchCreateRecordsDto, data);
        const errors = await validate(dto);

        // Should pass validation (no array length constraint)
        expect(errors).toHaveLength(0);
        expect(dto.records).toHaveLength(1000);
      });
    });

    describe('Type Safety & TypeScript Compliance', () => {
      it('should enforce type safety for FeishuRecordData in records', () => {
        const validRecords: FeishuRecordData[] = [
          { title: 'Simple', count: 1 },
          { fields: { nested: 'value' } },
        ];

        const dto = plainToInstance(BatchCreateRecordsDto, {
          appId: 'test',
          appSecret: 'secret',
          appToken: 'token',
          tableId: 'table',
          records: validRecords,
        });

        expect(dto.records).toBeDefined();
        expect(Array.isArray(dto.records)).toBe(true);
        expect(dto.records[0]).toHaveProperty('title');
        expect(dto.records[1]).toHaveProperty('fields');
      });

      it('should enforce type safety for Record<string, string> in tableMapping', () => {
        const validMapping: Record<string, string> = {
          field1: 'fldXXXXXX',
          field2: 'fldYYYYYY',
          field3: 'fldZZZZZZ',
        };

        const dto = plainToInstance(BatchCreateRecordsDto, {
          appId: 'test',
          appSecret: 'secret',
          appToken: 'token',
          tableId: 'table',
          records: [],
          tableMapping: validMapping,
        });

        expect(dto.tableMapping).toBeDefined();
        expect(typeof dto.tableMapping).toBe('object');
        expect(Object.keys(dto.tableMapping!).length).toBe(3);
      });
    });
  });
});
