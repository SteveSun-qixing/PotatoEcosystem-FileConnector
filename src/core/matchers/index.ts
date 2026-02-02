/**
 * 匹配器模块入口
 * @module core/matchers
 */

// 基础接口和类
export { IMatcher, BaseMatcher } from './BaseMatcher';

// 匹配器实现
export { NumberSequenceMatcher } from './NumberSequenceMatcher';
export { KeywordMatcher } from './KeywordMatcher';
export { FileOrderMatcher } from './FileOrderMatcher';

// 方案生成器
export { SchemeGenerator } from './SchemeGenerator';

// 智能匹配器
export { SmartMatcher, createSmartMatcher } from './SmartMatcher';
