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
        
        <!-- 底部用户区域 -->
        <div class="sidebar-footer">
          <div class="user-area" @click="toggleUserMenu" :class="{ active: showUserMenu }">
            <div class="user-avatar">
              <i class="el-icon-user-solid"></i>
            </div>
            <div class="user-info" v-if="currentUser">
              <div class="user-name">{{ currentUser.username || currentUser.email || '用户' }}</div>
            </div>
          </div>
        </div>
      </div>
    </transition>
    
    <!-- 右侧用户菜单面板 -->
    <transition name="slide-left">
      <div 
        v-show="showUserMenu" 
        class="user-menu-container"
        @click.stop
      >
        <!-- 用户菜单背景 -->
        <div class="user-menu-background"></div>
        
        <!-- 用户菜单内容 -->
        <div class="user-menu-content">
          <!-- 用户信息头部 -->
          <div class="user-menu-header" v-if="currentUser">
            <div class="user-avatar-large">
              <i class="el-icon-user-solid"></i>
            </div>
            <div class="user-details">
              <div class="user-name-large">{{ currentUser.username || '用户' }}</div>
              <div class="user-email">{{ currentUser.email || currentUser.id }}</div>
            </div>
          </div>
          
          <!-- 用户菜单项 -->
          <div class="user-menu-items">
            <div class="user-menu-item" @click="changePassword">
              <div class="item-icon">
                <i class="el-icon-edit"></i>
              </div>
              <div class="item-label">修改密码</div>
            </div>
            
            <div class="user-menu-item logout-item" @click="logout">
              <div class="item-icon">
                <i class="el-icon-switch-button"></i>
              </div>
              <div class="item-label">退出登录</div>
            </div>
          </div>
          
          <!-- 关闭按钮 -->
          <div class="user-menu-close" @click="closeUserMenu">
            <i class="el-icon-close"></i>
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
      currentPage: '', // 当前激活的页面
      showUserMenu: false, // 显示用户菜单
      // 密码修改相关
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    }
  },
  computed: {
    ...mapState(['localConfig']),
    
    isDark() {
      return this.localConfig.isDark
    },
    
    currentUser() {
      return this.$store.state.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null')
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
    },
    
    // 切换用户菜单显示状态
    toggleUserMenu() {
      this.showUserMenu = !this.showUserMenu
    },
    
    // 关闭用户菜单
    closeUserMenu() {
      this.showUserMenu = false
    },
    
    // 退出登录
    logout() {
      this.closeUserMenu()
      // 触发退出登录事件
      this.$bus.$emit('logout')
    },
    
    // 修改密码
    async changePassword() {
      // 获取当前用户信息
      const currentUser = this.currentUser;
      if (!currentUser) {
        this.$message.error('请先登录');
        return;
      }
      
      // 创建密码修改的弹窗
      const h = this.$createElement;
      
      const inputStyle = {
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
        boxSizing: 'border-box'
      };
      
      // 使用 Vue 的动态组件创建对话框
      this.$msgbox({
        title: '修改密码',
        message: h('div', null, [
          h('div', { style: { marginBottom: '10px' } }, [
            h('label', { style: { display: 'block', marginBottom: '5px' } }, '当前密码:'),
            h('input', {
              attrs: { type: 'password', placeholder: '请输入当前密码' },
              style: {
                ...inputStyle,
                backgroundColor: '#fff', // 输入框保持白色
                color: '#000',
                border: '1px solid #dcdfe6'
              },
              domProps: { value: this.currentPassword },
              on: {
                input: (event) => {
                  this.currentPassword = event.target.value;
                }
              }
            })
          ]),
          h('div', { style: { marginBottom: '10px' } }, [
            h('label', { style: { display: 'block', marginBottom: '5px' } }, '新密码:'),
            h('input', {
              attrs: { type: 'password', placeholder: '请输入新密码' },
              style: {
                ...inputStyle,
                backgroundColor: '#fff', // 输入框保持白色
                color: '#000',
                border: '1px solid #dcdfe6'
              },
              domProps: { value: this.newPassword },
              on: {
                input: (event) => {
                  this.newPassword = event.target.value;
                }
              }
            })
          ]),
          h('div', { style: { marginBottom: '10px' } }, [
            h('label', { style: { display: 'block', marginBottom: '5px' } }, '确认新密码:'),
            h('input', {
              attrs: { type: 'password', placeholder: '请再次输入新密码' },
              style: {
                ...inputStyle,
                backgroundColor: '#fff', // 输入框保持白色
                color: '#000',
                border: '1px solid #dcdfe6'
              },
              domProps: { value: this.confirmNewPassword },
              on: {
                input: (event) => {
                  this.confirmNewPassword = event.target.value;
                }
              }
            })
          ])
        ]),
        showCancelButton: true,
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: 'el-message-box-gray', // 使用灰色主题
        beforeClose: (action, instance, done) => {
          if (action === 'confirm') {
            // 验证输入
            if (!this.currentPassword) {
              this.$message.error('请输入当前密码');
              return;
            }
            
            if (!this.newPassword || this.newPassword.length < 6) {
              this.$message.error('新密码长度不能少于6位');
              return;
            }
            
            if (this.newPassword !== this.confirmNewPassword) {
              this.$message.error('两次输入的新密码不一致');
              return;
            }
            
            // 验证当前密码是否正确
            if (this.currentPassword !== currentUser.password) {
              this.$message.error('当前密码输入错误');
              return;
            }
            
            // 更新用户密码
            this.updatePassword(currentUser).then(() => {
              this.$message.success('密码修改成功');
              this.resetPasswordFields();
              done();
            }).catch(error => {
              this.$message.error('密码修改失败: ' + error.message);
            });
          } else {
            this.resetPasswordFields();
            done();
          }
        }
      });
    },
    
    // 更新密码
    async updatePassword(currentUser) {
      try {
        // 更新用户密码
        const updatedUser = { ...currentUser, password: this.newPassword };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        // 如果使用 Supabase，也需要更新数据库中的密码
        if (this.$store.state.supabaseEnabled) {
          await this.$store.dispatch('updateUserPassword', {
            userId: currentUser.id,
            newPassword: this.newPassword
          });
        }
        
        // 重置表单数据
        this.resetPasswordFields();
      } catch (error) {
        throw error;
      }
    },
    
    // 重置密码字段
    resetPasswordFields() {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
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

/* 用户区域样式 */
.user-area {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  margin: 0 8px 8px 8px;
  background: rgba(64, 158, 255, 0.1);
  border: 1px solid rgba(64, 158, 255, 0.2);
}

.user-area:hover {
  background: rgba(64, 158, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.user-area.active {
  background: rgba(64, 158, 255, 0.2);
  border-color: #409eff;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.user-avatar i {
  color: white;
  font-size: 16px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧用户菜单容器 */
.user-menu-container {
  position: fixed;
  right: 0;
  top: 0;
  width: 280px;
  height: 100vh;
  z-index: 2001;
  pointer-events: all;
  display: flex;
  flex-direction: column;
}

/* 用户菜单背景 */
.user-menu-background {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-color, #fff);
  border-left: 1px solid var(--border-color, #e8e8e8);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

/* 用户菜单内容 */
.user-menu-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

/* 用户菜单头部 */
.user-menu-header {
  display: flex;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid var(--border-color, #e8e8e8);
  margin-bottom: 20px;
}

.user-avatar-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  flex-shrink: 0;
}

.user-avatar-large i {
  color: white;
  font-size: 24px;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name-large {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color, #333);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 12px;
  color: var(--text-secondary-color, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 用户菜单项 */
.user-menu-items {
  flex: 1;
}

.user-menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  margin-bottom: 8px;
}

.user-menu-item:hover {
  background: var(--hover-bg-color, rgba(64, 158, 255, 0.1));
}

.user-menu-item .item-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.user-menu-item .item-icon i {
  font-size: 16px;
  color: var(--icon-color, #666);
}

.user-menu-item .item-label {
  font-size: 14px;
  color: var(--text-color, #333);
  font-weight: 500;
}

.user-menu-item.logout-item:hover {
  background: rgba(245, 108, 108, 0.1);
}

.user-menu-item.logout-item:hover .item-icon i,
.user-menu-item.logout-item:hover .item-label {
  color: #f56c6c;
}

/* 关闭按钮 */
.user-menu-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--close-bg-color, rgba(0, 0, 0, 0.1));
}

.user-menu-close:hover {
  background: var(--close-hover-bg-color, rgba(0, 0, 0, 0.2));
  transform: rotate(90deg);
}

.user-menu-close i {
  font-size: 14px;
  color: var(--close-icon-color, #666);
}

/* 动画效果 */
.slide-left-enter-active, .slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter, .slide-left-leave-to {
  transform: translateX(100%);
}

/* 深色主题样式 */
.leftSidebarTrigger.isDark .user-area {
  background: rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.3);
}

.leftSidebarTrigger.isDark .user-area:hover {
  background: rgba(64, 158, 255, 0.2);
}

.leftSidebarTrigger.isDark .user-name {
  color: rgba(255, 255, 255, 0.9);
}

.leftSidebarTrigger.isDark .user-menu-background {
  background: var(--bg-color, #262a2e);
  border-left-color: rgba(255, 255, 255, 0.1);
}

.leftSidebarTrigger.isDark .user-menu-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.leftSidebarTrigger.isDark .user-name-large {
  color: rgba(255, 255, 255, 0.9);
}

.leftSidebarTrigger.isDark .user-email {
  color: rgba(255, 255, 255, 0.6);
}

.leftSidebarTrigger.isDark .user-menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.leftSidebarTrigger.isDark .user-menu-item .item-icon i {
  color: rgba(255, 255, 255, 0.7);
}

.leftSidebarTrigger.isDark .user-menu-item .item-label {
  color: rgba(255, 255, 255, 0.9);
}

.leftSidebarTrigger.isDark .user-menu-close {
  background: rgba(255, 255, 255, 0.1);
}

.leftSidebarTrigger.isDark .user-menu-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.leftSidebarTrigger.isDark .user-menu-close i {
  color: rgba(255, 255, 255, 0.7);
}
</style>