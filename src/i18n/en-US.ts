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
    connectHint: 'Click card then click file to create connection',
    clearConnections: 'Clear Connections',
    deleteSelected: 'Delete Selected',
    autoArrange: 'Auto Arrange',
    fitToView: 'Fit to View',
    resetView: 'Reset View',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    importConfig: 'Import Config',
    exportConfig: 'Export Config',
    graphHint: 'Scroll to zoom · Right/Middle click to pan · Delete to remove'
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
  scheme: {
    list: 'Scheme List',
    availableSchemes: 'Available Schemes',
    schemeCount: '{count} schemes',
    generating: 'Generating schemes...',
    recommended: 'Recommended',
    matched: '{count} matched',
    unmatchedCards: '{count} cards unmatched',
    unmatchedFiles: '{count} files unmatched',
    moreBindings: '{count} more...',
    expand: 'Expand preview',
    collapse: 'Collapse preview',
    selectHint: 'Select a scheme from the left',
    matchedCount: 'Matched: {count}',
    unmatchedCardsCount: 'Unmatched cards: {count}',
    unmatchedFilesCount: 'Unmatched files: {count}',
    matchedTab: 'Matched',
    unmatchedTab: 'Unmatched',
    noBindings: 'No matched bindings',
    allMatched: 'All items matched',
    unmatchedCardsSection: 'Unmatched Cards',
    unmatchedFilesSection: 'Unmatched Files',
    recommendedScheme: 'Recommended',
    manualAdjust: 'Manual Adjust',
    startMatch: 'Start Match',
    backToSelect: 'Back to Select',
    deselectAll: 'Deselect All',
    loadCardsHint: 'Please load card data first',
    loadFilesHint: 'Please add files first',
    emptyHint: 'Select cards and files, then click "Start Match"'
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
  fileSelector: {
    selectFile: 'Select file...',
    browse: 'Browse',
    dropHere: 'Drop to select file',
    invalidType: 'Unsupported file type'
  },
  bindingTable: {
    cardColumn: 'Card',
    fileColumn: 'Bound File',
    statusColumn: 'Status',
    actionsColumn: 'Actions',
    batchRemove: 'Batch Remove',
    clearAll: 'Clear All',
    showingCount: 'Showing {count}/{total}'
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
  card: {
    type: {
      video: 'Video',
      audio: 'Audio',
      image: 'Image',
      document: 'Document',
      text: 'Text',
      custom: 'Custom'
    },
    filter: {
      all: 'All'
    },
    sort: {
      name: 'Name',
      status: 'Status'
    },
    empty: {
      noCards: 'No cards',
      noMatch: 'No matching cards'
    }
  },
  file: {
    type: {
      video: 'Video',
      audio: 'Audio',
      image: 'Image',
      document: 'Document',
      subtitle: 'Subtitle',
      archive: 'Archive',
      other: 'Other'
    },
    status: {
      used: 'Used',
      unused: 'Unused'
    },
    filter: {
      all: 'All',
      allTypes: 'All Types'
    },
    sort: {
      name: 'Name',
      size: 'Size',
      date: 'Date',
      type: 'Type'
    },
    stats: {
      count: 'Showing {count}/{total} files',
      size: 'Total size {size}',
      used: '{count} used'
    },
    empty: {
      noFiles: 'No files',
      noMatch: 'No matching files',
      hint: 'Drag files here to add'
    },
    dropHint: 'Drop to add files',
    detail: {
      type: 'Type',
      extension: 'Extension',
      size: 'Size',
      mimeType: 'MIME Type',
      createdAt: 'Created',
      modifiedAt: 'Modified',
      path: 'File Path',
      directory: 'Directory'
    },
    preview: {
      selectFile: 'Select a file to preview'
    }
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
