/**
 * 统一快捷键管理系统 Vue 插件
 * 提供 Vue 组件级别的快捷键管理集成
 */

import { UnifiedShortcutManager, CONTEXTS, LAYERS } from '../utils/unified-shortcut-manager.js'

const ShortcutPlugin = {
  install(Vue, options = {}) {
    let shortcutManager = null

    // 在 Vue 原型上添加快捷键管理器实例
    Vue.prototype.$shortcuts = {
      // 延迟初始化，等待 mindMap 实例
      init(mindMapInstance) {
        if (!shortcutManager) {
          shortcutManager = new UnifiedShortcutManager(mindMapInstance)
          Vue.prototype.$shortcuts = shortcutManager
        }
        return shortcutManager
      },
      
      // 提供临时访问方法
      register: (...args) => {
        if (shortcutManager) {
          return shortcutManager.register(...args)
        } else {
          console.warn('ShortcutPlugin: Manager not initialized yet')
          return null
        }
      },
      
      unregister: (...args) => {
        if (shortcutManager) {
          return shortcutManager.unregister(...args)
        } else {
          console.warn('ShortcutPlugin: Manager not initialized yet')
          return false
        }
      }
    }

    // 添加全局混入，自动管理组件生命周期
    Vue.mixin({
      data() {
        return {
          _shortcutKeys: [] // 存储当前组件注册的快捷键
        }
      },

      methods: {
        /**
         * 注册快捷键的便捷方法
         * @param {string} shortcut - 快捷键组合
         * @param {function|string} action - 动作函数或动作名称
         * @param {object} options - 选项配置
         */
        $registerShortcut(shortcut, action, options = {}) {
          if (!this.$shortcuts || typeof this.$shortcuts.register !== 'function') {
            console.warn('ShortcutPlugin: Manager not available')
            return null
          }

          const config = {
            shortcut,
            action: action.bind ? action.bind(this) : action,
            layer: options.layer || LAYERS.COMPONENT,
            context: options.context || CONTEXTS.NORMAL,
            component: options.component || this.$options.name || this.$vnode?.tag,
            description: options.description || '',
            priority: options.priority
          }

          const key = this.$shortcuts.register(config)
          
          if (key) {
            this._shortcutKeys.push({
              key,
              shortcut,
              layer: config.layer,
              context: config.context
            })
          }

          return key
        },

        /**
         * 移除快捷键的便捷方法
         * @param {string} shortcut - 快捷键组合
         * @param {string} layer - 层级
         * @param {string} context - 上下文
         */
        $unregisterShortcut(shortcut, layer, context) {
          if (!this.$shortcuts || typeof this.$shortcuts.unregister !== 'function') {
            return false
          }

          const result = this.$shortcuts.unregister(shortcut, layer, context)
          
          // 从组件记录中移除
          this._shortcutKeys = this._shortcutKeys.filter(item => 
            !(item.shortcut === shortcut && 
              item.layer === layer && 
              item.context === context)
          )

          return result
        },

        /**
         * 切换上下文的便捷方法
         * @param {string} newContext - 新的上下文
         * @param {object} options - 选项
         */
        $switchShortcutContext(newContext, options = {}) {
          if (!this.$shortcuts || typeof this.$shortcuts.switchContext !== 'function') {
            return null
          }

          return this.$shortcuts.switchContext(newContext, options)
        },

        /**
         * 获取快捷键提示
         * @param {string} context - 上下文
         */
        $getShortcutHints(context) {
          if (!this.$shortcuts || typeof this.$shortcuts.getHints !== 'function') {
            return []
          }

          return this.$shortcuts.getHints(context)
        }
      },

      beforeDestroy() {
        // 自动清理当前组件注册的所有快捷键
        if (this._shortcutKeys && this._shortcutKeys.length > 0) {
          this._shortcutKeys.forEach(item => {
            this.$unregisterShortcut(item.shortcut, item.layer, item.context)
          })
          
          this._shortcutKeys = []
        }

        // 组件级清理
        if (this.$shortcuts && typeof this.$shortcuts.cleanupComponent === 'function') {
          const componentName = this.$options.name || this.$vnode?.tag
          if (componentName) {
            this.$shortcuts.cleanupComponent(componentName)
          }
        }
      }
    })

    // 提供全局指令用于声明式快捷键注册
    Vue.directive('shortcut', {
      bind(el, binding, vnode) {
        const { value, modifiers, arg } = binding
        const vm = vnode.context

        if (!arg) {
          console.warn('v-shortcut directive requires a shortcut key as argument')
          return
        }

        let action
        if (typeof value === 'function') {
          action = value
        } else if (typeof value === 'string' && vm[value]) {
          action = vm[value].bind(vm)
        } else {
          console.warn('v-shortcut directive requires a function or method name')
          return
        }

        const options = {
          layer: modifiers.system ? LAYERS.SYSTEM : 
                 modifiers.application ? LAYERS.APPLICATION :
                 modifiers.context ? LAYERS.CONTEXT :
                 modifiers.temporary ? LAYERS.TEMPORARY :
                 LAYERS.COMPONENT,
          context: modifiers.textEdit ? CONTEXTS.TEXT_EDITING :
                  modifiers.search ? CONTEXTS.SEARCH_MODE :
                  modifiers.dialog ? CONTEXTS.DIALOG_OPEN :
                  CONTEXTS.NORMAL
        }

        // 存储到元素上，用于解绑
        el._shortcutKey = vm.$registerShortcut(arg, action, options)
        el._shortcutConfig = { shortcut: arg, ...options }
      },

      unbind(el, binding, vnode) {
        const vm = vnode.context
        if (el._shortcutKey && el._shortcutConfig) {
          vm.$unregisterShortcut(
            el._shortcutConfig.shortcut,
            el._shortcutConfig.layer,
            el._shortcutConfig.context
          )
        }
      }
    })
  }
}

export default ShortcutPlugin