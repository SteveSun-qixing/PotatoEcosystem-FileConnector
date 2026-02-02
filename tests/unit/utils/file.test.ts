/**
 * 文件工具函数测试
 * @module tests/unit/utils/file
 */

import { describe, it, expect } from 'vitest';
import {
  getExtension,
  getFileType,
  formatSize,
  matchesType,
  uniqueName,
  getFileName,
  getDirPath
} from '@/utils/file';

describe('文件工具函数', () => {
  // ===== getExtension 测试 =====
  describe('getExtension', () => {
    it('应该返回正确的扩展名', () => {
      expect(getExtension('video.mp4')).toBe('mp4');
      expect(getExtension('document.PDF')).toBe('pdf'); // 应转为小写
      expect(getExtension('image.JPEG')).toBe('jpeg');
    });

    it('应该处理没有扩展名的文件', () => {
      expect(getExtension('filename')).toBe('');
      expect(getExtension('README')).toBe('');
    });

    it('应该处理多个点的文件名', () => {
      expect(getExtension('file.name.ext.mp4')).toBe('mp4');
      expect(getExtension('video.2024.01.01.mkv')).toBe('mkv');
    });

    it('应该处理以点结尾的文件名', () => {
      expect(getExtension('filename.')).toBe('');
    });

    it('应该处理隐藏文件（以点开头）', () => {
      expect(getExtension('.gitignore')).toBe('gitignore');
      expect(getExtension('.env.local')).toBe('local');
    });

    it('应该处理空字符串', () => {
      expect(getExtension('')).toBe('');
    });
  });

  // ===== getFileType 测试 =====
  describe('getFileType', () => {
    describe('视频类型', () => {
      it.each([
        ['video.mp4', 'video'],
        ['video.mkv', 'video'],
        ['video.avi', 'video'],
        ['video.mov', 'video'],
        ['video.webm', 'video'],
        ['video.flv', 'video'],
        ['video.wmv', 'video'],
        ['video.m4v', 'video']
      ])('%s 应该返回 %s', (filename, expected) => {
        expect(getFileType(filename)).toBe(expected);
      });
    });

    describe('音频类型', () => {
      it.each([
        ['audio.mp3', 'audio'],
        ['audio.wav', 'audio'],
        ['audio.flac', 'audio'],
        ['audio.aac', 'audio'],
        ['audio.ogg', 'audio'],
        ['audio.m4a', 'audio'],
        ['audio.wma', 'audio']
      ])('%s 应该返回 %s', (filename, expected) => {
        expect(getFileType(filename)).toBe(expected);
      });
    });

    describe('图片类型', () => {
      it.each([
        ['image.jpg', 'image'],
        ['image.jpeg', 'image'],
        ['image.png', 'image'],
        ['image.gif', 'image'],
        ['image.webp', 'image'],
        ['image.svg', 'image'],
        ['image.bmp', 'image'],
        ['image.ico', 'image']
      ])('%s 应该返回 %s', (filename, expected) => {
        expect(getFileType(filename)).toBe(expected);
      });
    });

    describe('文档类型', () => {
      it.each([
        ['doc.pdf', 'document'],
        ['doc.doc', 'document'],
        ['doc.docx', 'document'],
        ['doc.xls', 'document'],
        ['doc.xlsx', 'document'],
        ['doc.ppt', 'document'],
        ['doc.pptx', 'document'],
        ['doc.txt', 'document'],
        ['doc.md', 'document']
      ])('%s 应该返回 %s', (filename, expected) => {
        expect(getFileType(filename)).toBe(expected);
      });
    });

    describe('字幕类型', () => {
      it.each([
        ['sub.srt', 'subtitle'],
        ['sub.ass', 'subtitle'],
        ['sub.ssa', 'subtitle'],
        ['sub.vtt', 'subtitle']
      ])('%s 应该返回 %s', (filename, expected) => {
        expect(getFileType(filename)).toBe(expected);
      });
    });

    describe('压缩包类型', () => {
      it.each([
        ['archive.zip', 'archive'],
        ['archive.rar', 'archive'],
        ['archive.7z', 'archive'],
        ['archive.tar', 'archive'],
        ['archive.gz', 'archive']
      ])('%s 应该返回 %s', (filename, expected) => {
        expect(getFileType(filename)).toBe(expected);
      });
    });

    describe('其他类型', () => {
      it('未知扩展名应该返回 other', () => {
        expect(getFileType('file.xyz')).toBe('other');
        expect(getFileType('file.unknown')).toBe('other');
        expect(getFileType('file')).toBe('other');
      });
    });
  });

  // ===== formatSize 测试 =====
  describe('formatSize', () => {
    it('应该正确格式化字节', () => {
      expect(formatSize(0)).toBe('0 B');
      expect(formatSize(100)).toBe('100 B');
      expect(formatSize(1023)).toBe('1023 B');
    });

    it('应该正确格式化KB', () => {
      expect(formatSize(1024)).toBe('1 KB');
      expect(formatSize(1024 * 10)).toBe('10 KB');
      expect(formatSize(1024 * 1.5)).toBe('1.5 KB');
    });

    it('应该正确格式化MB', () => {
      expect(formatSize(1024 * 1024)).toBe('1 MB');
      expect(formatSize(1024 * 1024 * 5)).toBe('5 MB');
      expect(formatSize(1024 * 1024 * 100)).toBe('100 MB');
    });

    it('应该正确格式化GB', () => {
      expect(formatSize(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatSize(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('应该正确格式化TB', () => {
      expect(formatSize(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });

    it('应该支持自定义小数位数', () => {
      expect(formatSize(1024 * 1.234, 0)).toBe('1 KB');
      expect(formatSize(1024 * 1.234, 1)).toBe('1.2 KB');
      expect(formatSize(1024 * 1.234, 3)).toBe('1.234 KB');
    });

    it('应该处理负数小数位数', () => {
      expect(formatSize(1024 * 1.9, -1)).toBe('2 KB');
    });
  });

  // ===== matchesType 测试 =====
  describe('matchesType', () => {
    it('应该匹配单一类型', () => {
      expect(matchesType('video.mp4', ['video'])).toBe(true);
      expect(matchesType('audio.mp3', ['audio'])).toBe(true);
      expect(matchesType('image.jpg', ['image'])).toBe(true);
    });

    it('应该匹配多种类型', () => {
      expect(matchesType('video.mp4', ['video', 'audio'])).toBe(true);
      expect(matchesType('audio.mp3', ['video', 'audio'])).toBe(true);
    });

    it('类型不匹配时应该返回false', () => {
      expect(matchesType('video.mp4', ['audio'])).toBe(false);
      expect(matchesType('doc.pdf', ['video', 'audio'])).toBe(false);
    });

    it('应该处理空类型数组', () => {
      expect(matchesType('video.mp4', [])).toBe(false);
    });

    it('应该处理other类型', () => {
      expect(matchesType('file.xyz', ['other'])).toBe(true);
    });
  });

  // ===== uniqueName 测试 =====
  describe('uniqueName', () => {
    it('原始名称不存在时应该返回原始名称', () => {
      expect(uniqueName('video.mp4', [])).toBe('video.mp4');
      expect(uniqueName('video.mp4', ['other.mp4'])).toBe('video.mp4');
    });

    it('名称冲突时应该添加数字后缀', () => {
      expect(uniqueName('video.mp4', ['video.mp4'])).toBe('video_1.mp4');
      expect(uniqueName('video.mp4', ['video.mp4', 'video_1.mp4'])).toBe('video_2.mp4');
    });

    it('应该处理多个冲突', () => {
      const existing = ['file.mp4', 'file_1.mp4', 'file_2.mp4', 'file_3.mp4'];
      expect(uniqueName('file.mp4', existing)).toBe('file_4.mp4');
    });

    it('应该处理没有扩展名的文件', () => {
      expect(uniqueName('README', ['README'])).toBe('README_1');
      expect(uniqueName('Makefile', ['Makefile', 'Makefile_1'])).toBe('Makefile_2');
    });

    it('应该处理复杂的文件名', () => {
      expect(uniqueName('file.name.ext.mp4', ['file.name.ext.mp4'])).toBe('file.name.ext_1.mp4');
    });
  });

  // ===== getFileName 测试 =====
  describe('getFileName', () => {
    it('应该从Unix路径提取文件名', () => {
      expect(getFileName('/path/to/file.mp4')).toBe('file.mp4');
      expect(getFileName('/a/b/c/d/video.mkv')).toBe('video.mkv');
    });

    it('应该从Windows路径提取文件名', () => {
      expect(getFileName('C:\\Users\\test\\file.mp4')).toBe('file.mp4');
      expect(getFileName('D:\\Videos\\video.mkv')).toBe('video.mkv');
    });

    it('应该处理只有文件名的情况', () => {
      expect(getFileName('file.mp4')).toBe('file.mp4');
    });

    it('应该处理以斜杠结尾的路径', () => {
      expect(getFileName('/path/to/')).toBe('');
    });

    it('应该处理根路径', () => {
      expect(getFileName('/')).toBe('');
    });

    it('应该处理带空格的路径', () => {
      expect(getFileName('/path/with spaces/file name.mp4')).toBe('file name.mp4');
    });

    it('应该处理中文路径', () => {
      expect(getFileName('/文件夹/视频文件.mp4')).toBe('视频文件.mp4');
    });
  });

  // ===== getDirPath 测试 =====
  describe('getDirPath', () => {
    it('应该从Unix路径提取目录', () => {
      expect(getDirPath('/path/to/file.mp4')).toBe('/path/to');
      expect(getDirPath('/a/b/c/d/video.mkv')).toBe('/a/b/c/d');
    });

    it('应该从Windows路径提取目录', () => {
      expect(getDirPath('C:\\Users\\test\\file.mp4')).toBe('C:/Users/test');
      expect(getDirPath('D:\\Videos\\video.mkv')).toBe('D:/Videos');
    });

    it('应该处理只有文件名的情况', () => {
      expect(getDirPath('file.mp4')).toBe('');
    });

    it('应该处理根路径下的文件', () => {
      expect(getDirPath('/file.mp4')).toBe('');
    });

    it('应该处理深层路径', () => {
      expect(getDirPath('/a/b/c/d/e/f/g/file.mp4')).toBe('/a/b/c/d/e/f/g');
    });

    it('应该处理带空格的路径', () => {
      expect(getDirPath('/path/with spaces/file.mp4')).toBe('/path/with spaces');
    });
  });
});
