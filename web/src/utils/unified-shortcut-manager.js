/**
 * 统一快捷键管理系统
 * 提供分层、上下文感知的快捷键管理能力
 */

// 预定义上下文状态
export const CONTEXTS = {
  NORMAL: 'normal', // 正常编辑状态
  TEXT_EDITING: 'textEdit', // 文本编辑状态
  NODE_SELECTED: 'nodeSelect', // 节点选中状态
  MULTI_SELECTED: 'multiSelect', // 多选状态
  READONLY: 'readonly', // 只读状态
  DIALOG_OPEN: 'dialogOpen', // 对话框打开状态
  SEARCH_MODE: 'searchMode', // 搜索模式
  MINDMAP_MANAGER: 'mindmapManager' // 导图管理页面状态
}

// 快捷键层级定义
export const LAYERS = {
  SYSTEM: 'system', // 系统核心层 (优先级: 10)
  APPLICATION: 'application', // 应用功能层 (优先级: 8)
  CONTEXT: 'context', // 上下文功能层 (优先级: 6)
  COMPONENT: 'component', // 组件私有层 (优先级: 4)
  TEMPORARY: 'temporary' // 临时功能层 (优先级: 2)
}

// 层级优先级映射
const LAYER_PRIORITIES = {
  [LAYERS.SYSTEM]: 10,
  [LAYERS.APPLICATION]: 8,
  [LAYERS.CONTEXT]: 6,
  [LAYERS.COMPONENT]: 4,
  [LAYERS.TEMPORARY]: 2
}

/**
 * 层级管理器
 */
class LayerManager {
  constructor() {
    this.layers = new Map()
    this.shortcuts = new Map()

    // 初始化各层级
    Object.values(LAYERS).forEach(layer => {
      this.layers.set(layer, new Map())
    })
  }

  /**
   * 添加快捷键到指定层级
   */
  add(layer, shortcut, action, options = {}) {
    const {
      context = CONTEXTS.NORMAL,
      priority,
      description = '',
      component = null
    } = options

    if (!this.layers.has(layer)) {
      throw new Error(`Invalid layer: ${layer}`)
    }

    const layerMap = this.layers.get(layer)
    const key = `${shortcut}:${context}`

    // 检查冲突（静默处理）
    // if (layerMap.has(key)) {
    //   console.warn(`Shortcut conflict detected: ${shortcut} in ${layer}:${context}`)
    // }

    const finalPriority = priority || LAYER_PRIORITIES[layer]

    const shortcutConfig = {
      shortcut,
      action,
      layer,
      context,
      priority: finalPriority,
      description,
      component,
      registeredAt: Date.now()
    }

    layerMap.set(key, shortcutConfig)

    // 建立快捷键到配置的映射
    if (!this.shortcuts.has(shortcut)) {
      this.shortcuts.set(shortcut, [])
    }
    this.shortcuts.get(shortcut).push(shortcutConfig)

    return key
  }

  /**
   * 从指定层级移除快捷键
   */
  remove(layer, shortcut, context = CONTEXTS.NORMAL) {
    const layerMap = this.layers.get(layer)
    if (!layerMap) return false

    const key = `${shortcut}:${context}`
    const result = layerMap.delete(key)

    // 从快捷键映射中移除
    if (this.shortcuts.has(shortcut)) {
      const configs = this.shortcuts.get(shortcut)
      const index = configs.findIndex(
        c => c.layer === layer && c.context === context
      )
      if (index > -1) {
        configs.splice(index, 1)
        if (configs.length === 0) {
          this.shortcuts.delete(shortcut)
        }
      }
    }

    return result
  }

  /**
   * 清理指定组件的所有快捷键
   */
  cleanupComponent(componentName) {
    let cleanedCount = 0

    this.layers.forEach((layerMap, layer) => {
      const toDelete = []
      layerMap.forEach((config, key) => {
        if (config.component === componentName) {
          toDelete.push(key)
        }
      })

      toDelete.forEach(key => {
        const config = layerMap.get(key)
        this.remove(layer, config.shortcut, config.context)
        cleanedCount++
      })
    })

    return cleanedCount
  }

  /**
   * 获取指定快捷键在当前上下文中的最高优先级配置
   */
  getActiveConfig(shortcut, currentContext = CONTEXTS.NORMAL) {
    const configs = this.shortcuts.get(shortcut) || []

    // 过滤适用的配置（匹配上下文或全局）
    const applicableConfigs = configs.filter(
      config =>
        config.context === currentContext || config.context === CONTEXTS.NORMAL
    )

    // 按优先级排序，返回最高优先级的配置
    return applicableConfigs.sort((a, b) => b.priority - a.priority)[0] || null
  }

