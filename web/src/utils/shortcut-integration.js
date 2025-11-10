/**
 * 统一快捷键系统集成入口
 * 负责初始化和集成整个快捷键管理系统
 */

import Vue from 'vue'
import ShortcutPlugin from '../plugins/shortcut-plugin.js'
import { ShortcutMigrationAdapter } from './shortcut-migration-adapter.js'
import { CONTEXTS } from './unified-shortcut-manager.js'

/**
 * 快捷键系统集成类
 */
export class ShortcutIntegration {
  constructor() {
    this.eventBus = null
    this.adapter = null
    this.initialized = false
  }

  /**
   * 初始化快捷键系统
   */
  async initialize(mindMapInstance) {
    if (this.initialized) {
      return
    }

    try {
      // 1. 安装Vue插件
      Vue.use(ShortcutPlugin)
      
      // 2. 创建事件总线
      this.setupEventBus()
      
      // 3. 初始化管理器
      const shortcutManager = Vue.prototype.$shortcuts.init(mindMapInstance)
      
      // 4. 创建并执行迁移
      this.adapter = new ShortcutMigrationAdapter(shortcutManager, mindMapInstance)
      await this.adapter.migrate()
      
      // 5. 设置状态监听
      this.setupStateListeners(mindMapInstance, shortcutManager)
      
      // 6. 设置Vue组件集成
      this.setupVueIntegration(shortcutManager)
      
      this.initialized = true
      
    } catch (error) {
      throw error
    }
  }

  /**
   * 设置事件总线
   */
  setupEventBus() {
    // 创建或使用现有的事件总线
    if (!Vue.prototype.$eventBus) {
      Vue.prototype.$eventBus = new Vue()
    }
    this.eventBus = Vue.prototype.$eventBus
    
    // 确保全局可访问
    window.$eventBus = Vue.prototype.$eventBus
  }

  /**
   * 设置状态监听器
   */
  setupStateListeners(mindMap, shortcutManager) {
    // 监听文本编辑状态变化
    mindMap.on('beforeTextEdit', () => {
      shortcutManager.switchContext(CONTEXTS.TEXT_EDITING, {
        disable: ['Tab', 'Enter', 'Del', 'Backspace'],
        enable: ['Ctrl+Enter', 'Escape']
      })
    })
    
    mindMap.on('afterTextEdit', () => {
      shortcutManager.switchContext(CONTEXTS.NORMAL)
    })
    
    // 监听节点选择状态变化
    mindMap.on('node_active', (node, activeNodeList) => {
      if (activeNodeList && activeNodeList.length > 1) {
        shortcutManager.switchContext(CONTEXTS.MULTI_SELECTED)
      } else if (node) {
        shortcutManager.switchContext(CONTEXTS.NODE_SELECTED)
      } else {
        shortcutManager.switchContext(CONTEXTS.NORMAL)
      }
    })
  }

  /**
   * 设置Vue组件集成
   */
  setupVueIntegration(shortcutManager) {
    // 监听来自组件的快捷键事件
    this.eventBus.$on('shortcut:save', this.handleSave.bind(this))
    this.eventBus.$on('shortcut:search', this.handleSearch.bind(this))
    this.eventBus.$on('shortcut:toggleNumbering', this.handleToggleNumbering.bind(this))
    this.eventBus.$on('shortcut:toggleTodoCheckbox', this.handleToggleTodoCheckbox.bind(this))
    this.eventBus.$on('shortcut:toggleTodoStatus', this.handleToggleTodoStatus.bind(this))
    this.eventBus.$on('shortcut:openAiCreate', this.handleOpenAiCreate.bind(this))
    this.eventBus.$on('shortcut:openHistory', this.handleOpenHistory.bind(this))
    this.eventBus.$on('shortcut:toggleToolbar', this.handleToggleToolbar.bind(this))
    this.eventBus.$on('shortcut:toggleLeftSidebar', this.handleToggleLeftSidebar.bind(this))
    this.eventBus.$on('shortcut:openTagManager', this.handleOpenTagManager.bind(this))
    this.eventBus.$on('shortcut:openNoteDialog', this.handleOpenNoteDialog.bind(this))
    this.eventBus.$on('shortcut:closeSearch', this.handleCloseSearch.bind(this))
    this.eventBus.$on('shortcut:searchNext', this.handleSearchNext.bind(this))
    this.eventBus.$on('shortcut:closeDialog', this.handleCloseDialog.bind(this))
  }

  // === 事件处理方法 ===

  handleSave() {
    this.eventBus.$emit('manual-save')
  }

  handleSearch() {
    this.eventBus.$emit('show-search')
  }

  handleToggleNumbering() {
    this.eventBus.$emit('toggle-numbering')
  }

  handleToggleTodoCheckbox() {
    this.eventBus.$emit('toggle-todo-checkbox')
  }

  handleToggleTodoStatus() {
    this.eventBus.$emit('toggle-todo-status')
  }

  handleOpenAiCreate() {
    this.eventBus.$emit('open-ai-create')
  }

  handleOpenHistory() {
    this.eventBus.$emit('open-history-dialog')
  }

  handleToggleToolbar() {
    this.eventBus.$emit('toggle-toolbar')
  }

  handleToggleLeftSidebar() {
    this.eventBus.$emit('toggle-left-sidebar')
  }

  handleOpenTagManager() {
    this.eventBus.$emit('open-tag-manager')
  }

  handleOpenNoteDialog() {
    this.eventBus.$emit('open-note-dialog')
  }

  handleCloseSearch() {
    this.eventBus.$emit('close-search')
  }

  handleSearchNext() {
    this.eventBus.$emit('search-next')
  }

  handleCloseDialog() {
    this.eventBus.$emit('close-dialog')
  }

  /**
   * 获取系统状态
   */
  getStatus() {
    if (!this.initialized) {
      return { status: 'not_initialized' }
    }

    const shortcutManager = Vue.prototype.$shortcuts
    return {
      status: 'initialized',
      stats: shortcutManager.getStats ? shortcutManager.getStats() : {},
      migrationReport: this.adapter ? this.adapter.getMigrationReport() : null
    }
  }

  /**
   * 销毁快捷键系统
   */
  destroy() {
    if (this.eventBus) {
      // 移除所有监听器
      this.eventBus.$off('shortcut:save')
      this.eventBus.$off('shortcut:search')
      // ... 移除其他监听器
    }

    if (Vue.prototype.$shortcuts && typeof Vue.prototype.$shortcuts.destroy === 'function') {
      Vue.prototype.$shortcuts.destroy()
    }

    this.initialized = false
  }
}

// 创建全局实例
export const shortcutIntegration = new ShortcutIntegration()

// 导出便捷初始化函数
export function initializeShortcutSystem(mindMapInstance) {
  return shortcutIntegration.initialize(mindMapInstance)
}

export default shortcutIntegration