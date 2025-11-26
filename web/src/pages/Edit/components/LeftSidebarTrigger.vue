<template>
  <div class="leftSidebarTrigger" :class="{ isDark: isDark }">
    <!-- 左侧边栏 -->
    <transition name="slide-right">
      <div v-show="isVisible" class="sidebar-container">
        <!-- 侧边栏背景 -->
        <div class="sidebar-background"></div>

        <!-- 侧边栏内容 -->
        <div class="sidebar-content">
          <!-- 思维导图按钮 -->
          <div
            class="nav-item"
            @click="openMindmapManager"
            :class="{ active: currentPage === 'mindmap-manager' }"
          >
            <i>📑</i>
            <span>思维导图</span>
          </div>

          <!-- 关于按钮 -->
          <div
            class="nav-item"
            @click="openAbout"
            :class="{ active: currentPage === 'about' }"
          >
            <i>ℹ️</i>
            <span>关于</span>
          </div>

          <!-- 分割线 -->
          <div class="divider"></div>

          <!-- 用户区域 -->
          <div
            class="nav-item"
            @click="toggleUserMenu"
            :class="{ active: showUserMenu }"
          >
            <i>👤</i>
            <span class="username" v-if="currentUser">
              {{ currentUser.username || currentUser.email || '用户' }}
            </span>
          </div>
        </div>

        <!-- 子菜单 -->
        <div v-show="showUserMenu" class="submenu" @click.stop>
          <div class="nav-item submenu-item" @click="handleChangePassword">
            <div class="item-icon">
              <i class="el-icon-edit"></i>
            </div>
            <span>修改密码</span>
          </div>

          <div class="nav-item submenu-item" @click="handleLogout">
            <div class="item-icon">
              <i class="el-icon-switch-button"></i>
            </div>
            <span>退出登录</span>
          </div>
        </div>
      </div>
    </transition>
    <!-- 可拖拽的修改密码对话框 -->
    <draggable-password-dialog
      :visible.sync="showPasswordDialog"
      @cancel="handlePasswordDialogCancel"
      @success="handlePasswordDialogSuccess"
    ></draggable-password-dialog>
  </div>
</template>