  /**
   * 获取所有层级的快捷键统计
   */
  getStats() {
    const stats = {}
    this.layers.forEach((layerMap, layer) => {
      stats[layer] = layerMap.size
    })
    return stats
  }
}

/**
 * 上下文管理器
 */
class ContextManager {
  constructor() {
    this.currentContext = CONTEXTS.NORMAL
    this.contextStack = [CONTEXTS.NORMAL]
    this.listeners = []
  }

  /**
   * 切换到新的上下文
   */
  switch(newContext, options = {}) {
    const { push = false, disable = [], enable = [] } = options

    const oldContext = this.currentContext

    if (push) {
      this.contextStack.push(newContext)
    } else {
      this.contextStack[this.contextStack.length - 1] = newContext
    }

    this.currentContext = newContext

    // 通知监听器
    this.listeners.forEach(listener => {
      listener(newContext, oldContext, { disable, enable })
    })

    return oldContext
  }

  /**
   * 返回上一个上下文
   */
  pop() {
    if (this.contextStack.length > 1) {
      this.contextStack.pop()
      this.currentContext = this.contextStack[this.contextStack.length - 1]
    }
    return this.currentContext
  }

  /**
   * 获取当前上下文
   */
  getCurrent() {
    return this.currentContext
  }

  /**
   * 添加上下文变化监听器
   */
  addListener(listener) {
    this.listeners.push(listener)
  }

  /**
   * 移除上下文变化监听器
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }
}

/**
 * 冲突检测器
 */
class ConflictResolver {
  constructor() {
    this.conflicts = new Map()
  }

  /**
   * 检测快捷键冲突
   */
  detectConflict(shortcut, layer, context, layerManager) {
    const existingConfigs = layerManager.shortcuts.get(shortcut) || []

    const conflicts = existingConfigs.filter(config => {
      // 同层同上下文冲突
      if (config.layer === layer && config.context === context) {
        return true
      }

      // 跨层优先级冲突检查
      const currentPriority = LAYER_PRIORITIES[layer]
      if (Math.abs(config.priority - currentPriority) < 2) {
        return true
      }

      return false
    })

    if (conflicts.length > 0) {
      this.conflicts.set(shortcut, conflicts)
      return conflicts
    }

    return null
  }

  /**
   * 获取冲突建议
   */
  getSuggestions(shortcut, layer, context) {
    // 生成替代快捷键建议
    const suggestions = []

    // 尝试添加修饰符
    const modifiers = [
      'Shift+',
      'Alt+',
      'Ctrl+Shift+',
      'Ctrl+Alt+',
      'Shift+Alt+'
    ]
    modifiers.forEach(modifier => {
      if (!shortcut.includes(modifier.slice(0, -1))) {
        suggestions.push(modifier + shortcut)
      }
    })

    return suggestions.slice(0, 3) // 返回前3个建议
  }

  /**
   * 获取所有冲突
   */
  getAllConflicts() {
    return Array.from(this.conflicts.entries())
  }
}

/**
 * 使用情况分析器
 */
class UsageAnalytics {
  constructor() {
    this.usage = new Map()
    this.lastUsed = new Map()
  }

  /**
   * 记录快捷键使用
   */
  recordUsage(shortcut) {
    const count = this.usage.get(shortcut) || 0
    this.usage.set(shortcut, count + 1)
    this.lastUsed.set(shortcut, Date.now())
  }

  /**
   * 获取使用统计
   */
  getStats() {
    const stats = []
    this.usage.forEach((count, shortcut) => {
      stats.push({
        shortcut,
        count,
        lastUsed: this.lastUsed.get(shortcut)
      })
    })

    return stats.sort((a, b) => b.count - a.count)
  }

  /**
   * 获取热门快捷键
   */
  getPopular(limit = 10) {
    return this.getStats().slice(0, limit)
  }
}

/**
 * 统一快捷键管理器主类
 */
export class UnifiedShortcutManager {
  constructor(mindMapInstance) {
    this.mindMap = mindMapInstance
    this.layers = new LayerManager()
    this.contexts = new ContextManager()
    this.conflicts = new ConflictResolver()
    this.analytics = new UsageAnalytics()

    // 绑定原始KeyCommand的事件处理
    this.originalAddShortcut = this.mindMap.keyCommand.addShortcut.bind(
      this.mindMap.keyCommand
    )
    this.originalRemoveShortcut = this.mindMap.keyCommand.removeShortcut.bind(
      this.mindMap.keyCommand
    )

    // 监听上下文变化
    this.contexts.addListener(this.onContextChange.bind(this))
  }

