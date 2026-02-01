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
    connectHint: '点击卡片再点击文件创建连接'
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
