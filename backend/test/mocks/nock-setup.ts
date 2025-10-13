/**
 * Nock HTTP拦截器设置
 * 用于Mock模式下拦截豆瓣和飞书API请求
 */

import nock from 'nock';
import {
  mockDoubanBookListHTML,
  mockDoubanBookDetailHTML,
  mockFeishuTokenResponse,
  mockFeishuBatchCreateResponse,
  mockFeishuListRecordsResponse,
} from './douban-mock-data';

/**
 * 设置所有nock拦截器
 */
export function setupAllMockInterceptors(): void {
  console.log('🔧 [Mock] 开始设置nock HTTP拦截器...');

  const useMockDouban = process.env.USE_MOCK_DOUBAN === 'true';
  const useMockFeishu = process.env.USE_MOCK_FEISHU === 'true';

  // [DEBUG] 启用nock调试日志
  if (process.env.IS_E2E_TEST === 'true') {
    // 监听未匹配的请求
    nock.emitter.on('no match', (req) => {
      console.log(`❌ [Nock Debug] 未拦截的请求: ${req.method} ${req.protocol}//${req.host}${req.path}`);
    });
  }

  if (useMockDouban) {
    setupDoubanMocks();
    console.log('✅ [Mock] 豆瓣API拦截器已设置');
  } else {
    console.log('ℹ️  [Mock] 豆瓣API使用真实请求');
  }

  if (useMockFeishu) {
    setupFeishuMocks();
    console.log('✅ [Mock] 飞书API拦截器已设置');
  } else {
    console.log('ℹ️  [Mock] 飞书API使用真实请求');
  }
}

/**
 * 设置豆瓣API Mock拦截器
 */
function setupDoubanMocks(): void {
  // 拦截书籍列表页（读过）
  nock('https://book.douban.com')
    .get(/\/people\/\d+\/collect/)
    .query(true) // 匹配所有查询参数
    .times(10) // 允许最多10次请求
    .reply(200, mockDoubanBookListHTML, {
      'Content-Type': 'text/html; charset=utf-8',
    });

  // 拦截书籍详情页
  nock('https://book.douban.com')
    .get(/\/subject\/\d+\//)
    .times(10)
    .reply(200, mockDoubanBookDetailHTML, {
      'Content-Type': 'text/html; charset=utf-8',
    });

  // 拦截豆瓣电影列表页
  nock('https://movie.douban.com')
    .get(/\/people\/\d+\/collect/)
    .query(true)
    .times(10)
    .reply(200, '<html><body>暂无电影数据</body></html>', {
      'Content-Type': 'text/html; charset=utf-8',
    });
}

/**
 * 设置飞书API Mock拦截器
 */
function setupFeishuMocks(): void {
  // 拦截获取tenant_access_token
  nock('https://open.feishu.cn')
    .post('/open-apis/auth/v3/tenant_access_token/internal')
    .times(50)
    .reply(200, mockFeishuTokenResponse);

  // 拦截批量创建记录
  nock('https://open.feishu.cn')
    .post(/\/open-apis\/bitable\/v1\/apps\/[^/]+\/tables\/[^/]+\/records\/batch_create/)
    .times(50)
    .reply(200, mockFeishuBatchCreateResponse);

  // 拦截查询记录列表
  nock('https://open.feishu.cn')
    .post(/\/open-apis\/bitable\/v1\/apps\/[^/]+\/tables\/[^/]+\/records\/search/)
    .times(50)
    .reply(200, mockFeishuListRecordsResponse);

  // 拦截创建单条记录
  nock('https://open.feishu.cn')
    .post(/\/open-apis\/bitable\/v1\/apps\/[^/]+\/tables\/[^/]+\/records/)
    .times(50)
    .reply(200, mockFeishuBatchCreateResponse);

  // 拦截更新记录
  nock('https://open.feishu.cn')
    .put(/\/open-apis\/bitable\/v1\/apps\/[^/]+\/tables\/[^/]+\/records\/[^/]+/)
    .times(50)
    .reply(200, { code: 0, msg: 'success', data: {} });

  // 拦截删除记录
  nock('https://open.feishu.cn')
    .delete(/\/open-apis\/bitable\/v1\/apps\/[^/]+\/tables\/[^/]+\/records\/[^/]+/)
    .times(50)
    .reply(200, { code: 0, msg: 'success', data: {} });

  // 拦截获取表格字段 - 完整的书籍16字段
  nock('https://open.feishu.cn')
    .get(/\/open-apis\/bitable\/v1\/apps\/[^/]+\/tables\/[^/]+\/fields/)
    .query(true)
    .times(50)
    .reply(200, {
      code: 0,
      msg: 'success',
      data: {
        items: [
          { field_id: 'fld001', field_name: 'Subject ID', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld002', field_name: '我的标签', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld003', field_name: '我的状态', type: 3, ui_type: 'SingleSelect', is_primary: false, property: { options: [] } },
          { field_id: 'fld004', field_name: '书名', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld005', field_name: '副标题', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld006', field_name: '豆瓣评分', type: 2, ui_type: 'Number', is_primary: false, property: null },
          { field_id: 'fld007', field_name: '作者', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld008', field_name: '我的备注', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld009', field_name: '内容简介', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld010', field_name: '封面图', type: 15, ui_type: 'Url', is_primary: false, property: null },
          { field_id: 'fld011', field_name: '我的评分', type: 2, ui_type: 'Rating', is_primary: false, property: { rating: { symbol: 'star' } } },
          { field_id: 'fld012', field_name: '原作名', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld013', field_name: '译者', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld014', field_name: '出版年份', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld015', field_name: '出版社', type: 1, ui_type: 'Text', is_primary: false, property: null },
          { field_id: 'fld016', field_name: '标记日期', type: 5, ui_type: 'DateTime', is_primary: false, property: null },
        ],
        total: 16,
        has_more: false,
      },
    });

  // 拦截创建表格字段（单个）
  nock('https://open.feishu.cn')
    .post(/\/open-apis\/bitable\/v1\/apps\/[^/]+\/tables\/[^/]+\/fields/)
    .times(100) // 自动字段创建可能需要创建多个字段
    .reply(200, (uri, requestBody: any) => {
      // 动态生成field_id
      const fieldName = requestBody.field_name || 'Unknown Field';
      const fieldId = `fldMock${Date.now()}`;
      return {
        code: 0,
        msg: 'success',
        data: {
          field: {
            field_id: fieldId,
            field_name: fieldName,
            type: requestBody.type || 1,
            ui_type: requestBody.ui_type || 'Text',
            is_primary: false,
            property: requestBody.property || null,
          },
        },
      };
    });

  // 拦截批量创建表格字段
  nock('https://open.feishu.cn')
    .post(/\/open-apis\/bitable\/v1\/apps\/[^/]+\/tables\/[^/]+\/fields\/batch_create/)
    .times(50)
    .reply(200, (uri, requestBody: any) => {
      const fields = (requestBody.fields || []).map((field: any, index: number) => ({
        field_id: `fldMockBatch${Date.now()}_${index}`,
        field_name: field.field_name || 'Unknown Field',
        type: field.type || 1,
        ui_type: field.ui_type || 'Text',
        is_primary: false,
        property: field.property || null,
      }));
      return {
        code: 0,
        msg: 'success',
        data: {
          fields,
        },
      };
    });
}

/**
 * 清理所有nock拦截器
 */
export function cleanupMockInterceptors(): void {
  nock.cleanAll();
  console.log('🧹 [Mock] 所有nock拦截器已清理');
}
