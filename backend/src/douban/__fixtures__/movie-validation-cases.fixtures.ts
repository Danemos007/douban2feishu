/**
 * 电影字段验证测试固件
 *
 * 基于 sync-all-movies-fixed.ts 实战验证经验提取
 * 用于自动化测试关键电影的字段解析正确性
 */

export interface MovieValidationCase {
  /** 豆瓣电影ID */
  subjectId: string;
  /** 电影标题 */
  title: string;
  /** 验证规则 */
  validations: {
    /** 片长验证规则 */
    duration?: {
      /** 期望包含的内容 */
      shouldContain?: string[];
      /** 期望的格式类型 */
      format?: 'standard' | 'complex' | 'multi-version';
      /** 具体验证函数 */
      validator?: (duration: string) => boolean;
    };
    /** 上映日期验证规则 */
    releaseDate?: {
      /** 期望包含的内容 */
      shouldContain?: string[];
      /** 是否应该有多地区信息 */
      shouldHaveMultipleRegions?: boolean;
      /** 具体验证函数 */
      validator?: (releaseDate: string) => boolean;
    };
    /** 制片地区验证规则 */
    country?: {
      /** 期望包含的内容 */
      shouldContain?: string[];
      /** 具体验证函数 */
      validator?: (country: string) => boolean;
    };
    /** 语言验证规则 */
    language?: {
      /** 期望包含的内容 */
      shouldContain?: string[];
      /** 具体验证函数 */
      validator?: (language: string) => boolean;
    };
  };
  /** 验证描述 */
  description: string;
}

/**
 * 🎯 关键电影验证用例
 * 基于实战调试经验，这些电影在字段解析上有特殊的挑战
 */
export const KEY_MOVIE_VALIDATION_CASES: MovieValidationCase[] = [
  {
    subjectId: '26766869',
    title: '鹬 Piper',
    description: '短片，片长格式为"分+秒"的特殊格式，测试复杂片长解析',
    validations: {
      duration: {
        shouldContain: ['6分03秒'],
        format: 'complex',
        validator: (duration: string) =>
          !!(duration && duration.includes('6分03秒')),
      },
    },
  },
  {
    subjectId: '4739952',
    title: '初恋这件小事',
    description: '多版本片长和多地区上映日期，测试复杂信息保留',
    validations: {
      duration: {
        shouldContain: ['118分钟', '100分钟'],
        format: 'multi-version',
        validator: (duration: string) =>
          !!(
            duration &&
            duration.includes('118分钟') &&
            duration.includes('100分钟')
          ),
      },
      releaseDate: {
        shouldHaveMultipleRegions: true,
        validator: (releaseDate: string) =>
          !!(releaseDate && releaseDate.includes('/')),
      },
    },
  },
  {
    subjectId: '3742360',
    title: '让子弹飞',
    description: '上映日期包含地区标识，测试地区信息保留',
    validations: {
      releaseDate: {
        shouldContain: ['(中国大陆)'],
        validator: (releaseDate: string) =>
          !!(releaseDate && releaseDate.includes('(中国大陆)')),
      },
    },
  },
  {
    subjectId: '36491177',
    title: '坂本龙一：杰作',
    description: '多地区上映日期，测试复杂日期信息的完整保留',
    validations: {
      releaseDate: {
        shouldHaveMultipleRegions: true,
        validator: (releaseDate: string) =>
          !!(
            releaseDate &&
            releaseDate.includes('/') &&
            releaseDate.split('/').length >= 3
          ),
      },
    },
  },
];

/**
 * 🎯 关键电影ID列表
 * 用于选择性处理的电影ID集合
 */
export const KEY_MOVIE_IDS = KEY_MOVIE_VALIDATION_CASES.map(
  (movie) => movie.subjectId,
);

/**
 * 根据电影ID获取验证用例
 */
export function getValidationCaseBySubjectId(
  subjectId: string,
): MovieValidationCase | undefined {
  return KEY_MOVIE_VALIDATION_CASES.find(
    (movie) => movie.subjectId === subjectId,
  );
}

