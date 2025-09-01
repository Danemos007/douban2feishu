/**
 * 飞书字段类型判断工具函数
 * 
 * 职责：
 * - 基于字段名语义判断字段类型
 * - 区分Rating字段和Number字段
 * - 支持中英文字段名识别
 */

import { FeishuFieldType } from '../interfaces/feishu.interface';

/**
 * 判断是否为评分字段类型（Rating类型，非Number类型）
 * [CRITICAL-FIX] 精确区分Rating和Number字段
 * 
 * 关键区别：
 * - "豆瓣评分" → Number类型 (0.0-10.0数字显示)
 * - "我的评分" → Rating类型 (1-5星星显示)
 * 
 * 飞书API说明：
 * - Rating和Number都使用type=2
 * - 通过ui_type区分："Rating" vs "Number"
 * - 因此必须基于字段名语义进行准确判断
 */
export function isRatingFieldType(fieldName: string, fieldType: FeishuFieldType): boolean {
  // 明确的Rating类型字段名（仅限用户评分相关）
  const ratingFieldNames = [
    '我的评分', '个人评分', '用户评分', '我给的评分',
    'myrating', 'userrating', 'personalrating', 'myrate'
  ];
  
  // 明确排除的Number类型字段名（官方评分等）
  const numberFieldNames = [
    '豆瓣评分', '平均评分', '官方评分', '网站评分',
    'doubanrating', 'averagerating', 'officialrating', 'siterating'
  ];
  
  const lowerFieldName = fieldName.toLowerCase();
  
  // 1. 优先排除：如果是明确的Number字段，直接返回false
  const isNumberField = numberFieldNames.some(name => 
    fieldName.includes(name) || lowerFieldName.includes(name.toLowerCase())
  );
  
  if (isNumberField) {
    return false;
  }
  
  // 2. 精确匹配：如果是明确的Rating字段，返回true
  const isRatingField = ratingFieldNames.some(name => 
    fieldName.includes(name) || lowerFieldName.includes(name.toLowerCase())
  );
  
  return isRatingField;
}