<script>
  import { mapState } from 'vuex'
  import DraggablePasswordDialog from '@/components/DraggablePasswordDialog.vue'

  export default {
    name: 'LeftSidebarTrigger',
    components: {
      DraggablePasswordDialog
    },
    data() {
      return {
        isVisible: false,
        hideTimer: null,
        currentPage: '', // 当前激活的页面
        showUserMenu: false, // 显示用户菜单
        showPasswordDialog: false // 显示密码对话框
      }
    },
    computed: {
      ...mapState(['localConfig']),

      isDark() {
        return this.localConfig.isDark
      },

      currentUser() {
        return (
          this.$store.state.currentUser ||
          JSON.parse(localStorage.getItem('currentUser') || 'null')
        )
      }
    },
    created() {
      // 监听页面切换事件
      this.$bus.$on('pageChanged', this.handlePageChange)

      // 监听显示左侧边栏事件
      this.$bus.$on('showLeftSidebar', this.showSidebar)

      // 添加键盘事件监听
      window.addEventListener('keydown', this.handleKeyDown)

      // 添加点击事件监听器来关闭子菜单
      document.addEventListener('click', this.handleDocumentClick)
    },
    beforeDestroy() {
      this.$bus.$off('pageChanged', this.handlePageChange)
      this.$bus.$off('showLeftSidebar', this.showSidebar)
      this.cancelHideTimer()

      // 移除键盘事件监听
      window.removeEventListener('keydown', this.handleKeyDown)

      // 恢复快捷键功能
      this.restoreShortcuts()

      // 移除点击事件监听器
      document.removeEventListener('click', this.handleDocumentClick)
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
        // 🔧 修复:在设置新的快捷键屏蔽器之前,先清理可能存在的旧屏蔽器
        this.restoreShortcuts()

        this.currentPage = 'mindmap-manager'
        this.isVisible = false
        this.cancelHideTimer()

        // 更新store中的activeSidebar状态
        this.$store.commit('setActiveSidebar', '')

        this.$bus.$emit('openMindmapManager')
      },

      // 恢复快捷键功能
      restoreShortcuts() {
        if (this.preventDefaultShortcuts) {
          window.removeEventListener(
            'keydown',
            this.preventDefaultShortcuts,
            true
          )
          this.preventDefaultShortcuts = null
        }
        // 同时清理全局window对象上的处理器
        if (window.preventDefaultShortcutsHandler) {
          window.removeEventListener(
            'keydown',
            window.preventDefaultShortcutsHandler,
            true
          )
          window.preventDefaultShortcutsHandler = null
        }
      },

      // 打开关于页面
      openAbout() {
        // 🔧 修复:在设置新的快捷键屏蔽器之前,先清理可能存在的旧屏蔽器
        this.restoreShortcuts()

        this.currentPage = 'about'
        this.isVisible = false
        this.cancelHideTimer()

        // 更新store中的activeSidebar状态
        this.$store.commit('setActiveSidebar', '')

        this.$bus.$emit('openAbout')
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
      },

      // 切换用户菜单显示状态
      toggleUserMenu(event) {
        this.showUserMenu = !this.showUserMenu
        if (this.showUserMenu && event && event.target) {
          this.$nextTick(() => {
            const submenu = document.querySelector('.submenu')
            if (submenu) {
              // 子菜单现在相对于侧边栏容器定位，所以不需要设置绝对位置
              // 它会自动对齐到用户菜单项
            }
          })
        }
      },

      // 关闭用户菜单
      closeUserMenu() {
        this.showUserMenu = false
      },

      // 处理文档点击事件
      handleDocumentClick(e) {
        const sidebarContainer = document.querySelector('.sidebar-container')

        if (!sidebarContainer) return

        if (!sidebarContainer.contains(e.target)) {
          this.showUserMenu = false
        }
      },

      // 处理修改密码
      handleChangePassword() {
        this.showPasswordDialog = true
        this.showUserMenu = false
      },

      // 处理密码对话框取消事件
      handlePasswordDialogCancel() {
        this.showPasswordDialog = false
      },

      // 处理密码对话框成功事件
      handlePasswordDialogSuccess() {
        this.showPasswordDialog = false
        this.$message.success('密码修改成功')
      },

      // 处理退出登录
      handleLogout() {
        this.logout()
        this.showUserMenu = false
      },

      // 退出登录
      logout() {
        this.closeUserMenu()
        // 触发退出登录事件
        this.$bus.$emit('logout')
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
    top: 50%;
    transform: translateY(-50%);
    width: 180px;
    height: auto;
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
    background-color: #2f3542;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-top-right-radius: 24px;
    border-bottom-right-radius: 24px;
  }

  /* 侧边栏内容 */
  .sidebar-content {
    position: relative;
    padding: 0;
    flex: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* 导航项样式 */
  .nav-item {
    width: 100%;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    color: #fff;
    cursor: pointer;
    box-sizing: border-box;
    position: relative;
    background-color: transparent;
  }

  .nav-item i {
    margin-right: 10px;
    width: 20px;
    text-align: center;
  }

  .nav-item::before {
    content: '';
    position: absolute;
    inset: 0;
    background-color: transparent;
    transition: background-color 0.3s;
    z-index: 0;
  }

  .nav-item:hover::before {
    background-color: #57606f;
  }

  .sidebar-container .nav-item:first-child::before,
  .sidebar-container .nav-item:last-child::before {
    border-top-right-radius: 24px;
    border-bottom-right-radius: 24px;
  }

  .nav-item i,
  .nav-item span {
    position: relative;
    z-index: 1;
  }

  /* 分割线 */
  .divider {
    height: 2px;
    background: #43d5c1;
    width: calc(100% - 40px);
    margin: 10px auto;
  }

  /* 用户名样式 */
  .username {
    color: limegreen;
    /* 亮绿色 */
    font-size: 22px;
    /* 字体大小 */
    font-weight: bold;
  }

  /* 子菜单样式 */
  .submenu {
    display: flex;
    flex-direction: column;
    left: 180px;
    background-color: #2f3542;
    border-radius: 24px;
    position: absolute;
    top: calc(100% - 44px);
    /* 对齐到用户菜单项的位置 */
    width: 160px;
    z-index: 2001;
    pointer-events: all;
  }

  .submenu .nav-item {
    width: 100%;
    position: relative;
  }

  .submenu .nav-item::before {
    border-radius: 0;
  }

  .submenu .nav-item:first-child::before {
    border-top-left-radius: 24px;
    border-top-right-radius: 24px;
  }

  .submenu .nav-item:last-child::before {
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
  }

  .submenu .nav-item:hover::before {
    background-color: #57606f;
  }

  .submenu .item-icon {
    margin-right: 10px;
    width: 20px;
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .submenu .item-icon i {
    color: #fff;
    font-size: 16px;
  }

  .submenu .nav-item span {
    position: relative;
    z-index: 1;
    color: #fff;
  }

  /* 过渡动画 */
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: transform 0.3s ease;
  }

  .slide-right-enter,
  .slide-right-leave-to {
    transform: translateX(-100%);
  }
</style>
