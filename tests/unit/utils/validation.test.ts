/**
 * 验证工具函数测试
 * @module tests/unit/utils/validation
 */

import { describe, it, expect } from 'vitest';
import {
  validateBinding,
  validateBindings,
  isPathSafe,
  validateExtension
} from '@/utils/validation';
import {
  createBindingItem,
  mockValidBindings,
  mockInvalidBindingNoCardId,
  mockInvalidBindingNoFilePath,
  mockInvalidBindingNoResourceField,
  mockCompletelyInvalidBinding,
  mockBindingWithSpaces
} from '../../fixtures';

describe('验证工具函数', () => {
  // ===== validateBinding 测试 =====
  describe('validateBinding', () => {
    it('有效的绑定应该通过验证', () => {
      const binding = createBindingItem({
        cardId: 'card-1',
        filePath: '/files/video.mp4',
        resourceField: 'video_file'
      });

      const result = validateBinding(binding);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('缺少卡片ID应该返回错误', () => {
      const result = validateBinding(mockInvalidBindingNoCardId);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_CARD_ID');
      expect(result.errors[0].field).toBe('cardId');
    });

    it('缺少文件路径应该返回错误', () => {
      const result = validateBinding(mockInvalidBindingNoFilePath);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_FILE_PATH');
      expect(result.errors[0].field).toBe('filePath');
    });

    it('缺少资源字段应该返回错误', () => {
      const result = validateBinding(mockInvalidBindingNoResourceField);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('INVALID_RESOURCE_FIELD');
      expect(result.errors[0].field).toBe('resourceField');
    });

    it('完全无效的绑定应该返回多个错误', () => {
      const result = validateBinding(mockCompletelyInvalidBinding);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);

      const errorCodes = result.errors.map((e) => e.code);
      expect(errorCodes).toContain('INVALID_CARD_ID');
      expect(errorCodes).toContain('INVALID_FILE_PATH');
      expect(errorCodes).toContain('INVALID_RESOURCE_FIELD');
    });

    it('空格字符串应该被视为空', () => {
      const result = validateBinding(mockBindingWithSpaces);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('应该接受任意有效的卡片ID格式', () => {
      const testCases = [
        'simple-id',
        'card_001',
        'uuid-1234-5678',
        '中文ID',
        'id-with.dots'
      ];

      for (const cardId of testCases) {
        const binding = createBindingItem({ cardId });
        const result = validateBinding(binding);
        expect(result.errors.find((e) => e.field === 'cardId')).toBeUndefined();
      }
    });

    it('应该接受各种文件路径格式', () => {
      const testCases = [
        '/absolute/path/file.mp4',
        'relative/path/file.mp4',
        'C:\\Windows\\path\\file.mp4',
        '/path/with spaces/file.mp4',
        '/文件夹/文件.mp4'
      ];

      for (const filePath of testCases) {
        const binding = createBindingItem({ filePath });
        const result = validateBinding(binding);
        expect(result.errors.find((e) => e.field === 'filePath')).toBeUndefined();
      }
    });
  });

  // ===== validateBindings 测试 =====
  describe('validateBindings', () => {
    it('应该验证绑定列表中的所有项', () => {
      const results = validateBindings(mockValidBindings);

      expect(results).toHaveLength(mockValidBindings.length);
      results.forEach((result) => {
        expect(result.valid).toBe(true);
      });
    });

    it('空列表应该返回空结果', () => {
      const results = validateBindings([]);

      expect(results).toHaveLength(0);
    });

    it('应该分别验证每个绑定', () => {
      const mixedBindings = [
        createBindingItem({ cardId: 'valid-1' }),
        createBindingItem({ cardId: '' }), // 无效
        createBindingItem({ cardId: 'valid-2' })
      ];

      const results = validateBindings(mixedBindings);

      expect(results).toHaveLength(3);
      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
    });

    it('应该保持结果顺序与输入顺序一致', () => {
      const bindings = [
        createBindingItem({ cardId: 'card-1' }),
        createBindingItem({ cardId: '' }),
        createBindingItem({ cardId: 'card-3' })
      ];

      const results = validateBindings(bindings);

      expect(results[0].valid).toBe(true);
      expect(results[1].valid).toBe(false);
      expect(results[2].valid).toBe(true);
    });
  });

  // ===== isPathSafe 测试 =====
  describe('isPathSafe', () => {
    it('正常路径应该是安全的', () => {
      const safePaths = [
        '/home/user/files/video.mp4',
        '/var/data/documents',
        'relative/path/to/file.txt',
        'C:\\Users\\test\\file.mp4',
        '/path/with spaces/file.mp4'
      ];

      safePaths.forEach((path) => {
        expect(isPathSafe(path)).toBe(true);
      });
    });

    it('包含 .. 的路径应该不安全', () => {
      const unsafePaths = [
        '../../../etc/passwd',
        '/home/user/../../../etc/passwd',
        'files/../../../secret',
        '..\\..\\Windows\\System32'
      ];

      unsafePaths.forEach((path) => {
        expect(isPathSafe(path)).toBe(false);
      });
    });

    it('应该处理混合斜杠', () => {
      // 带有 .. 的混合路径不安全
      expect(isPathSafe('path\\..\\other')).toBe(false);
      expect(isPathSafe('path/../other')).toBe(false);
    });

    it('应该允许绝对路径', () => {
      expect(isPathSafe('/absolute/path/file.mp4')).toBe(true);
      expect(isPathSafe('C:\\absolute\\path\\file.mp4')).toBe(true);
    });

    it('应该允许相对路径', () => {
      expect(isPathSafe('relative/path/file.mp4')).toBe(true);
      expect(isPathSafe('./current/file.mp4')).toBe(true);
    });

    it('应该处理空路径', () => {
      expect(isPathSafe('')).toBe(true);
    });

    it('包含..作为文件名一部分的路径应该根据实际情况判断', () => {
      // 这些包含 .. 但是是路径遍历
      expect(isPathSafe('file..name.txt')).toBe(false); // 包含 ..
      expect(isPathSafe('/path/to..file')).toBe(false); // 包含 ..
    });
  });

  // ===== validateExtension 测试 =====
  describe('validateExtension', () => {
    it('允许的扩展名应该通过验证', () => {
      expect(validateExtension('video.mp4', ['mp4', 'mkv', 'avi'])).toBe(true);
      expect(validateExtension('audio.mp3', ['mp3', 'wav', 'flac'])).toBe(true);
      expect(validateExtension('image.jpg', ['jpg', 'png', 'gif'])).toBe(true);
    });

    it('不允许的扩展名应该验证失败', () => {
      expect(validateExtension('video.mp4', ['mkv', 'avi'])).toBe(false);
      expect(validateExtension('audio.mp3', ['wav', 'flac'])).toBe(false);
      expect(validateExtension('document.exe', ['pdf', 'doc'])).toBe(false);
    });

    it('应该是大小写不敏感的', () => {
      expect(validateExtension('video.MP4', ['mp4'])).toBe(true);
      expect(validateExtension('video.Mp4', ['mp4'])).toBe(true);
      expect(validateExtension('VIDEO.MP4', ['mp4'])).toBe(true);
    });

    it('应该处理没有扩展名的文件', () => {
      expect(validateExtension('README', ['txt', 'md'])).toBe(false);
      expect(validateExtension('Makefile', ['txt'])).toBe(false);
    });

    it('应该处理空的允许列表', () => {
      expect(validateExtension('file.mp4', [])).toBe(false);
    });

    it('应该处理多个点的文件名', () => {
      expect(validateExtension('file.name.mp4', ['mp4'])).toBe(true);
      expect(validateExtension('archive.tar.gz', ['gz'])).toBe(true);
    });

    it('应该处理隐藏文件', () => {
      expect(validateExtension('.gitignore', ['gitignore'])).toBe(true);
      expect(validateExtension('.env.local', ['local'])).toBe(true);
    });

    it('应该处理空白扩展名', () => {
      expect(validateExtension('file.', [''])).toBe(true);
    });
  });
});
