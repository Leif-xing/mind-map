<template>
  <div class="leftSidebarTrigger" :class="{ isDark: isDark }">
    <!-- 左侧边栏 -->
    <transition name="slide-right">
      <div 
        v-show="isVisible" 
        class="sidebar-container"
      >
        <!-- 侧边栏背景 -->
        <div class="sidebar-background"></div>
        
        <!-- 侧边栏内容 -->
        <div class="sidebar-content">
          <!-- 导图管理按钮 -->
          <div 
            class="sidebar-item"
            @click="openMindmapManager"
            :class="{ active: currentPage === 'mindmap-manager' }"
          >
            <div class="item-icon">
              <i class="iconfont iconguanli"></i>
            </div>
            <div class="item-label">导图管理</div>
          </div>
          
          <!-- 关于按钮 -->
          <div 
            class="sidebar-item"
            @click="openAbout"
            :class="{ active: currentPage === 'about' }"
          >
            <div class="item-icon">
              <i class="iconfont iconbangzhu"></i>
            </div>
            <div class="item-label">关于</div>
          </div>
        </div>
        
        <!-- 底部装饰 -->
        <div class="sidebar-footer">
          <div class="brand-mark">
            <i class="iconfont iconlogo"></i>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'LeftSidebarTrigger',
  data() {
    return {
      isVisible: false,
      hideTimer: null,
      currentPage: '' // 当前激活的页面
    }
  },
  computed: {
    ...mapState(['localConfig']),
    
    isDark() {
      return this.localConfig.isDark
    }
  },
  created() {
    // 监听页面切换事件
    this.$bus.$on('pageChanged', this.handlePageChange)
    
    // 监听显示左侧边栏事件
    this.$bus.$on('showLeftSidebar', this.showSidebar)
    
    // 添加键盘事件监听
    window.addEventListener('keydown', this.handleKeyDown)
  },
  beforeDestroy() {
    this.$bus.$off('pageChanged', this.handlePageChange)
    this.$bus.$off('showLeftSidebar', this.showSidebar)
    this.cancelHideTimer()
    
    // 移除键盘事件监听
    window.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    // 显示侧边栏
    showSidebar() {
      this.cancelHideTimer()
      this.isVisible = true
      
      // 更新store中的activeSidebar状态
      this.$store.commit('setActiveSidebar', 'left')
      
      // 不再设置自动隐藏，等待用户操作
    },
    
    // 开始隐藏计时器
    startHideTimer() {
      this.cancelHideTimer()
      this.hideTimer = setTimeout(() => {
        this.isVisible = false
      }, 5000) // 5秒后自动隐藏
    },
    
    // 取消隐藏计时器
    cancelHideTimer() {
      if (this.hideTimer) {
        clearTimeout(this.hideTimer)
        this.hideTimer = null
      }
    },
    
    // 打开思维导图管理
    openMindmapManager() {
      this.currentPage = 'mindmap-manager'
      this.isVisible = false
      this.cancelHideTimer()
      
      // 更新store中的activeSidebar状态
      this.$store.commit('setActiveSidebar', '')
      
      this.$bus.$emit('openMindmapManager')
    },
    
    // 打开关于页面
    openAbout() {
      this.currentPage = 'about'
      this.isVisible = false
      
      // 更新store中的activeSidebar状态
      this.$store.commit('setActiveSidebar', '')
      
      this.$message.info('关于页面功能开发中...')
    },
    
    // 处理页面切换
    handlePageChange(page) {
      this.currentPage = page
    },
    
    // 处理键盘事件
    handleKeyDown(event) {
      // 检查是否按下ESC键且左侧边栏正在显示
      if (event.key === 'Escape' && this.isVisible) {
        event.preventDefault()
        this.closeSidebarAndRestoreToolbar()
      }
    },
    
    // 关闭侧边栏并恢复工具栏状态
    closeSidebarAndRestoreToolbar() {
      // 隐藏侧边栏
      this.isVisible = false
      this.cancelHideTimer()
      
      // 更新store中的activeSidebar状态
      this.$store.commit('setActiveSidebar', '')
      
      // 触发恢复工具栏状态的事件
      this.$bus.$emit('backFromMindmapManager')
    }
  }
}
</script>

<style scoped>
.leftSidebarTrigger {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: 2000;
  pointer-events: none;
}

/* 侧边栏容器 */
.sidebar-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 240px;
  height: 100vh;
  pointer-events: all;
  display: flex;
  flex-direction: column;
}

/* 侧边栏背景 */
.sidebar-background {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-color);
  border-right: 1px solid var(--border-color);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

/* 侧边栏内容 */
.sidebar-content {
  position: relative;
  padding: 40px 20px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 侧边栏项目 */
.sidebar-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.sidebar-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 100%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-light));
  transition: width 0.3s ease;
  z-index: -1;
}

.sidebar-item:hover {
  background: var(--bg-color-2);
  transform: translateX(8px);
}

.sidebar-item:hover::before {
  width: 100%;
}

.sidebar-item:hover .item-icon,
.sidebar-item:hover .item-label {
  color: white;
}

.sidebar-item.active {
  background: var(--primary-color);
  color: white;
}

.sidebar-item.active .item-icon,
.sidebar-item.active .item-label {
  color: white;
}

/* 图标 */
.item-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 18px;
  color: var(--text-color);
  transition: color 0.3s ease;
}

/* 标签 */
.item-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-color);
  transition: color 0.3s ease;
}

/* 底部装饰 */
.sidebar-footer {
  position: relative;
  padding: 20px;
  text-align: center;
}

.brand-mark {
  width: 40px;
  height: 40px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-color-light));
  color: white;
  font-size: 20px;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.brand-mark:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* 滑入动画 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter,
.slide-right-leave-to {
  transform: translateX(-100%);
}

/* 深色主题适配 */
.isDark .sidebar-background {
  background: #1E1E1E !important; /* 更深更清晰的背景 */
  border-color: #404040 !important;
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.4) !important; /* 更强的阴影效果 */
}

.isDark .sidebar-item {
  color: #E4E7ED !important; /* 确保文字清晰可见 */
}

.isDark .sidebar-item:hover {
  background: #2A2A2A !important; /* 更清晰的悬停效果 */
}

.isDark .sidebar-item:hover .item-icon,
.isDark .sidebar-item:hover .item-label {
  color: #FFFFFF !important; /* 悬停时文字更清晰 */
}

.isDark .sidebar-item.active {
  background: #4A9EFF !important; /* 活跃状态更清晰 */
  color: #FFFFFF !important;
}

.isDark .item-icon {
  color: #C0C4CC !important; /* 图标颜色更清晰 */
}

.isDark .item-label {
  color: #E4E7ED !important; /* 标签文字颜色更清晰 */
}

.isDark .sidebar-item.active .item-icon,
.isDark .sidebar-item.active .item-label {
  color: #FFFFFF !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar-container {
    width: 200px;
  }
  
  .sidebar-content {
    padding: 30px 15px 15px;
  }
  
  .sidebar-item {
    padding: 12px 16px;
  }
  
  .item-icon {
    font-size: 16px;
    margin-right: 10px;
  }
  
  .item-label {
    font-size: 14px;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .sidebar-background {
    border-width: 2px;
  }
  
  .sidebar-item {
    border: 1px solid transparent;
  }
  
  .sidebar-item:hover,
  .sidebar-item.active {
    border-color: var(--primary-color);
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .sidebar-item,
  .brand-mark,
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: none;
  }
  
  .sidebar-item:hover {
    transform: none;
  }
}
</style>