/**
 * 检查是否为关键电影
 */
export function isKeyMovie(subjectId: string): boolean {
  return KEY_MOVIE_IDS.includes(subjectId);
}

/**
 * 验证电影字段解析结果
 */
export interface FieldValidationResult {
  fieldName: string;
  passed: boolean;
  actualValue: string;
  expectedCriteria: string;
  errorMessage?: string;
}

/**
 * 电影字段验证所需的最小数据接口
 * 只包含验证函数实际需要访问的字段
 * 使用宽松但类型安全的设计，兼容各种数据源
 */
interface ValidationMovieData {
  /** 豆瓣电影ID - 必需字段，用于匹配验证用例 */
  subjectId: string;
  /** 片长 - 可选字段，用于片长验证 */
  duration?: unknown;
  /** 上映日期 - 可选字段，用于上映日期验证 */
  releaseDate?: unknown;
  /** 制片地区 - 可选字段，用于制片地区验证 */
  country?: unknown;
  /** 语言 - 可选字段，用于语言验证 */
  language?: unknown;
}

/**
 * 执行电影字段验证
 */
export function validateMovieFields(
  movie: ValidationMovieData,
): FieldValidationResult[] {
  const validationCase = getValidationCaseBySubjectId(movie.subjectId);
  if (!validationCase) {
    return [];
  }

  const results: FieldValidationResult[] = [];

  // 验证片长
  if (validationCase.validations.duration) {
    const durationValidation = validationCase.validations.duration;
    const durationValue =
      typeof movie.duration === 'string' ? movie.duration : undefined;
    const passed =
      durationValidation.validator && durationValue
        ? durationValidation.validator(durationValue)
        : true;

    results.push({
      fieldName: 'duration',
      passed,
      actualValue: durationValue || 'null',
      expectedCriteria:
        durationValidation.shouldContain?.join(' & ') || 'custom validator',
      errorMessage: passed
        ? undefined
        : `Duration validation failed for ${validationCase.title}`,
    });
  }

  // 验证上映日期
  if (validationCase.validations.releaseDate) {
    const releaseDateValidation = validationCase.validations.releaseDate;
    const releaseDateValue =
      typeof movie.releaseDate === 'string' ? movie.releaseDate : undefined;
    const passed =
      releaseDateValidation.validator && releaseDateValue
        ? releaseDateValidation.validator(releaseDateValue)
        : true;

    results.push({
      fieldName: 'releaseDate',
      passed,
      actualValue: releaseDateValue || 'null',
      expectedCriteria:
        releaseDateValidation.shouldContain?.join(' & ') ||
        (releaseDateValidation.shouldHaveMultipleRegions
          ? 'multiple regions'
          : 'custom validator'),
      errorMessage: passed
        ? undefined
        : `ReleaseDate validation failed for ${validationCase.title}`,
    });
  }

  // 验证制片地区
  if (validationCase.validations.country) {
    const countryValidation = validationCase.validations.country;
    const countryValue =
      typeof movie.country === 'string' ? movie.country : undefined;
    const passed =
      countryValidation.validator && countryValue
        ? countryValidation.validator(countryValue)
        : true;

    results.push({
      fieldName: 'country',
      passed,
      actualValue: countryValue || 'null',
      expectedCriteria:
        countryValidation.shouldContain?.join(' & ') || 'custom validator',
      errorMessage: passed
        ? undefined
        : `Country validation failed for ${validationCase.title}`,
    });
  }

  // 验证语言
  if (validationCase.validations.language) {
    const languageValidation = validationCase.validations.language;
    const languageValue =
      typeof movie.language === 'string' ? movie.language : undefined;
    const passed =
      languageValidation.validator && languageValue
        ? languageValidation.validator(languageValue)
        : true;

    results.push({
      fieldName: 'language',
      passed,
      actualValue: languageValue || 'null',
      expectedCriteria:
        languageValidation.shouldContain?.join(' & ') || 'custom validator',
      errorMessage: passed
        ? undefined
        : `Language validation failed for ${validationCase.title}`,
    });
  }

  return results;
}
