import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// 导入统一快捷键系统
import './utils/shortcut-integration.js'
import './utils/shortcut-activator.js'
import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import '@/assets/icon-font/iconfont.css'
import 'viewerjs/dist/viewer.css'
import VueViewer from 'v-viewer'
import i18n from './i18n'
import { getLang } from '@/api'
import Message from './element-ui-config' // 导入禁用消息的配置
import { dragDirective } from './element-ui-config' // 导入拖拽指令
import { mindMapCacheManager } from '@/utils/mindmap-cache-manager'
import '@/styles/dialog-z-index-fix.less' // 导入对话框层级修复样式

// 初始化缓存管理器
mindMapCacheManager.init()

// 将缓存管理器添加到Vue原型中，方便全局访问
Vue.prototype.$mindMapCacheManager = mindMapCacheManager

// 将缓存管理器添加到store中
store.state.mindMapCacheManager = mindMapCacheManager

Vue.config.productionTip = false
const bus = new Vue()
Vue.prototype.$bus = bus
Vue.prototype.$message = Message // 使用禁用消息的配置
Vue.use(ElementUI)
Vue.use(VueViewer)
Vue.directive('drag-dialog', dragDirective)

const initApp = () => {
  i18n.locale = getLang()
  new Vue({
    render: h => h(App),
    router,
    store,
    i18n
  }).$mount('#app')
}

// 是否处于接管应用模式
if (window.takeOverApp) {
  window.initApp = initApp
  window.$bus = bus
} else {
  initApp()
}
