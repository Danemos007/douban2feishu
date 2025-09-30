import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import axios from 'axios';

import { FeishuService } from './feishu.service';
import { BatchCreateRecordsDto } from './dto/feishu.dto';
import {
  FeishuApiResponse,
  FeishuTokenResponse,
  FeishuTableFieldsResponse,
  FeishuRecordsResponse,
  FeishuRecordData,
} from './interfaces/feishu.interface';

// Test-specific types to handle complex field values
type TestRecordData = Record<
  string,
  | string
  | number
  | boolean
  | null
  | Date
  | Array<string | number>
  | Record<string, unknown>
  | undefined
>;

// Mock axios with proper typing
jest.mock('axios');

// Create a type-safe mock for axios instance
const createMockAxiosInstance = () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  defaults: {},
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
  },
});

type MockAxiosInstance = ReturnType<typeof createMockAxiosInstance>;
const mockAxiosInstance: MockAxiosInstance = createMockAxiosInstance();

// Mock axios.create to return our typed instance
(axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

// Type-safe helpers for accessing mock call data
interface BatchCreatePayload {
  records: Array<{ fields: Record<string, unknown> }>;
}

interface SearchPayload {
  filter: {
    conditions: Array<{
      field_id: string;
      operator: string;
      value: string;
    }>;
  };
}

// Define specific call argument types
type BatchCreateCallArgs = [
  string,
  BatchCreatePayload,
  { headers: { Authorization: string } },
];
type SearchCallArgs = [
  string,
  SearchPayload,
  { headers: { Authorization: string } },
];
// Type-safe helper functions
const getBatchCreatePayload = (
  mockFn: jest.Mock,
  callIndex: number,
): BatchCreatePayload => {
  const call = mockFn.mock.calls[callIndex] as BatchCreateCallArgs;
  return call[1];
};

const getSearchPayload = (
  mockFn: jest.Mock,
  callIndex: number,
): SearchPayload => {
  const call = mockFn.mock.calls[callIndex] as SearchCallArgs;
  return call[1];
};

// Type-safe helpers for logger mock calls
type LoggerCallArgs = [string, ...unknown[]];

// Type-safe helpers for spy instances
const getAllSpyLogMessages = (loggerSpy: jest.SpyInstance): string[] => {
  return loggerSpy.mock.calls.map((call) => {
    const typedCall = call as LoggerCallArgs;
    return typedCall[0];
  });
};

const findErrorSpyCall = (
  errorSpy: jest.SpyInstance,
  message: string,
  errorInstance?: boolean,
): LoggerCallArgs | undefined => {
  return errorSpy.mock.calls.find((call) => {
    const typedCall = call as LoggerCallArgs;
    if (errorInstance) {
      return typedCall[0] === message && typedCall[1] instanceof Error;
    }
    return typedCall[0] === message;
  }) as LoggerCallArgs | undefined;
};

const findErrorSpyCallWithPattern = (
  errorSpy: jest.SpyInstance,
  messagePattern: string,
  errorInstance?: boolean,
): LoggerCallArgs | undefined => {
  return errorSpy.mock.calls.find((call) => {
    const typedCall = call as LoggerCallArgs;
    if (errorInstance) {
      return typedCall[0] === messagePattern && typedCall[1] instanceof Error;
    }
    return typedCall[0] === messagePattern;
  }) as LoggerCallArgs | undefined;
};

describe('FeishuService - Core Integration', () => {
  let service: FeishuService;
  let configService: ConfigService;
  let mockLogger: Partial<Logger>;

  // Spy variables for unbound-method error prevention
  let configGetSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;

  // Test fixtures
  const mockValidTokenResponse: FeishuApiResponse<FeishuTokenResponse> = {
    code: 0,
    msg: 'ok',
    data: {
      code: 0,
      msg: 'ok',
      tenant_access_token: 't-g10492fjZOL3REROWRR4PTVA54XOEE3FKHAEOOG3',
      expire: 7199,
    },
  };

  const mockValidTableFieldsResponse: FeishuApiResponse<FeishuTableFieldsResponse> =
    {
      code: 0,
      msg: 'ok',
      data: {
        has_more: false,
        total: 2,
        items: [
          {
            field_id: 'fldXXXXXXXXXXXXXX',
            field_name: 'Subject ID',
            type: 1,
          },
          {
            field_id: 'fldYYYYYYYYYYYYYY',
            field_name: '书名',
            type: 1,
          },
        ],
      },
    };

  const mockValidRecordsResponse: FeishuApiResponse<FeishuRecordsResponse> = {
    code: 0,
    msg: 'ok',
    data: {
      has_more: false,
      total: 1,
      items: [
        {
          record_id: 'recXXXXXXXXXXXXXX',
          fields: {
            fldXXXXXXXXXXXXXX: '123456',
            fldYYYYYYYYYYYYYY: '测试书名',
          },
        },
      ],
    },
  };

  const mockBatchCreateDto: BatchCreateRecordsDto = {
    appId: 'cli_test_app_id',
    appSecret: 'test_app_secret',
    appToken: 'test_app_token',
    tableId: 'test_table_id',
    records: [
      {
        subjectId: '123456',
        title: '测试书名',
        rating: 8.5,
      },
    ],
    tableMapping: {
      subjectId: 'fldXXXXXXXXXXXXXX',
      title: 'fldYYYYYYYYYYYYYY',
      rating: 'fldZZZZZZZZZZZZZZ',
    },
  };

  const mockConfig = {
    FEISHU_BASE_URL: 'https://open.feishu.cn',
  };

  beforeEach(async () => {
    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeishuService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    })
      .setLogger(mockLogger as Logger)
      .compile();

    service = module.get<FeishuService>(FeishuService);
    configService = module.get<ConfigService>(ConfigService);

    // Setup spies
    configGetSpy = jest.spyOn(configService, 'get');
    loggerDebugSpy = jest.spyOn(mockLogger, 'debug');
    loggerLogSpy = jest.spyOn(mockLogger, 'log');
    loggerErrorSpy = jest.spyOn(mockLogger, 'error');

    // Setup default config mocks
    configGetSpy.mockImplementation((key: string, defaultValue?: string) => {
      return mockConfig[key as keyof typeof mockConfig] || defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.clearTokenCache();
  });

  describe('Constructor and Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct HTTP client configuration', () => {
      expect(configGetSpy).toHaveBeenCalledWith(
        'FEISHU_BASE_URL',
        'https://open.feishu.cn',
      );
    });

    it('should create HTTP client with default base URL when config is missing', async () => {
      configGetSpy.mockReturnValue(undefined);

      await Test.createTestingModule({
        providers: [
          FeishuService,
          {
            provide: ConfigService,
            useValue: { get: configGetSpy },
          },
        ],
      }).compile();

      expect(configGetSpy).toHaveBeenCalledWith(
        'FEISHU_BASE_URL',
        'https://open.feishu.cn',
      );
    });

    it('should create HTTP client with custom base URL from config', async () => {
      const customUrl = 'https://custom.feishu.cn';
      configGetSpy.mockReturnValue(customUrl);

      await Test.createTestingModule({
        providers: [
          FeishuService,
          {
            provide: ConfigService,
            useValue: { get: configGetSpy },
          },
        ],
      }).compile();

      expect(configGetSpy).toHaveBeenCalledWith(
        'FEISHU_BASE_URL',
        'https://open.feishu.cn',
      );
    });
  });

  describe('batchCreateRecords - Core Business Logic', () => {
    beforeEach(() => {
      mockAxiosInstance.post.mockResolvedValue({
        data: mockValidTokenResponse,
      });
    });

    it('should successfully batch create records with valid data', async () => {
      // Mock token request
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: { code: 0, msg: 'ok' } });

      const result = await service.batchCreateRecords(mockBatchCreateDto);

      expect(result).toEqual({ success: 1, failed: 0 });
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);

      // Verify token request
      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
        1,
        '/open-apis/auth/v3/tenant_access_token/internal',
        {
          app_id: mockBatchCreateDto.appId,
          app_secret: mockBatchCreateDto.appSecret,
        },
      );

      // Verify batch create request
      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
        2,
        `/open-apis/bitable/v1/apps/${mockBatchCreateDto.appToken}/tables/${mockBatchCreateDto.tableId}/records/batch_create`,
        {
          records: [
            {
              fields: {
                fldXXXXXXXXXXXXXX: '123456', // mapped subjectId
                fldYYYYYYYYYYYYYY: '测试书名', // mapped title
                fldZZZZZZZZZZZZZZ: 8.5, // mapped rating
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${mockValidTokenResponse.data.tenant_access_token}`,
          },
        },
      );
    });

    it('should handle multiple batches correctly', async () => {
      // Create large record set to trigger multiple batches
      const largeRecords: FeishuRecordData[] = Array.from(
        { length: 1200 },
        (_, i) => ({
          subjectId: `book_${i}`,
          title: `测试书名_${i}`,
        }),
      );

      const largeBatchDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: largeRecords,
      };

      // Mock multiple successful batch responses
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValue({ data: { code: 0, msg: 'ok' } });

      const result = await service.batchCreateRecords(largeBatchDto);

      expect(result).toEqual({ success: 1200, failed: 0 });

      // Should have 1 token request + 3 batch requests (500 + 500 + 200)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4);

      // Verify batch processing logs - check if calls contain expected messages
      const logCalls = getAllSpyLogMessages(loggerLogSpy);
      expect(logCalls).toContain(
        'Batch 1/3 processed successfully (500 records)',
      );
      expect(logCalls).toContain(
        'Batch 2/3 processed successfully (500 records)',
      );
      expect(logCalls).toContain(
        'Batch 3/3 processed successfully (200 records)',
      );
    });

    it('should apply API rate limiting delays between batches', async () => {
      const delayedRecords: FeishuRecordData[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          subjectId: `book_${i}`,
        }),
      );

      const delayedBatchDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: delayedRecords,
      };

      // Mock delay function to track calls
      const delaySpy = jest
        .spyOn(service, 'delay' as keyof FeishuService)
        .mockResolvedValue(undefined);

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValue({ data: { code: 0, msg: 'ok' } });

      await service.batchCreateRecords(delayedBatchDto);

      // Should apply delay between batch 1 and batch 2 (1 delay call)
      expect(delaySpy).toHaveBeenCalledTimes(1);
      expect(delaySpy).toHaveBeenCalledWith(1000);

      delaySpy.mockRestore();
    });

    it('should handle partial failures', async () => {
      const multiRecords: FeishuRecordData[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          subjectId: `book_${i}`,
        }),
      );

      const partialFailureDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: multiRecords,
      };

      // Mock token success, first batch success, second batch failure
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: { code: 0, msg: 'ok' } })
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await service.batchCreateRecords(partialFailureDto);

      expect(result).toEqual({ success: 500, failed: 500 });
      const errorCalls = findErrorSpyCall(
        loggerErrorSpy,
        'Batch 2 failed:',
        true,
      );
      expect(errorCalls).toBeDefined();
    });

    it('should transform records using table mapping correctly', async () => {
      const complexRecords: TestRecordData[] = [
        {
          subjectId: '123456',
          title: '复杂书名',
          rating: 9.2,
          publishDate: new Date('2023-01-15'),
          tags: ['小说', '科幻'],
        },
      ];

      const mappingDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: complexRecords as FeishuRecordData[],
        tableMapping: {
          subjectId: 'fldSubjectId',
          title: 'fldTitle',
          rating: 'fldRating',
          publishDate: 'fldPublishDate',
          tags: 'fldTags',
        },
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: { code: 0, msg: 'ok' } });

      await service.batchCreateRecords(mappingDto);

      // Verify correct field mapping and value formatting
      const requestPayload = getBatchCreatePayload(mockAxiosInstance.post, 1);

      expect(requestPayload.records[0].fields).toEqual({
        fldSubjectId: '123456',
        fldTitle: '复杂书名',
        fldRating: 9.2,
        fldPublishDate: Math.floor(new Date('2023-01-15').getTime() / 1000),
        fldTags: ['小说', '科幻'],
      });
    });

    it('should transform records without table mapping correctly', async () => {
      const noMappingDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        tableMapping: undefined,
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: { code: 0, msg: 'ok' } });

      await service.batchCreateRecords(noMappingDto);

      // Verify fields use original keys when no mapping provided
      const requestPayload = getBatchCreatePayload(mockAxiosInstance.post, 1);

      expect(requestPayload.records[0].fields).toEqual({
        subjectId: '123456',
        title: '测试书名',
        rating: 8.5,
      });
    });

    it('should handle different record formats (直接字段 vs fields属性)', async () => {
      const mixedFormatRecords: FeishuRecordData[] = [
        // Direct fields format
        {
          subjectId: '123456',
          title: '直接字段格式',
        },
        // Fields property format
        {
          fields: {
            subjectId: '789012',
            title: 'Fields属性格式',
          },
        },
      ];

      const mixedDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: mixedFormatRecords,
        tableMapping: {
          subjectId: 'fldSubjectId',
          title: 'fldTitle',
        },
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: { code: 0, msg: 'ok' } });

      await service.batchCreateRecords(mixedDto);

      const requestPayload = getBatchCreatePayload(mockAxiosInstance.post, 1);

      expect(requestPayload.records).toHaveLength(2);
      expect(requestPayload.records[0].fields.fldTitle).toBe('直接字段格式');
      expect(requestPayload.records[1].fields.fldTitle).toBe('Fields属性格式');
    });

    it('should format field values correctly (strings, numbers, dates, arrays)', async () => {
      const complexValueRecords: TestRecordData[] = [
        {
          stringField: '字符串值',
          numberField: 42,
          booleanField: true,
          dateField: new Date('2023-12-25'),
          arrayField: ['值1', '值2'],
          nullField: null,
          undefinedField: undefined,
          objectField: { nested: 'object' },
        },
      ];

      const complexDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: complexValueRecords as FeishuRecordData[],
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: { code: 0, msg: 'ok' } });

      await service.batchCreateRecords(complexDto);

      const requestPayload = getBatchCreatePayload(mockAxiosInstance.post, 1);
      const fields = requestPayload.records[0].fields;

      expect(fields.stringField).toBe('字符串值');
      expect(fields.numberField).toBe(42);
      expect(fields.booleanField).toBe('true'); // formatFieldValue converts to string
      expect(fields.dateField).toBe(
        Math.floor(new Date('2023-12-25').getTime() / 1000),
      );
      expect(fields.arrayField).toEqual(['值1', '值2']);
      expect(fields.nullField).toBeNull();
      expect(fields.undefinedField).toBeNull();
      expect(fields.objectField).toBe('{"nested":"object"}');
    });

    it('should handle null/undefined field values correctly', async () => {
      const nullValueRecords: TestRecordData[] = [
        {
          validField: '有效值',
          nullField: null,
          undefinedField: undefined,
        },
      ];

      const nullDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: nullValueRecords as FeishuRecordData[],
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: { code: 0, msg: 'ok' } });

      await service.batchCreateRecords(nullDto);

      const requestPayload = getBatchCreatePayload(mockAxiosInstance.post, 1);
      const fields = requestPayload.records[0].fields;

      expect(fields.validField).toBe('有效值');
      expect(fields.nullField).toBeNull();
      expect(fields.undefinedField).toBeNull();
    });

    it('should throw error when getAccessToken fails', async () => {
      const tokenErrorResponse = {
        code: 99991663,
        msg: 'app access token invalid',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: tokenErrorResponse,
      });

      await expect(
        service.batchCreateRecords(mockBatchCreateDto),
      ).rejects.toThrow('Failed to get access token: app access token invalid');

      const errorCalls = findErrorSpyCallWithPattern(
        loggerErrorSpy,
        `Failed to get access token for app ${mockBatchCreateDto.appId}:`,
        true,
      );
      expect(errorCalls).toBeDefined();
    });

    it('should handle empty records array', async () => {
      const emptyDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: [],
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });

      const result = await service.batchCreateRecords(emptyDto);

      expect(result).toEqual({ success: 0, failed: 0 });
      // Should only call token API, no batch create calls
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should process exactly 500 records per batch', async () => {
      const exactBatchRecords: FeishuRecordData[] = Array.from(
        { length: 1500 },
        (_, i) => ({
          subjectId: `book_${i}`,
        }),
      );

      const exactBatchDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        records: exactBatchRecords,
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValue({ data: { code: 0, msg: 'ok' } });

      await service.batchCreateRecords(exactBatchDto);

      // 1 token + 3 batch calls (500 + 500 + 500)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(4);

      // Verify each batch has exactly 500 records except the last
      const batch1Payload = getBatchCreatePayload(mockAxiosInstance.post, 1);
      const batch2Payload = getBatchCreatePayload(mockAxiosInstance.post, 2);
      const batch3Payload = getBatchCreatePayload(mockAxiosInstance.post, 3);

      expect(batch1Payload.records).toHaveLength(500);
      expect(batch2Payload.records).toHaveLength(500);
      expect(batch3Payload.records).toHaveLength(500);
    });
  });

  describe('getTableFields - Table Metadata', () => {
    const getFieldsParams = {
      appId: 'test_app_id',
      appSecret: 'test_app_secret',
      appToken: 'test_app_token',
      tableId: 'test_table_id',
    };

    it('should successfully get table fields', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      const result = await service.getTableFields(
        getFieldsParams.appId,
        getFieldsParams.appSecret,
        getFieldsParams.appToken,
        getFieldsParams.tableId,
      );

      expect(result).toEqual(mockValidTableFieldsResponse.data.items);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        `/open-apis/bitable/v1/apps/${getFieldsParams.appToken}/tables/${getFieldsParams.tableId}/fields`,
        {
          headers: {
            Authorization: `Bearer ${mockValidTokenResponse.data.tenant_access_token}`,
          },
        },
      );
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        code: 1001,
        msg: 'Invalid table ID',
        data: null,
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({ data: errorResponse });

      await expect(
        service.getTableFields(
          getFieldsParams.appId,
          getFieldsParams.appSecret,
          getFieldsParams.appToken,
          getFieldsParams.tableId,
        ),
      ).rejects.toThrow('Failed to get table fields: Invalid table ID');

      const errorCalls = findErrorSpyCall(
        loggerErrorSpy,
        'Failed to get table fields:',
        true,
      );
      expect(errorCalls).toBeDefined();
    });

    it('should use cached token when available', async () => {
      // First call to populate cache
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        getFieldsParams.appId,
        getFieldsParams.appSecret,
        getFieldsParams.appToken,
        getFieldsParams.tableId,
      );

      // Second call should use cached token
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        getFieldsParams.appId,
        getFieldsParams.appSecret,
        getFieldsParams.appToken,
        getFieldsParams.tableId,
      );

      // Should only have 1 token request for both calls
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error when token acquisition fails', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Network timeout'),
      );

      await expect(
        service.getTableFields(
          getFieldsParams.appId,
          getFieldsParams.appSecret,
          getFieldsParams.appToken,
          getFieldsParams.tableId,
        ),
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('findRecordBySubjectId - Record Search', () => {
    const searchParams = {
      appId: 'test_app_id',
      appSecret: 'test_app_secret',
      appToken: 'test_app_token',
      tableId: 'test_table_id',
      subjectId: '123456',
      subjectIdFieldId: 'fldSubjectId',
    };

    it('should successfully find records by subject ID', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: mockValidRecordsResponse });

      const result = await service.findRecordBySubjectId(
        searchParams.appId,
        searchParams.appSecret,
        searchParams.appToken,
        searchParams.tableId,
        searchParams.subjectId,
        searchParams.subjectIdFieldId,
      );

      expect(result).toEqual(mockValidRecordsResponse.data.items);

      // Verify search request structure
      expect(mockAxiosInstance.post).toHaveBeenNthCalledWith(
        2,
        `/open-apis/bitable/v1/apps/${searchParams.appToken}/tables/${searchParams.tableId}/records/search`,
        {
          filter: {
            conditions: [
              {
                field_id: searchParams.subjectIdFieldId,
                operator: 'is',
                value: searchParams.subjectId,
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${mockValidTokenResponse.data.tenant_access_token}`,
          },
        },
      );
    });

    it('should handle empty search results', async () => {
      const emptyResponse: FeishuApiResponse<FeishuRecordsResponse> = {
        code: 0,
        msg: 'ok',
        data: {
          has_more: false,
          total: 0,
          items: [],
        },
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: emptyResponse });

      const result = await service.findRecordBySubjectId(
        searchParams.appId,
        searchParams.appSecret,
        searchParams.appToken,
        searchParams.tableId,
        searchParams.subjectId,
        searchParams.subjectIdFieldId,
      );

      expect(result).toEqual([]);
    });

    it('should construct correct search filter', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: mockValidRecordsResponse });

      await service.findRecordBySubjectId(
        'custom_app_id',
        'custom_secret',
        'custom_app_token',
        'custom_table_id',
        'custom_subject_id',
        'custom_field_id',
      );

      const searchPayload = getSearchPayload(mockAxiosInstance.post, 1);

      expect(searchPayload.filter.conditions[0]).toEqual({
        field_id: 'custom_field_id',
        operator: 'is',
        value: 'custom_subject_id',
      });
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        code: 2001,
        msg: 'Record not found',
        data: null,
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: errorResponse });

      await expect(
        service.findRecordBySubjectId(
          searchParams.appId,
          searchParams.appSecret,
          searchParams.appToken,
          searchParams.tableId,
          searchParams.subjectId,
          searchParams.subjectIdFieldId,
        ),
      ).rejects.toThrow('Failed to search records: Record not found');

      const errorCalls = findErrorSpyCall(
        loggerErrorSpy,
        'Failed to search records:',
        true,
      );
      expect(errorCalls).toBeDefined();
    });
  });

  describe('updateRecord - Record Updates', () => {
    const updateParams = {
      appId: 'test_app_id',
      appSecret: 'test_app_secret',
      appToken: 'test_app_token',
      tableId: 'test_table_id',
      recordId: 'test_record_id',
      fields: {
        fldTitle: '更新后的标题',
        fldRating: 9.5,
      },
    };

    it('should successfully update a record', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.put.mockResolvedValueOnce({
        data: { code: 0, msg: 'ok' },
      });

      await service.updateRecord(
        updateParams.appId,
        updateParams.appSecret,
        updateParams.appToken,
        updateParams.tableId,
        updateParams.recordId,
        updateParams.fields,
      );

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        `/open-apis/bitable/v1/apps/${updateParams.appToken}/tables/${updateParams.tableId}/records/${updateParams.recordId}`,
        { fields: updateParams.fields },
        {
          headers: {
            Authorization: `Bearer ${mockValidTokenResponse.data.tenant_access_token}`,
          },
        },
      );
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        code: 3001,
        msg: 'Permission denied',
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.put.mockResolvedValueOnce({ data: errorResponse });

      await expect(
        service.updateRecord(
          updateParams.appId,
          updateParams.appSecret,
          updateParams.appToken,
          updateParams.tableId,
          updateParams.recordId,
          updateParams.fields,
        ),
      ).rejects.toThrow('Failed to update record: Permission denied');

      const errorCalls = findErrorSpyCall(
        loggerErrorSpy,
        'Failed to update record:',
        true,
      );
      expect(errorCalls).toBeDefined();
    });

    it('should use correct authorization header', async () => {
      const customToken = 'custom_access_token';
      const customTokenResponse: FeishuApiResponse<FeishuTokenResponse> = {
        code: 0,
        msg: 'ok',
        data: {
          code: 0,
          msg: 'ok',
          tenant_access_token: customToken,
          expire: 7199,
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: customTokenResponse,
      });
      mockAxiosInstance.put.mockResolvedValueOnce({
        data: { code: 0, msg: 'ok' },
      });

      await service.updateRecord(
        updateParams.appId,
        updateParams.appSecret,
        updateParams.appToken,
        updateParams.tableId,
        updateParams.recordId,
        updateParams.fields,
      );

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        {
          headers: {
            Authorization: `Bearer ${customToken}`,
          },
        },
      );
    });
  });

  describe('Token Management - Private Methods via Public Interface', () => {
    it('should cache access token correctly', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      const debugCalls = getAllSpyLogMessages(loggerDebugSpy);
      expect(debugCalls).toContain('Access token obtained for app app_id');
    });

    it('should return cached token when valid (cache hit)', async () => {
      // First call populates cache
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Second call should use cache
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Only one token request should have been made
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should refresh token when expired (cache miss)', async () => {
      // Mock time to simulate token expiration
      const realDateNow = Date.now;
      Date.now = jest.fn(() => 1000000000); // Initial time

      // First call populates cache
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Simulate time passage to expire token (beyond 5-minute buffer)
      Date.now = jest.fn(() => 1000000000 + (7199 + 1) * 1000);

      // Second call should refresh token
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Should have made 2 token requests
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);

      Date.now = realDateNow;
    });

    it('should handle token API failures', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Token API failed'),
      );

      await expect(
        service.getTableFields('app_id', 'app_secret', 'app_token', 'table_id'),
      ).rejects.toThrow('Token API failed');

      // Check for specific error message in any call
      const tokenErrorCalls = findErrorSpyCall(
        loggerErrorSpy,
        'Failed to get access token for app app_id:',
        true,
      );
      expect(tokenErrorCalls).toBeDefined();
    });

    it('should apply 5-minute buffer to token expiration', async () => {
      const realDateNow = Date.now;
      const mockTime = 1000000000;
      Date.now = jest.fn(() => mockTime);

      // First call - populates cache
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Simulate time passage to just before 5-minute buffer expires
      // Token expires in 7199 seconds, with 5-minute (300 second) buffer
      // Cache check: expiresAt > Date.now() + 300000
      // expiresAt = mockTime + (7199-300)*1000 = mockTime + 6899000
      // We want: 6899000 > currentTime + 300000, so currentTime < 6599000
      Date.now = jest.fn(() => mockTime + 6500 * 1000); // Should still be valid

      // Second call - should still use cached token
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });
      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Should only have made 1 token request (still using cached)
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);

      // Now simulate time passage past the 5-minute buffer
      // We want: 6899000 <= currentTime + 300000, so currentTime >= 6599000
      Date.now = jest.fn(() => mockTime + 6700 * 1000); // Past the buffer

      // Third call - should refresh token
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Should have made 2 token requests now
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);

      Date.now = realDateNow;
    });
  });

  describe('clearTokenCache - Cache Management', () => {
    it('should clear all cached tokens', async () => {
      // Populate cache first
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Clear cache
      service.clearTokenCache();

      // Next call should require new token
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockValidTokenResponse,
      });
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: mockValidTableFieldsResponse,
      });

      await service.getTableFields(
        'app_id',
        'app_secret',
        'app_token',
        'table_id',
      );

      // Should have made 2 token requests total
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(2);
    });

    it('should log cache clearing event', () => {
      service.clearTokenCache();

      const logCalls = getAllSpyLogMessages(loggerLogSpy);
      expect(logCalls).toContain('Token cache cleared');
    });
  });

  describe('Batch Processing Utilities', () => {
    it('should create correct batch sizes', () => {
      const largeArray = Array.from({ length: 1300 }, (_, i) => i);
      const batches = service['createBatches'](largeArray, 500);

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(500);
      expect(batches[1]).toHaveLength(500);
      expect(batches[2]).toHaveLength(300);
    });

    it('should handle arrays smaller than batch size', () => {
      const smallArray = [1, 2, 3];
      const batches = service['createBatches'](smallArray, 500);

      expect(batches).toHaveLength(1);
      expect(batches[0]).toHaveLength(3);
      expect(batches[0]).toEqual([1, 2, 3]);
    });

    it('should handle empty arrays', () => {
      const emptyArray: number[] = [];
      const batches = service['createBatches'](emptyArray, 500);

      expect(batches).toHaveLength(0);
    });

    it('should handle delay function', async () => {
      // Use fake timers for this test
      jest.useFakeTimers();

      const delayPromise = service['delay'](100);

      // Fast-forward time
      jest.advanceTimersByTime(100);

      await delayPromise;

      jest.useRealTimers();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      mockAxiosInstance.post.mockRejectedValueOnce(timeoutError);

      await expect(
        service.batchCreateRecords(mockBatchCreateDto),
      ).rejects.toThrow('Request timeout');

      const errorCalls = loggerErrorSpy.mock.calls.find((call) => {
        const typedCall = call as LoggerCallArgs;
        return (
          typedCall[0] === 'Batch create records failed:' &&
          typedCall[1] === timeoutError
        );
      }) as LoggerCallArgs | undefined;
      expect(errorCalls).toBeDefined();
    });

    it('should handle malformed API responses', async () => {
      const malformedResponse = {
        data: {
          code: 0,
          msg: 'ok',
          // Missing 'data' property
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce(malformedResponse);

      await expect(
        service.batchCreateRecords(mockBatchCreateDto),
      ).rejects.toThrow();
    });

    it('should handle invalid field mapping', async () => {
      const invalidMappingDto: BatchCreateRecordsDto = {
        ...mockBatchCreateDto,
        // @ts-expect-error - Intentionally passing null to test robustness against invalid mapping
        tableMapping: null,
      };

      mockAxiosInstance.post
        .mockResolvedValueOnce({ data: mockValidTokenResponse })
        .mockResolvedValueOnce({ data: { code: 0, msg: 'ok' } });

      const result = await service.batchCreateRecords(invalidMappingDto);

      expect(result).toEqual({ success: 1, failed: 0 });
    });

    it('should log errors appropriately', async () => {
      const networkError = new Error('Network connectivity lost');
      mockAxiosInstance.post.mockRejectedValueOnce(networkError);

      await expect(
        service.getTableFields('app_id', 'app_secret', 'app_token', 'table_id'),
      ).rejects.toThrow('Network connectivity lost');

      const errorCalls = loggerErrorSpy.mock.calls.find((call) => {
        const typedCall = call as LoggerCallArgs;
        return (
          typedCall[0] === 'Failed to get access token for app app_id:' &&
          typedCall[1] === networkError
        );
      }) as LoggerCallArgs | undefined;
      expect(errorCalls).toBeDefined();
    });
  });
});
