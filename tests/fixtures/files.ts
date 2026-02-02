/**
 * 测试用文件数据
 * @module tests/fixtures/files
 */

import type { FileInfo, FileType } from '@/types/file';

/**
 * 创建文件信息
 */
export function createFileInfo(overrides?: Partial<FileInfo>): FileInfo {
  return {
    name: 'test-file.mp4',
    path: '/files/test-file.mp4',
    size: 1024 * 1024 * 100, // 100MB
    mimeType: 'video/mp4',
    type: 'video',
    extension: 'mp4',
    modifiedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides
  };
}

/**
 * 视频文件列表
 */
export const mockVideoFiles: FileInfo[] = [
  createFileInfo({
    name: 'video001.mp4',
    path: '/files/video001.mp4',
    size: 1024 * 1024 * 500, // 500MB
    mimeType: 'video/mp4',
    type: 'video',
    extension: 'mp4'
  }),
  createFileInfo({
    name: 'video002.mkv',
    path: '/files/video002.mkv',
    size: 1024 * 1024 * 800, // 800MB
    mimeType: 'video/x-matroska',
    type: 'video',
    extension: 'mkv'
  }),
  createFileInfo({
    name: 'video003.avi',
    path: '/files/video003.avi',
    size: 1024 * 1024 * 600, // 600MB
    mimeType: 'video/x-msvideo',
    type: 'video',
    extension: 'avi'
  })
];

/**
 * 音频文件列表
 */
export const mockAudioFiles: FileInfo[] = [
  createFileInfo({
    name: 'song01.mp3',
    path: '/files/song01.mp3',
    size: 1024 * 1024 * 5, // 5MB
    mimeType: 'audio/mpeg',
    type: 'audio',
    extension: 'mp3'
  }),
  createFileInfo({
    name: 'song02.flac',
    path: '/files/song02.flac',
    size: 1024 * 1024 * 30, // 30MB
    mimeType: 'audio/flac',
    type: 'audio',
    extension: 'flac'
  })
];

/**
 * 图片文件列表
 */
export const mockImageFiles: FileInfo[] = [
  createFileInfo({
    name: 'cover01.jpg',
    path: '/files/cover01.jpg',
    size: 1024 * 500, // 500KB
    mimeType: 'image/jpeg',
    type: 'image',
    extension: 'jpg'
  }),
  createFileInfo({
    name: 'cover02.png',
    path: '/files/cover02.png',
    size: 1024 * 1024, // 1MB
    mimeType: 'image/png',
    type: 'image',
    extension: 'png'
  }),
  createFileInfo({
    name: 'logo.webp',
    path: '/files/logo.webp',
    size: 1024 * 100, // 100KB
    mimeType: 'image/webp',
    type: 'image',
    extension: 'webp'
  })
];

/**
 * 文档文件列表
 */
export const mockDocumentFiles: FileInfo[] = [
  createFileInfo({
    name: 'readme.pdf',
    path: '/files/readme.pdf',
    size: 1024 * 1024 * 2, // 2MB
    mimeType: 'application/pdf',
    type: 'document',
    extension: 'pdf'
  }),
  createFileInfo({
    name: 'notes.txt',
    path: '/files/notes.txt',
    size: 1024, // 1KB
    mimeType: 'text/plain',
    type: 'document',
    extension: 'txt'
  })
];

/**
 * 字幕文件列表
 */
export const mockSubtitleFiles: FileInfo[] = [
  createFileInfo({
    name: 'video001.srt',
    path: '/files/video001.srt',
    size: 1024 * 50, // 50KB
    mimeType: 'application/x-subrip',
    type: 'subtitle',
    extension: 'srt'
  }),
  createFileInfo({
    name: 'video002.ass',
    path: '/files/video002.ass',
    size: 1024 * 100, // 100KB
    mimeType: 'text/x-ass',
    type: 'subtitle',
    extension: 'ass'
  })
];

/**
 * 混合文件列表
 */
export const mockMixedFiles: FileInfo[] = [
  ...mockVideoFiles,
  ...mockAudioFiles,
  ...mockImageFiles,
  ...mockDocumentFiles,
  ...mockSubtitleFiles
];

/**
 * 空文件列表
 */
export const mockEmptyFiles: FileInfo[] = [];

/**
 * 带编号的文件列表（用于测试数字匹配）
 */
