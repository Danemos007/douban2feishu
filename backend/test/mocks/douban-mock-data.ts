/**
 * 豆瓣Mock数据
 * 用于E2E测试的nock拦截器
 */

/**
 * Mock豆瓣书籍列表HTML（包含2本书）
 */
export const mockDoubanBookListHTML = `
<!DOCTYPE html>
<html>
<head><title>我读 (豆瓣)</title></head>
<body>
<div class="info">
  <ul>
    <li class="subject-item">
      <div class="pic">
        <a href="https://book.douban.com/subject/1084336/">
          <img src="https://img9.doubanio.com/view/subject/s/public/s1103152.jpg" alt="测试书籍1"/>
        </a>
      </div>
      <div class="info">
        <h2>
          <a href="https://book.douban.com/subject/1084336/">测试书籍1</a>
        </h2>
        <div class="pub">作者测试1 / 测试出版社 / 2020-01-01</div>
        <div class="date"><span class="date">2023-05-15</span></div>
        <div><span class="rating5-t"></span></div>
      </div>
    </li>
    <li class="subject-item">
      <div class="pic">
        <a href="https://book.douban.com/subject/123456/">
          <img src="https://img9.doubanio.com/view/subject/s/public/s123456.jpg" alt="测试书籍2"/>
        </a>
      </div>
      <div class="info">
        <h2>
          <a href="https://book.douban.com/subject/123456/">测试书籍2</a>
        </h2>
        <div class="pub">作者测试2 / 测试出版社2 / 2021-06-01</div>
        <div class="date"><span class="date">2023-06-20</span></div>
        <div><span class="rating4-t"></span></div>
      </div>
    </li>
  </ul>
</div>
<div class="paginator">
  <span class="next"><a href="?start=15&amp;sort=time&amp;rating=all&amp;filter=all&amp;mode=grid">后页&gt;</a></span>
</div>
</body>
</html>
`;

/**
 * Mock豆瓣书籍详情页HTML
 */
export const mockDoubanBookDetailHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>测试书籍1 (豆瓣)</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Book",
    "name": "测试书籍1",
    "author": [{"@type": "Person", "name": "作者测试1"}],
    "datePublished": "2020-01-01",
    "publisher": {"@type": "Organization", "name": "测试出版社"},
    "isbn": "9787111111111",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "8.5",
      "ratingCount": "1000"
    }
  }
  </script>
</head>
<body>
<div id="wrapper">
  <h1><span property="v:itemreviewed">测试书籍1</span></h1>
  <div id="info">
    <span class="pl">作者:</span> <a href="">作者测试1</a><br/>
    <span class="pl">出版社:</span> 测试出版社<br/>
    <span class="pl">出版年:</span> 2020-01-01<br/>
    <span class="pl">页数:</span> 300<br/>
    <span class="pl">ISBN:</span> 9787111111111<br/>
  </div>
  <div id="link-report">
    <div class="intro">
      <p>这是一本测试书籍的简介内容。</p>
    </div>
  </div>
</div>
</body>
</html>
`;

/**
 * Mock飞书Token响应
 */
export const mockFeishuTokenResponse = {
  code: 0,
  msg: 'success',
  tenant_access_token: 'mock-tenant-access-token-123456',
  expire: 7200,
};

/**
 * Mock飞书创建记录响应
 */
export const mockFeishuCreateRecordResponse = {
  code: 0,
  msg: 'success',
  data: {
    record: {
      record_id: 'recMockId123',
      fields: {
        'Subject ID': '1084336',
        '书名': '测试书籍1',
        '作者': '作者测试1',
        '豆瓣评分': 8.5,
      },
    },
  },
};

/**
 * Mock飞书批量创建记录响应
 */
export const mockFeishuBatchCreateResponse = {
  code: 0,
  msg: 'success',
  data: {
    records: [
      {
        record_id: 'recMockId123',
        fields: {},
      },
      {
        record_id: 'recMockId456',
        fields: {},
      },
    ],
  },
};

/**
 * Mock飞书查询记录响应
 *
 * ✅ 基于真实API响应格式 (2025-09-02事实核查)
 * 参考：src/feishu/contract/__fixtures__/records-response.json
 *
 * 飞书API真实返回格式：
 * - Text字段: [{ text: "value", type: "text" }]
 * - URL字段: { link: "url", text: "text", type: "url" }
 * - SingleSelect字段: "选项名"
 * - Number/Rating字段: 数字
 * - DateTime字段: 时间戳（毫秒）
 */
export const mockFeishuListRecordsResponse = {
  code: 0,
  msg: 'success',
  data: {
    has_more: false,
    items: [
      {
        record_id: 'recMockId123',
        fields: {
          'Subject ID': [{ text: '1084336', type: 'text' }],
          '我的标签': [{ text: '编程', type: 'text' }],
          '我的状态': '读过',
          '书名': [{ text: '测试书籍1', type: 'text' }],
          '副标题': [{ text: '', type: 'text' }],
          '豆瓣评分': 8.5,
          '作者': [{ text: '作者测试1', type: 'text' }],
          '我的备注': [{ text: '', type: 'text' }],
          '内容简介': [{ text: '这是一本测试书籍的简介内容。', type: 'text' }],
          '封面图': {
            link: 'https://img9.doubanio.com/view/subject/s/public/s1103152.jpg',
            text: 'https://img9.doubanio.com/view/subject/s/public/s1103152.jpg',
            type: 'url',
          },
          '我的评分': 5,
          '原作名': [{ text: '', type: 'text' }],
          '译者': [{ text: '', type: 'text' }],
          '出版年份': [{ text: '2020-01-01', type: 'text' }],
          '出版社': [{ text: '测试出版社', type: 'text' }],
          '标记日期': 1684108800000,
        },
      },
      {
        record_id: 'recMockId456',
        fields: {
          'Subject ID': [{ text: '123456', type: 'text' }],
          '我的标签': [{ text: '科技', type: 'text' }],
          '我的状态': '读过',
          '书名': [{ text: '测试书籍2', type: 'text' }],
          '副标题': [{ text: '', type: 'text' }],
          '豆瓣评分': 7.8,
          '作者': [{ text: '作者测试2', type: 'text' }],
          '我的备注': [{ text: '', type: 'text' }],
          '内容简介': [{ text: '这是第二本测试书籍的简介。', type: 'text' }],
          '封面图': {
            link: 'https://img9.doubanio.com/view/subject/s/public/s123456.jpg',
            text: 'https://img9.doubanio.com/view/subject/s/public/s123456.jpg',
            type: 'url',
          },
          '我的评分': 4,
          '原作名': [{ text: '', type: 'text' }],
          '译者': [{ text: '', type: 'text' }],
          '出版年份': [{ text: '2021-06-01', type: 'text' }],
          '出版社': [{ text: '测试出版社2', type: 'text' }],
          '标记日期': 1687219200000,
        },
      },
    ],
  },
};
