/**
 * English language pack
 */
export default {
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    clear: 'Clear',
    select: 'Select',
    selectAll: 'Select All',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    refresh: 'Refresh',
    loading: 'Loading...',
    success: 'Success',
    failed: 'Failed',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    finish: 'Finish',
    retry: 'Retry',
    skip: 'Skip',
    abort: 'Abort'
  },
  connector: {
    title: 'File Connector',
    description: 'Batch bind external resources to cards'
  },
  mode: {
    manual: 'Manual Connect',
    auto: 'Auto Match',
    smart: 'Smart Match',
    convert: 'Mode Convert'
  },
  manual: {
    title: 'Manual Connect',
    tableMode: 'Table Mode',
    graphMode: 'Graph Mode',
    selectCards: 'Select Cards',
    selectFiles: 'Select Files',
    addFiles: 'Add Files',
    clearBindings: 'Clear Bindings',
    batchFolder: 'Batch Set Folder',
    dragHint: 'Drag files here',
    connectHint: 'Click card then click file to create connection'
  },
  auto: {
    title: 'Auto Match',
    numberMatch: 'Number Sequence Match',
    keywordMatch: 'Keyword Match',
    orderMatch: 'File Order Match',
    generateSchemes: 'Generate Schemes',
    selectScheme: 'Select Scheme',
    applyScheme: 'Apply Scheme',
    confidence: 'Confidence',
    noScheme: 'No scheme generated'
  },
  smart: {
    title: 'Smart Match',
    analyzing: 'Analyzing...',
    highConfidence: 'High Confidence',
    mediumConfidence: 'Medium Confidence',
    lowConfidence: 'Low Confidence',
    unmatched: 'Unmatched',
    fallbackMode: 'Fallback Mode (AI service unavailable)',
    confirmBinding: 'Confirm Binding'
  },
  binding: {
    preview: 'Binding Preview',
    execute: 'Execute Binding',
    progress: 'Execution Progress',
    result: 'Execution Result',
    bound: 'Bound',
    unbound: 'Unbound',
    new: 'New',
    modified: 'Modified',
    deleted: 'Deleted'
  },
  convert: {
    title: 'Mode Convert',
    toFull: 'Convert to Full',
    toEmpty: 'Convert to Empty',
    selectTarget: 'Select Target Path',
    spaceRequired: 'Space Required',
    spaceAvailable: 'Space Available',
    converting: 'Converting...'
  },
  status: {
    cardsSelected: '{count} cards selected',
    filesSelected: '{count} files selected',
    bindingCount: 'Bound {bound}/{total}'
  },
  error: {
    fileNotFound: 'File not found',
    cardNotFound: 'Card not found',
    invalidBinding: 'Invalid binding',
    networkError: 'Network error',
    timeout: 'Operation timed out',
    diskSpace: 'Insufficient disk space',
    unknown: 'Unknown error'
  }
};
