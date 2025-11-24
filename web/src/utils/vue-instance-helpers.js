/**
 * Vue实例相关辅助函数
 */

/**
 * 通过Vue实例获取当前思维导图ID
 * 当直接通过 this.$store.state.currentMindMapId 无法获取到ID时，
 * 可以尝试通过DOM中的Vue实例获取
 * @returns {string|null} 思维导图ID，如果获取失败则返回null
 */
export function getCurrentMindMapIdFromVueInstance() {
  try {
    // 尝试从DOM中查找Vue实例
    const vueInstances = document.querySelectorAll(
      '[data-v-app], [id^="app"], [id*="vue"]'
    )
    if (vueInstances.length > 0) {
      const rootVue = vueInstances[0].__vue__
      if (
        rootVue &&
        rootVue.$store &&
        rootVue.$store.state &&
        rootVue.$store.state.currentMindMapId
      ) {
        return rootVue.$store.state.currentMindMapId
      }
    }

    // 如果还是获取不到，尝试从window对象查找全局Vue实例
    if (window.app && window.app.$store && window.app.$store.state) {
      return window.app.$store.state.currentMindMapId
    }

    // 尝试从Vue的全局实例查找（Vue 2.x）
    if (window.Vue && window.Vue.prototype && window.Vue.prototype.$store) {
      return window.Vue.prototype.$store.state.currentMindMapId
    }

    console.warn('无法通过Vue实例获取思维导图ID')
    return null
  } catch (error) {
    console.error('❌ 通过Vue实例获取思维导图ID时出错:', error)
    return null
  }
}

/**
 * 通过Vue实例获取Vuex store
 * @returns {Object|null} Vuex store实例，如果获取失败则返回null
 */
export function getStoreFromVueInstance() {
  try {
    // 尝试从DOM中查找Vue实例
    const vueInstances = document.querySelectorAll(
      '[data-v-app], [id^="app"], [id*="vue"]'
    )
    if (vueInstances.length > 0) {
      const rootVue = vueInstances[0].__vue__
      if (rootVue && rootVue.$store) {
        return rootVue.$store
      }
    }

    // 如果还是获取不到，尝试从window对象查找全局Vue实例
    if (window.app && window.app.$store) {
      return window.app.$store
    }

    // 尝试从Vue的全局实例查找（Vue 2.x）
    if (window.Vue && window.Vue.prototype && window.Vue.prototype.$store) {
      return window.Vue.prototype.$store
    }

    console.warn('无法通过Vue实例获取Vuex store')
    return null
  } catch (error) {
    console.error('❌ 通过Vue实例获取Vuex store时出错:', error)
    return null
  }
}
