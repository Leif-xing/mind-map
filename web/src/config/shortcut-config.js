/**
 * 统一快捷键配置文件
 * 集中管理所有快捷键的配置信息
 */

import { LAYERS, CONTEXTS } from '../utils/unified-shortcut-manager.js'

// 系统核心层快捷键配置
export const SYSTEM_SHORTCUTS = {
  // 基础编辑操作
  'Ctrl+Z': {
    action: 'undo',
    layer: LAYERS.SYSTEM,
    description: '撤销操作',
    priority: 10
  },
  'Ctrl+Y': {
    action: 'redo', 
    layer: LAYERS.SYSTEM,
    description: '重做操作',
    priority: 10
  },
  'Ctrl+A': {
    action: function() { this.mindMap.renderer.selectAll() },
    layer: LAYERS.SYSTEM,
    description: '全选节点',
    priority: 10
  },
  'Ctrl+C': {
    action: function() { this.mindMap.renderer.copy() },
    layer: LAYERS.SYSTEM,
    description: '复制节点',
    priority: 10
  },
  'Ctrl+X': {
    action: function() { this.mindMap.renderer.cut() },
    layer: LAYERS.SYSTEM,
    description: '剪切节点', 
    priority: 10
  },
  'Ctrl+V': {
    action: function() { this.mindMap.renderer.paste() },
    layer: LAYERS.SYSTEM,
    description: '粘贴节点',
    priority: 10
  },
  'Del|Backspace': {
    action: function() { this.mindMap.renderer.removeNode() },
    layer: LAYERS.SYSTEM,
    description: '删除节点',
    priority: 10
  },
  'Tab': {
    action: function() { this.mindMap.execCommand('INSERT_CHILD_NODE') },
    layer: LAYERS.SYSTEM,
    context: CONTEXTS.NORMAL,
    description: '插入子节点',
    priority: 10
  },
  'Shift+Tab': {
    action: function() { this.mindMap.execCommand('INSERT_PARENT_NODE') },
    layer: LAYERS.SYSTEM,
    context: CONTEXTS.NORMAL,
    description: '插入父节点',
    priority: 10
  },
  'Enter': {
    action: function() { this.mindMap.execCommand('INSERT_NODE') },
    layer: LAYERS.SYSTEM,
    context: CONTEXTS.NORMAL,
    description: '插入同级节点',
    priority: 10
  },
  'Shift+Backspace': {
    action: function() { this.mindMap.execCommand('REMOVE_CURRENT_NODE') },
    layer: LAYERS.SYSTEM,
    description: '仅删除当前节点',
    priority: 10
  }
}

// 视图操作快捷键
export const VIEW_SHORTCUTS = {
  'Ctrl+=': {
    action: function() { this.mindMap.view.enlarge() },
    layer: LAYERS.SYSTEM,
    description: '放大视图',
    priority: 10
  },
  'Ctrl+-': {
    action: function() { this.mindMap.view.narrow() },
    layer: LAYERS.SYSTEM, 
    description: '缩小视图',
    priority: 10
  },
  'Ctrl+i': {
    action: function() { this.mindMap.view.fit() },
    layer: LAYERS.SYSTEM,
    description: '适应画布',
    priority: 10
  },
  'Ctrl+Enter': {
    action: function() { this.mindMap.view.reset() },
    layer: LAYERS.SYSTEM,
    description: '重置视图',
    priority: 10
  }
}

// 高级编辑操作
export const ADVANCED_SHORTCUTS = {
  'Ctrl+G': {
    action: function() { this.mindMap.execCommand('ADD_GENERALIZATION') },
    layer: LAYERS.SYSTEM,
    description: '添加概要',
    priority: 10
  },
  'Ctrl+L': {
    action: function() { this.mindMap.execCommand('RESET_LAYOUT') },
    layer: LAYERS.SYSTEM,
    description: '一键整理',
    priority: 10
  },
  'Ctrl+↑': {
    action: function() { this.mindMap.execCommand('UP_NODE') },
    layer: LAYERS.SYSTEM,
    description: '上移节点',
    priority: 10
  },
  'Ctrl+↓': {
    action: function() { this.mindMap.execCommand('DOWN_NODE') },
    layer: LAYERS.SYSTEM,
    description: '下移节点', 
    priority: 10
  }
}

// 应用功能层快捷键配置
export const APPLICATION_SHORTCUTS = {
  'Ctrl+S': {
    action: 'save',
    layer: LAYERS.APPLICATION,
    description: '保存思维导图',
    priority: 8
  },
  'Ctrl+F': {
    action: 'search',
    layer: LAYERS.APPLICATION,
    description: '搜索节点',
    priority: 8,
    component: 'Search'
  },
  'Shift+A': {
    action: 'toggleNumbering',
    layer: LAYERS.APPLICATION,
    description: '切换编号',
    priority: 8,
    component: 'Edit'
  },
  'Shift+W': {
    action: 'toggleTodoCheckbox',
    layer: LAYERS.APPLICATION,
    description: '切换待办复选框',
    priority: 8,
    component: 'Edit'
  },
  'Shift+S': {
    action: 'toggleTodoStatus',
    layer: LAYERS.APPLICATION,
    description: '切换待办状态',
    priority: 8,
    component: 'Edit'
  }
}

