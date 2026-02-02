/**
 * 测试用卡片数据
 * @module tests/fixtures/cards
 */

import type { CardInfo, BaseCardInfo, CardMetadata } from '@/types/card';

/**
 * 创建基础卡片元数据
 */
export function createCardMetadata(overrides?: Partial<CardMetadata>): CardMetadata {
  return {
    created_at: '2024-01-01T00:00:00.000Z',
    modified_at: '2024-01-01T00:00:00.000Z',
    version: '1.0.0',
    tags: [],
    ...overrides
  };
}

/**
 * 创建基础卡片信息
 */
export function createBaseCardInfo(overrides?: Partial<BaseCardInfo>): BaseCardInfo {
  return {
    id: 'base-card-1',
    pluginType: 'video',
    resourceFields: [
      {
        name: 'video_file',
        type: 'file',
        required: true,
        allowedTypes: ['mp4', 'mkv', 'avi']
      },
      {
        name: 'cover_image',
        type: 'file',
        required: false,
        allowedTypes: ['jpg', 'png']
      }
    ],
    ...overrides
  };
}

/**
 * 创建卡片信息
 */
export function createCardInfo(overrides?: Partial<CardInfo>): CardInfo {
  return {
    id: 'card-1',
    name: '测试卡片',
    type: 'video',
    path: '/path/to/card-1.chips',
    description: '这是一张测试卡片',
    baseCards: [createBaseCardInfo()],
    resourceMode: 'empty',
    metadata: createCardMetadata(),
    ...overrides
  };
}

/**
 * 视频卡片列表
 */
export const mockVideoCards: CardInfo[] = [
  createCardInfo({
    id: 'video-001',
    name: '视频001 - 第一集',
    type: 'video',
    path: '/cards/video-001.chips'
  }),
  createCardInfo({
    id: 'video-002',
    name: '视频002 - 第二集',
    type: 'video',
    path: '/cards/video-002.chips'
  }),
  createCardInfo({
    id: 'video-003',
    name: '视频003 - 第三集',
    type: 'video',
    path: '/cards/video-003.chips'
  })
];

/**
 * 音频卡片列表
 */
export const mockAudioCards: CardInfo[] = [
  createCardInfo({
    id: 'audio-001',
    name: '歌曲01',
    type: 'audio',
    path: '/cards/audio-001.chips',
    baseCards: [
      createBaseCardInfo({
        id: 'base-audio-1',
        pluginType: 'audio',
        resourceFields: [
          { name: 'audio_file', type: 'file', required: true, allowedTypes: ['mp3', 'flac'] },
          { name: 'cover_image', type: 'file', required: false, allowedTypes: ['jpg', 'png'] }
        ]
      })
    ]
  }),
  createCardInfo({
    id: 'audio-002',
    name: '歌曲02',
    type: 'audio',
    path: '/cards/audio-002.chips',
    baseCards: [
      createBaseCardInfo({
        id: 'base-audio-2',
        pluginType: 'audio',
        resourceFields: [
          { name: 'audio_file', type: 'file', required: true, allowedTypes: ['mp3', 'flac'] }
        ]
      })
    ]
  })
];

/**
 * 图片卡片列表
 */
export const mockImageCards: CardInfo[] = [
  createCardInfo({
    id: 'image-001',
    name: '图片A',
    type: 'image',
    path: '/cards/image-001.chips',
    baseCards: [
      createBaseCardInfo({
        id: 'base-image-1',
        pluginType: 'image',
        resourceFields: [
          { name: 'image_file', type: 'file', required: true, allowedTypes: ['jpg', 'png', 'webp'] }
        ]
      })
    ]
  })
];

/**
 * 带已绑定资源的卡片
 */
export const mockBoundCard: CardInfo = createCardInfo({
  id: 'bound-card-001',
  name: '已绑定卡片',
  type: 'video',
  resourceMode: 'full',
  baseCards: [
    createBaseCardInfo({
      resourceFields: [
        {
          name: 'video_file',
          type: 'file',
          required: true,
          value: '/resources/existing-video.mp4',
          allowedTypes: ['mp4', 'mkv']
        }
      ]
    })
  ]
});

/**
 * 部分绑定的卡片
 */
export const mockPartialBoundCard: CardInfo = createCardInfo({
  id: 'partial-card-001',
  name: '部分绑定卡片',
  type: 'video',
  resourceMode: 'semi',
  baseCards: [
    createBaseCardInfo({
      resourceFields: [
        {
          name: 'video_file',
          type: 'file',
          required: true,
          value: '/resources/video.mp4',
          allowedTypes: ['mp4', 'mkv']
        },
        {
          name: 'subtitle_file',
          type: 'file',
          required: false,
          allowedTypes: ['srt', 'ass']
        }
      ]
    })
  ]
});

/**
 * 混合卡片列表（用于测试筛选）
 */
export const mockMixedCards: CardInfo[] = [
  ...mockVideoCards,
  ...mockAudioCards,
  ...mockImageCards
];

/**
 * 空卡片列表
 */
export const mockEmptyCards: CardInfo[] = [];

/**
 * 用于测试数字匹配的卡片
 */
export const mockNumberedCards: CardInfo[] = [
  createCardInfo({ id: 'ep-01', name: 'Episode 01' }),
  createCardInfo({ id: 'ep-02', name: 'Episode 02' }),
  createCardInfo({ id: 'ep-10', name: 'Episode 10' }),
  createCardInfo({ id: 'ep-100', name: 'Episode 100' })
];
