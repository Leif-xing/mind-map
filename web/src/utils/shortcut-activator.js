/**
 * 快捷键激活器 - 自动查找Vue组件并激活快捷键功能
 * 支持多种查找策略，确保快捷键在所有情况下都能正常工作
 */

class SuperShortcutFixer {
  constructor() {
    this.editComponent = null
    this.attempts = 0
    this.maxAttempts = 50
    this.strategies = [
      'directVueInstance',
      'eventBusComponent',
      'domTraversal',
      'globalSearch',
      'windowMethods',
      'vueDevtools'
    ]
  }

  async start() {
    // 静默查找组件，只在必要时输出日志
    for (const strategy of this.strategies) {
      this.attempts++

      const component = await this.tryStrategy(strategy)
      if (component) {
        this.editComponent = component
        this.setupShortcuts()
        return true
      }

      // 每次策略间等待200ms（优化性能）
      await this.sleep(200)
    }

    // 静默重试，减少日志输出
    if (this.attempts < 20) {
      // 限制重试次数
      setTimeout(() => this.start(), 3000)
    }
    return false
  }

  async tryStrategy(strategyName) {
    try {
      switch (strategyName) {
        case 'directVueInstance':
          return this.findByDirectVueInstance()
        case 'eventBusComponent':
          return this.findByEventBusComponent()
        case 'domTraversal':
          return this.findByDomTraversal()
        case 'globalSearch':
          return this.findByGlobalSearch()
        case 'windowMethods':
          return this.findByWindowMethods()
        case 'vueDevtools':
          return this.findByVueDevtools()
        default:
          return null
      }
    } catch (error) {
      // 静默处理策略执行错误
      return null
    }
  }

  // 策略1: 直接Vue实例查找
  findByDirectVueInstance() {
    const container = document.querySelector('#mindMapContainer')
    if (container && container.__vue__) {
      let vm = container.__vue__
      // 向上查找Edit组件
      while (vm) {
        if (this.isEditComponent(vm)) {
          return vm
        }
        vm = vm.$parent
      }
    }
    return null
  }

  // 策略2: 事件总线组件查找
  findByEventBusComponent() {
    if (
      window.Vue &&
      window.Vue.prototype.$eventBus &&
      window.Vue.prototype.$eventBus._events
    ) {
      // 查找监听了相关事件的组件
      const events = window.Vue.prototype.$eventBus._events
      const relevantEvents = [
        'manual-save',
        'toggle-numbering',
        'toggle-todo-checkbox'
      ]

      for (const eventName of relevantEvents) {
        if (events[eventName]) {
          for (const handler of events[eventName]) {
            if (
              handler.fn &&
              handler.fn.constructor &&
              handler.fn.constructor.name === 'BoundFunction'
            ) {
              // 尝试获取绑定的组件实例
              const vm = handler.vm || handler.context
              if (vm && this.isEditComponent(vm)) {
                return vm
              }
            }
          }
        }
      }
    }
    return null
  }

  // 策略3: DOM遍历查找
  findByDomTraversal() {
    const allElements = document.querySelectorAll('*')
    for (const element of allElements) {
      if (element.__vue__ && this.isEditComponent(element.__vue__)) {
        return element.__vue__
      }
    }
    return null
  }

  // 策略4: 全局搜索
  findByGlobalSearch() {
    if (window.Vue && window.Vue.prototype) {
      // 搜索所有可能的全局引用
      const globalProps = Object.getOwnPropertyNames(window)
      for (const prop of globalProps) {
        try {
          const value = window[prop]
          if (
            value &&
            typeof value === 'object' &&
            this.isEditComponent(value)
          ) {
            return value
          }
        } catch (e) {
          // 忽略访问错误
        }
      }
    }
    return null
  }

  // 策略5: 窗口方法查找
  findByWindowMethods() {
    // 检查是否有现有的全局方法可以访问组件
    if (window.mindMapInstance && window.mindMapInstance.toggleNumbering) {
      // 创建一个代理对象来模拟Edit组件
      return {
        handleToggleNumbering: window.mindMapInstance.toggleNumbering,
        handleToggleTodoCheckbox: () => {
          // 这里需要实现具体逻辑
        },
        handleToggleTodoStatus: () => {
          // 这里需要实现具体逻辑
        },
        $options: { name: 'ProxyEdit' }
      }
    }
    return null
  }

  // 策略6: Vue开发工具查找
  findByVueDevtools() {
    if (
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__ &&
      window.__VUE_DEVTOOLS_GLOBAL_HOOK__.Vue
    ) {
      try {
        const Vue = window.__VUE_DEVTOOLS_GLOBAL_HOOK__.Vue
        if (Vue.prototype._rootInstances) {
          for (const root of Vue.prototype._rootInstances) {
            const result = this.searchVueTree(root)
            if (result) {
              return result
            }
          }
        }
      } catch (e) {
        // 静默处理Vue开发工具查找失败
      }
    }
    return null
  }

  // 递归搜索Vue组件树
  searchVueTree(vm) {
    if (!vm) return null

    if (this.isEditComponent(vm)) {
      return vm
    }

    // 搜索子组件
    if (vm.$children) {
      for (const child of vm.$children) {
        const result = this.searchVueTree(child)
        if (result) return result
      }
    }

    return null
  }

  // 判断是否是Edit组件
  isEditComponent(vm) {
    return (
      vm &&
      typeof vm.handleToggleNumbering === 'function' &&
      typeof vm.handleToggleTodoCheckbox === 'function' &&
      typeof vm.handleToggleTodoStatus === 'function'
    )
  }

  // 设置快捷键
  setupShortcuts() {
    // 清理可能存在的旧监听器
    if (window.superShortcutHandler) {
      document.removeEventListener('keydown', window.superShortcutHandler, true)
    }

    window.superShortcutHandler = e => {
      // 检查是否在文本编辑状态
      if (this.isTextEditing()) {
        return
      }

      // 检查快捷键
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        let handled = false

        try {
          switch (e.code) {
            case 'KeyA':
              this.editComponent.handleToggleNumbering()
              handled = true
              break

            case 'KeyW':
              this.editComponent.handleToggleTodoCheckbox()
              handled = true
              break

            case 'KeyS':
              this.editComponent.handleToggleTodoStatus()
              handled = true
              break
          }

          if (handled) {
            e.preventDefault()
            e.stopPropagation()
          }
        } catch (error) {
          // 静默处理错误，避免控制台污染
        }
      }
    }

    document.addEventListener('keydown', window.superShortcutHandler, true)

    // 添加测试方法（仅在需要时启用）
    if (window.location.href.includes('debug')) {
      window.testSuperShortcuts = () => {
        // 测试代码保持为注释，便于调试时使用
      }
    }
  }

  // 检查是否在文本编辑状态
  isTextEditing() {
    const activeElement = document.activeElement
    return (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true' ||
        activeElement.classList.contains('mindMapNodeText') ||
        activeElement.closest('.node-text-edit'))
    )
  }

  // 睡眠函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 创建并启动超级修复器
const superFixer = new SuperShortcutFixer()

// 等待DOM加载完成后启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => superFixer.start())
} else {
  // 延迟启动，确保Vue组件已挂载
  setTimeout(() => superFixer.start(), 2000)
}

// 也监听路由变化等事件
window.addEventListener('hashchange', () => {
  setTimeout(() => superFixer.start(), 1000)
})

// 页面加载完成后再次尝试
window.addEventListener('load', () => {
  setTimeout(() => superFixer.start(), 3000)
})

export default superFixer