// 浏览器级快捷键配置
export const BROWSER_SHORTCUTS = {
  'Ctrl+G': {
    action: 'openAiCreate',
    layer: LAYERS.APPLICATION,
    description: '打开AI创建',
    priority: 8,
    preventDefault: true
  },
  'Ctrl+L': {
    action: 'openHistory',
    layer: LAYERS.APPLICATION, 
    description: '打开历史记录',
    priority: 8,
    preventDefault: true
  },
  'Alt+H': {
    action: 'toggleToolbar',
    layer: LAYERS.APPLICATION,
    description: '切换工具栏',
    priority: 8,
    preventDefault: true
  },
  'Alt+T': {
    action: 'openTagManager',
    layer: LAYERS.APPLICATION,
    description: '打开标签管理',
    priority: 8,
    preventDefault: true
  },
  'Shift+Z': {
    action: 'toggleLeftSidebar',
    layer: LAYERS.APPLICATION,
    description: '切换左侧栏',
    priority: 8,
    preventDefault: true
  },
  'Shift+C': {
    action: 'openNoteDialog',
    layer: LAYERS.APPLICATION,
    description: '打开备注对话框',
    priority: 8,
    component: 'Toolbar'
  }
}

// 上下文相关快捷键配置
export const CONTEXT_SHORTCUTS = {
  [CONTEXTS.TEXT_EDITING]: {
    'Enter': {
      action: 'confirmTextEdit',
      layer: LAYERS.CONTEXT,
      description: '确认文本编辑',
      priority: 9
    },
    'Escape': {
      action: 'cancelTextEdit',
      layer: LAYERS.CONTEXT,
      description: '取消文本编辑',
      priority: 9
    },
    'Tab': {
      action: 'textTab',
      layer: LAYERS.CONTEXT,
      description: '文本缩进',
      priority: 9
    }
  },
  [CONTEXTS.SEARCH_MODE]: {
    'Escape': {
      action: 'closeSearch',
      layer: LAYERS.CONTEXT,
      description: '关闭搜索',
      priority: 9
    },
    'Enter': {
      action: 'searchNext',
      layer: LAYERS.CONTEXT,
      description: '下一个搜索结果',
      priority: 9
    },
    'Shift+Enter': {
      action: 'searchPrev',
      layer: LAYERS.CONTEXT,
      description: '上一个搜索结果',
      priority: 9
    }
  },
  [CONTEXTS.DIALOG_OPEN]: {
    'Escape': {
      action: 'closeDialog',
      layer: LAYERS.CONTEXT,
      description: '关闭对话框',
      priority: 9
    },
    'Enter': {
      action: 'confirmDialog',
      layer: LAYERS.CONTEXT,
      description: '确认对话框',
      priority: 9
    }
  }
}

// 组件私有快捷键配置
export const COMPONENT_SHORTCUTS = {
  NodeNote: {
    'Shift+C': {
      action: 'toggleNote',
      layer: LAYERS.COMPONENT,
      description: '切换备注',
      priority: 4
    }
  },
  Navigator: {
    'Ctrl+M': {
      action: 'toggleMiniMap',
      layer: LAYERS.COMPONENT,
      description: '切换小地图',
      priority: 4
    }
  },
  Outline: {
    'Ctrl+O': {
      action: 'toggleOutline',
      layer: LAYERS.COMPONENT,
      description: '切换大纲',
      priority: 4
    }
  }
}

// 键盘导航相关快捷键（当插件启用时）
export const NAVIGATION_SHORTCUTS = {
  'Left': {
    action: 'navLeft',
    layer: LAYERS.CONTEXT,
    description: '向左导航',
    priority: 6,
    plugin: 'KeyboardNavigation'
  },
  'Right': {
    action: 'navRight',
    layer: LAYERS.CONTEXT,
    description: '向右导航',
    priority: 6,
    plugin: 'KeyboardNavigation'
  },
  'Up': {
    action: 'navUp',
    layer: LAYERS.CONTEXT,
    description: '向上导航',
    priority: 6,
    plugin: 'KeyboardNavigation'
  },
  'Down': {
    action: 'navDown',
    layer: LAYERS.CONTEXT,
    description: '向下导航',
    priority: 6,
    plugin: 'KeyboardNavigation'
  }
}

// 完整快捷键配置集合
export const SHORTCUT_CONFIG = {
  system: {
    ...SYSTEM_SHORTCUTS,
    ...VIEW_SHORTCUTS,
    ...ADVANCED_SHORTCUTS
  },
  application: APPLICATION_SHORTCUTS,
  browser: BROWSER_SHORTCUTS,
  contexts: CONTEXT_SHORTCUTS,
  components: COMPONENT_SHORTCUTS,
  navigation: NAVIGATION_SHORTCUTS
}

export default SHORTCUT_CONFIG