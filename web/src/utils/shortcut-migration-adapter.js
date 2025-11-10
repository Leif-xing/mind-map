/**
 * 快捷键迁移适配器
 * 负责从现有系统迁移快捷键到统一管理系统
 */

import { LAYERS, CONTEXTS } from './unified-shortcut-manager.js'
import SHORTCUT_CONFIG from '../config/shortcut-config.js'

/**
 * 快捷键迁移适配器类
 */
export class ShortcutMigrationAdapter {
  constructor(shortcutManager, mindMapInstance) {
    this.shortcutManager = shortcutManager
    this.mindMap = mindMapInstance
    this.migrated = new Set()
  }

  /**
   * 执行完整迁移
   */
  async migrate() {
    try {
      // 第一阶段：迁移系统级快捷键
      await this.migrateSystemShortcuts()
      
      // 第二阶段：迁移应用级快捷键
      await this.migrateApplicationShortcuts()
      
      // 第三阶段：迁移浏览器级快捷键
      await this.migrateBrowserShortcuts()
      
      // 第四阶段：设置上下文相关快捷键
      await this.setupContextShortcuts()
      
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 迁移系统级快捷键
   */
  async migrateSystemShortcuts() {
    const systemShortcuts = SHORTCUT_CONFIG.system
    
    for (const [shortcut, config] of Object.entries(systemShortcuts)) {
      try {
        // 绑定正确的 this 上下文
        let action = config.action
        if (typeof action === 'function') {
          action = action.bind(this)
        }

        this.shortcutManager.register({
          shortcut,
          action,
          layer: config.layer,
          context: config.context || CONTEXTS.NORMAL,
          description: config.description,
          priority: config.priority
        })

        this.migrated.add(`system:${shortcut}`)
      } catch (error) {
        // 静默处理迁移错误
      }
    }
  }

  /**
   * 迁移应用级快捷键
   */
  async migrateApplicationShortcuts() {
    const appShortcuts = SHORTCUT_CONFIG.application
    
    for (const [shortcut, config] of Object.entries(appShortcuts)) {
      try {
        // 创建动作函数，这些需要与Vue组件集成
        let action
        switch (config.action) {
          case 'save':
            action = () => {
              this.mindMap.emit('save')
              // 也可以通过 Vue 事件总线触发
              if (window.Vue && window.Vue.prototype.$eventBus) {
                window.Vue.prototype.$eventBus.$emit('shortcut:save')
              }
            }
            break
          case 'search':
            action = () => {
              if (window.Vue && window.Vue.prototype.$eventBus) {
                window.Vue.prototype.$eventBus.$emit('shortcut:search')
              }
            }
            break
          case 'toggleNumbering':
            action = () => {
              if (window.Vue && window.Vue.prototype.$eventBus) {
                window.Vue.prototype.$eventBus.$emit('shortcut:toggleNumbering')
              }
            }
            break
          case 'toggleTodoCheckbox':
            action = () => {
              if (window.Vue && window.Vue.prototype.$eventBus) {
                window.Vue.prototype.$eventBus.$emit('shortcut:toggleTodoCheckbox')
              }
            }
            break
          case 'toggleTodoStatus':
            action = () => {
              if (window.Vue && window.Vue.prototype.$eventBus) {
                window.Vue.prototype.$eventBus.$emit('shortcut:toggleTodoStatus')
              }
            }
            break
          default:
            continue
        }

        this.shortcutManager.register({
          shortcut,
          action,
          layer: config.layer,
          context: config.context || CONTEXTS.NORMAL,
          description: config.description,
          priority: config.priority,
          component: config.component
        })

        this.migrated.add(`application:${shortcut}`)
      } catch (error) {
        // 静默处理迁移错误
      }
    }
  }

  /**
   * 迁移浏览器级快捷键
   */
  async migrateBrowserShortcuts() {
    const browserShortcuts = SHORTCUT_CONFIG.browser
    
    for (const [shortcut, config] of Object.entries(browserShortcuts)) {
      try {
        // 为浏览器级快捷键创建事件监听器
        const action = (event) => {
          if (config.preventDefault) {
            event.preventDefault()
          }

          // 触发相应的 Vue 事件
          if (window.Vue && window.Vue.prototype.$eventBus) {
            window.Vue.prototype.$eventBus.$emit(`shortcut:${config.action}`, event)
          }
        }

        this.shortcutManager.register({
          shortcut,
          action,
          layer: config.layer,
          context: config.context || CONTEXTS.NORMAL,
          description: config.description,
          priority: config.priority,
          component: config.component
        })

        this.migrated.add(`browser:${shortcut}`)
      } catch (error) {
        // 静默处理迁移错误
      }
    }
  }

  /**
   * 设置上下文相关快捷键
   */
  async setupContextShortcuts() {
    const contextShortcuts = SHORTCUT_CONFIG.contexts
    
    for (const [context, shortcuts] of Object.entries(contextShortcuts)) {
      for (const [shortcut, config] of Object.entries(shortcuts)) {
        try {
          let action
          switch (config.action) {
            case 'confirmTextEdit':
              action = () => {
                if (this.mindMap.renderer.textEdit) {
                  this.mindMap.renderer.textEdit.handleEnterText()
                }
              }
              break
            case 'cancelTextEdit':
              action = () => {
                if (this.mindMap.renderer.textEdit) {
                  this.mindMap.renderer.textEdit.hideTextEdit()
                }
              }
              break
            case 'closeSearch':
              action = () => {
                if (window.Vue && window.Vue.prototype.$eventBus) {
                  window.Vue.prototype.$eventBus.$emit('shortcut:closeSearch')
                }
              }
              break
            case 'searchNext':
              action = () => {
                if (window.Vue && window.Vue.prototype.$eventBus) {
                  window.Vue.prototype.$eventBus.$emit('shortcut:searchNext')
                }
              }
              break
            case 'closeDialog':
              action = () => {
                if (window.Vue && window.Vue.prototype.$eventBus) {
                  window.Vue.prototype.$eventBus.$emit('shortcut:closeDialog')
                }
              }
              break
            default:
              continue
          }

          this.shortcutManager.register({
            shortcut,
            action,
            layer: config.layer,
            context: context,
            description: config.description,
            priority: config.priority
          })

          this.migrated.add(`context:${context}:${shortcut}`)
        } catch (error) {
          // 静默处理设置错误
        }
      }
    }
  }

  /**
   * 迁移插件相关快捷键
   */
  migratePluginShortcuts(pluginName) {
    switch (pluginName) {
      case 'KeyboardNavigation':
        this.migrateKeyboardNavigationShortcuts()
        break
      case 'AssociativeLine':
        this.migrateAssociativeLineShortcuts()
        break
      case 'OuterFrame':
        this.migrateOuterFrameShortcuts()
        break
      default:
        break
    }
  }

  /**
   * 迁移键盘导航插件快捷键
   */
  migrateKeyboardNavigationShortcuts() {
    const navigationShortcuts = SHORTCUT_CONFIG.navigation
    
    for (const [shortcut, config] of Object.entries(navigationShortcuts)) {
      try {
        let action
        switch (config.action) {
          case 'navLeft':
            action = () => {
              if (this.mindMap.keyboardNavigation) {
                this.mindMap.keyboardNavigation.onLeftKeyUp()
              }
            }
            break
          case 'navRight':
            action = () => {
              if (this.mindMap.keyboardNavigation) {
                this.mindMap.keyboardNavigation.onRightKeyUp()
              }
            }
            break
          case 'navUp':
            action = () => {
              if (this.mindMap.keyboardNavigation) {
                this.mindMap.keyboardNavigation.onUpKeyUp()
              }
            }
            break
          case 'navDown':
            action = () => {
              if (this.mindMap.keyboardNavigation) {
                this.mindMap.keyboardNavigation.onDownKeyUp()
              }
            }
            break
          default:
            continue
        }

        this.shortcutManager.register({
          shortcut,
          action,
          layer: config.layer,
          context: CONTEXTS.NORMAL,
          description: config.description,
          priority: config.priority
        })

        this.migrated.add(`plugin:KeyboardNavigation:${shortcut}`)
      } catch (error) {
        // 静默处理导航快捷键迁移错误
      }
    }
  }

  /**
   * 迁移关联线插件快捷键
   */
  migrateAssociativeLineShortcuts() {
    try {
      this.shortcutManager.register({
        shortcut: 'Del|Backspace',
        action: () => {
          if (this.mindMap.associativeLine) {
            this.mindMap.associativeLine.removeLine()
          }
        },
        layer: LAYERS.CONTEXT,
        context: CONTEXTS.NORMAL,
        description: '删除关联线',
        priority: 7
      })

      this.migrated.add('plugin:AssociativeLine:Del|Backspace')
    } catch (error) {
      // 静默处理关联线快捷键迁移错误
    }
  }

  /**
   * 迁移外框插件快捷键
   */
  migrateOuterFrameShortcuts() {
    try {
      this.shortcutManager.register({
        shortcut: 'Del|Backspace',
        action: () => {
          if (this.mindMap.outerFrame) {
            this.mindMap.outerFrame.removeOuterFrame()
          }
        },
        layer: LAYERS.CONTEXT,
        context: CONTEXTS.NORMAL,
        description: '删除外框',
        priority: 7
      })

      this.migrated.add('plugin:OuterFrame:Del|Backspace')
    } catch (error) {
      // 静默处理外框快捷键迁移错误
    }
  }

  /**
   * 获取迁移报告
   */
  getMigrationReport() {
    const report = {
      total: this.migrated.size,
      byCategory: {},
      details: Array.from(this.migrated)
    }

    // 按类别统计
    this.migrated.forEach(item => {
      const category = item.split(':')[0]
      report.byCategory[category] = (report.byCategory[category] || 0) + 1
    })

    return report
  }
}

export default ShortcutMigrationAdapter