  /**
   * 统一注册快捷键接口
   */
  register(config) {
    const {
      shortcut,
      action,
      layer = LAYERS.APPLICATION,
      context = CONTEXTS.NORMAL,
      priority,
      description = '',
      component = null
    } = config

    // 冲突检测（静默处理）
    const conflicts = this.conflicts.detectConflict(
      shortcut,
      layer,
      context,
      this.layers
    )

    // 添加到层级管理
    const key = this.layers.add(layer, shortcut, action, {
      context,
      priority,
      description,
      component
    })

    // 注册到原始KeyCommand (仅当前上下文需要)
    if (context === this.contexts.getCurrent() || context === CONTEXTS.NORMAL) {
      this.originalAddShortcut(shortcut, e => {
        this.executeShortcut(shortcut, e)
      })
    }

    return key
  }

  /**
   * 统一移除快捷键接口
   */
  unregister(shortcut, layer = null, context = null) {
    let removed = false

    if (layer && context) {
      // 移除特定层级和上下文的快捷键
      removed = this.layers.remove(layer, shortcut, context)
    } else {
      // 移除所有相关快捷键
      Object.values(LAYERS).forEach(l => {
        Object.values(CONTEXTS).forEach(c => {
          if (this.layers.remove(l, shortcut, c)) {
            removed = true
          }
        })
      })
    }

    // 从原始KeyCommand移除
    this.originalRemoveShortcut(shortcut)

    return removed
  }

  /**
   * 切换上下文
   */
  switchContext(newContext, options = {}) {
    return this.contexts.switch(newContext, options)
  }

  /**
   * 清理组件快捷键
   */
  cleanupComponent(componentName) {
    return this.layers.cleanupComponent(componentName)
  }

  /**
   * 执行快捷键动作
   */
  executeShortcut(shortcut, event) {
    const currentContext = this.contexts.getCurrent()
    const config = this.layers.getActiveConfig(shortcut, currentContext)

    if (!config) {
      return false
    }

    // 记录使用统计
    this.analytics.recordUsage(shortcut)

    try {
      // 执行动作
      if (typeof config.action === 'function') {
        config.action(event)
      } else if (typeof config.action === 'string') {
        // 支持字符串形式的动作名称
        this.executeNamedAction(config.action, event)
      }

      return true
    } catch (error) {
      // 静默处理错误
      return false
    }
  }

  /**
   * 执行命名动作
   */
  executeNamedAction(actionName, event) {
    // 这里可以扩展支持字符串形式的动作
    switch (actionName) {
      case 'save':
        // 触发保存事件
        this.mindMap.emit('save')
        break
      case 'undo':
        this.mindMap.execCommand('BACK')
        break
      case 'redo':
        this.mindMap.execCommand('FORWARD')
        break
      default:
        // 未知动作静默处理
        break
    }
  }

  /**
   * 上下文变化处理
   */
  onContextChange(newContext, oldContext, options) {
    // 重新注册当前上下文相关的快捷键
    this.refreshShortcuts()
  }

  /**
   * 刷新快捷键注册
   */
  refreshShortcuts() {
    const currentContext = this.contexts.getCurrent()

    // 清除所有原始注册
    // 注意：这里需要小心处理，避免影响系统原有的快捷键

    // 重新注册当前上下文相关的快捷键
    this.layers.shortcuts.forEach((configs, shortcut) => {
      const activeConfig = this.layers.getActiveConfig(shortcut, currentContext)
      if (activeConfig) {
        this.originalRemoveShortcut(shortcut)
        this.originalAddShortcut(shortcut, e => {
          this.executeShortcut(shortcut, e)
        })
      }
    })
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      layers: this.layers.getStats(),
      context: this.contexts.getCurrent(),
      usage: this.analytics.getStats(),
      conflicts: this.conflicts.getAllConflicts()
    }
  }

  /**
   * 获取快捷键提示
   */
  getHints(context = null) {
    const targetContext = context || this.contexts.getCurrent()
    const hints = []

    this.layers.shortcuts.forEach((configs, shortcut) => {
      const config = configs.find(
        c => c.context === targetContext || c.context === CONTEXTS.NORMAL
      )
      if (config) {
        hints.push({
          shortcut,
          description: config.description,
          layer: config.layer
        })
      }
    })

    return hints.sort((a, b) => a.shortcut.localeCompare(b.shortcut))
  }

  /**
   * 销毁管理器
   */
  destroy() {
    // 清理所有注册的快捷键
    this.layers.shortcuts.forEach((configs, shortcut) => {
      this.originalRemoveShortcut(shortcut)
    })
  }
}

export default UnifiedShortcutManager