export const mockNumberedFiles: FileInfo[] = [
  createFileInfo({ name: 'ep01.mp4', path: '/files/ep01.mp4' }),
  createFileInfo({ name: 'ep02.mp4', path: '/files/ep02.mp4' }),
  createFileInfo({ name: 'ep10.mp4', path: '/files/ep10.mp4' }),
  createFileInfo({ name: 'ep100.mp4', path: '/files/ep100.mp4' })
];

/**
 * 带复杂命名的文件列表（用于测试智能匹配）
 */
export const mockComplexNamedFiles: FileInfo[] = [
  createFileInfo({
    name: '[字幕组] 动漫名 第01话 标题.mp4',
    path: '/files/[字幕组] 动漫名 第01话 标题.mp4'
  }),
  createFileInfo({
    name: 'Movie.2024.1080p.BluRay.x264.mp4',
    path: '/files/Movie.2024.1080p.BluRay.x264.mp4'
  }),
  createFileInfo({
    name: 'S01E05 - Episode Title.mkv',
    path: '/files/S01E05 - Episode Title.mkv'
  })
];

/**
 * 特殊路径的文件（用于测试路径处理）
 */
export const mockSpecialPathFiles: FileInfo[] = [
  createFileInfo({
    name: 'file with spaces.mp4',
    path: '/files/path with spaces/file with spaces.mp4'
  }),
  createFileInfo({
    name: '中文文件名.mp4',
    path: '/文件夹/中文文件名.mp4'
  }),
  createFileInfo({
    name: 'deep-file.mp4',
    path: '/a/b/c/d/e/deep-file.mp4'
  })
];

/**
 * Windows 风格路径的文件
 */
export const mockWindowsPathFiles: FileInfo[] = [
  createFileInfo({
    name: 'video.mp4',
    path: 'C:\\Users\\test\\videos\\video.mp4'
  }),
  createFileInfo({
    name: 'audio.mp3',
    path: 'D:\\Music\\audio.mp3'
  })
];

/**
 * 不同大小的文件（用于测试格式化）
 */
export const mockVariousSizeFiles: FileInfo[] = [
  createFileInfo({ name: 'tiny.txt', size: 100 }), // 100 B
  createFileInfo({ name: 'small.txt', size: 1024 }), // 1 KB
  createFileInfo({ name: 'medium.mp3', size: 1024 * 1024 }), // 1 MB
  createFileInfo({ name: 'large.mp4', size: 1024 * 1024 * 1024 }), // 1 GB
  createFileInfo({ name: 'huge.iso', size: 1024 * 1024 * 1024 * 5 }), // 5 GB
  createFileInfo({ name: 'zero.tmp', size: 0 }) // 0 B
];

/**
 * 各种扩展名的文件（用于测试类型检测）
 */
export const mockExtensionTestFiles: FileInfo[] = [
  // 视频
  createFileInfo({ name: 'video.mp4', extension: 'mp4', type: 'video' }),
  createFileInfo({ name: 'video.mkv', extension: 'mkv', type: 'video' }),
  createFileInfo({ name: 'video.avi', extension: 'avi', type: 'video' }),
  createFileInfo({ name: 'video.webm', extension: 'webm', type: 'video' }),
  // 音频
  createFileInfo({ name: 'audio.mp3', extension: 'mp3', type: 'audio' }),
  createFileInfo({ name: 'audio.wav', extension: 'wav', type: 'audio' }),
  createFileInfo({ name: 'audio.flac', extension: 'flac', type: 'audio' }),
  // 图片
  createFileInfo({ name: 'image.jpg', extension: 'jpg', type: 'image' }),
  createFileInfo({ name: 'image.jpeg', extension: 'jpeg', type: 'image' }),
  createFileInfo({ name: 'image.png', extension: 'png', type: 'image' }),
  createFileInfo({ name: 'image.gif', extension: 'gif', type: 'image' }),
  // 文档
  createFileInfo({ name: 'doc.pdf', extension: 'pdf', type: 'document' }),
  createFileInfo({ name: 'doc.docx', extension: 'docx', type: 'document' }),
  createFileInfo({ name: 'doc.txt', extension: 'txt', type: 'document' }),
  // 字幕
  createFileInfo({ name: 'sub.srt', extension: 'srt', type: 'subtitle' }),
  createFileInfo({ name: 'sub.ass', extension: 'ass', type: 'subtitle' }),
  // 未知
  createFileInfo({ name: 'unknown.xyz', extension: 'xyz', type: 'other' })
];
