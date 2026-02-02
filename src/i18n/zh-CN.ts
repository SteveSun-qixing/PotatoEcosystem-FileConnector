/**
 * 中文语言包
 */
export default {
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    remove: '移除',
    clear: '清空',
    select: '选择',
    selectAll: '全选',
    search: '搜索',
    filter: '筛选',
    sort: '排序',
    refresh: '刷新',
    loading: '加载中...',
    success: '成功',
    failed: '失败',
    error: '错误',
    warning: '警告',
    info: '提示',
    close: '关闭',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    finish: '完成',
    retry: '重试',
    skip: '跳过',
    abort: '中止'
  },
  connector: {
    title: '文件连接器',
    description: '批量绑定外部资源到卡片'
  },
  mode: {
    manual: '手动连接',
    auto: '自动识别',
    smart: '智能识别',
    convert: '模式转换'
  },
  manual: {
    title: '手动连接',
    tableMode: '表格模式',
    graphMode: '图形模式',
    selectCards: '选择卡片',
    selectFiles: '选择文件',
    addFiles: '添加文件',
    clearBindings: '清空绑定',
    batchFolder: '批量设置文件夹',
    dragHint: '拖拽文件到此处',
    connectHint: '点击卡片再点击文件创建连接',
    clearConnections: '清空连线',
    deleteSelected: '删除选中',
    autoArrange: '自动排列',
    fitToView: '适应视图',
    resetView: '重置视图',
    zoomIn: '放大',
    zoomOut: '缩小',
    importConfig: '导入配置',
    exportConfig: '导出配置',
    graphHint: '滚轮缩放 · 右键/中键拖拽平移 · Delete删除选中'
  },
  auto: {
    title: '自动识别',
    numberMatch: '数字序列匹配',
    keywordMatch: '关键词匹配',
    orderMatch: '文件顺序匹配',
    generateSchemes: '生成匹配方案',
    selectScheme: '选择方案',
    applyScheme: '应用方案',
    confidence: '置信度',
    noScheme: '未生成匹配方案'
  },
  smart: {
    title: '智能识别',
    analyzing: '正在分析...',
    highConfidence: '高置信度',
    mediumConfidence: '中置信度',
    lowConfidence: '低置信度',
    unmatched: '未匹配',
    fallbackMode: '降级模式（AI服务不可用）',
    confirmBinding: '确认绑定'
  },
  binding: {
    preview: '绑定预览',
    execute: '执行绑定',
    progress: '执行进度',
    result: '执行结果',
    bound: '已绑定',
    unbound: '未绑定',
    new: '新增',
    modified: '修改',
    deleted: '删除'
  },
  fileSelector: {
    selectFile: '选择文件...',
    browse: '浏览',
    dropHere: '释放以选择文件',
    invalidType: '不支持的文件类型'
  },
  bindingTable: {
    cardColumn: '卡片',
    fileColumn: '绑定文件',
    statusColumn: '状态',
    actionsColumn: '操作',
    batchRemove: '批量删除',
    clearAll: '清空全部',
    showingCount: '显示 {count}/{total}'
  },
  convert: {
    title: '模式转换',
    toFull: '转为全填充',
    toEmpty: '转为空壳',
    selectTarget: '选择目标路径',
    spaceRequired: '所需空间',
    spaceAvailable: '可用空间',
    converting: '转换中...'
  },
  status: {
    cardsSelected: '已选择 {count} 个卡片',
    filesSelected: '已选择 {count} 个文件',
    bindingCount: '已绑定 {bound}/{total}'
  },
  card: {
    type: {
      video: '视频',
      audio: '音频',
      image: '图片',
      document: '文档',
      text: '文本',
      custom: '自定义'
    },
    filter: {
      all: '全部'
    },
    sort: {
      name: '名称',
      status: '状态'
    },
    empty: {
      noCards: '暂无卡片',
      noMatch: '没有匹配的卡片'
    }
  },
  file: {
    type: {
      video: '视频',
      audio: '音频',
      image: '图片',
      document: '文档',
      subtitle: '字幕',
      archive: '压缩包',
      other: '其他'
    },
    status: {
      used: '已使用',
      unused: '未使用'
    },
    filter: {
      all: '全部',
      allTypes: '所有类型'
    },
    sort: {
      name: '名称',
      size: '大小',
      date: '日期',
      type: '类型'
    },
    stats: {
      count: '显示 {count}/{total} 个文件',
      size: '总大小 {size}',
      used: '已使用 {count} 个'
    },
    empty: {
      noFiles: '暂无文件',
      noMatch: '没有匹配的文件',
      hint: '拖拽文件到此处添加'
    },
    dropHint: '释放以添加文件',
    detail: {
      type: '类型',
      extension: '扩展名',
      size: '大小',
      mimeType: 'MIME类型',
      createdAt: '创建时间',
      modifiedAt: '修改时间',
      path: '文件路径',
      directory: '所在目录'
    },
    preview: {
      selectFile: '选择文件查看详情'
    }
  },
  error: {
    fileNotFound: '文件不存在',
    cardNotFound: '卡片不存在',
    invalidBinding: '无效的绑定',
    networkError: '网络错误',
    timeout: '操作超时',
    diskSpace: '磁盘空间不足',
    unknown: '未知错误'
  }
};
