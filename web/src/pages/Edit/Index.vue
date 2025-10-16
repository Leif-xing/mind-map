<template>
  <div
    class="container"
    :class="{ isDark: isDark, activeSidebar: activeSidebar }"
  >
    <template v-if="show">
      <Toolbar v-if="!isZenMode"></Toolbar>
      <Edit></Edit>
    </template>
  </div>
</template>

<script>
import Toolbar from './components/Toolbar.vue'
import Edit from './components/Edit.vue'
import { mapState, mapMutations } from 'vuex'
import { getLocalConfig } from '@/api'

export default {
  components: {
    Toolbar,
    Edit
  },
  data() {
    return {
      show: false
    }
  },
  computed: {
    ...mapState({
      isZenMode: state => state.localConfig.isZenMode,
      isDark: state => state.localConfig.isDark,
      activeSidebar: state => state.activeSidebar
    })
  },
  created() {
    // 检查用户是否已登录，如果没有则重定向到登录页面
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
    if (!currentUser) {
      this.$router.push('/login')
      return
    }
    
    // 检查用户导图权限
    if (!currentUser.isAdmin && currentUser.mindMapPermission !== 1) {
      this.$message.warning('您没有导图权限，请联系管理员开通')
      this.$router.push('/login')
      return
    }
    
    // 如果是管理员访问思维导图页面，可以保留，但也可以添加提示
    if (currentUser.isAdmin) {
      // 管理员正在使用思维导图功能
    }
    
    this.initLocalConfig()
    const loading = this.$loading({
      lock: true,
      text: this.$t('other.loading')
    })
    this.show = true
    loading.close()
    this.setBodyDark()
    
    // 检查并恢复刷新前的思维导图ID
    this.checkAndRestoreMindMapId()
    
    // 监听键盘事件来处理快捷键
    window.addEventListener('keydown', this.handleKeyDown)
    
    // 监听退出登录事件
    this.$bus.$on('logout', this.handleLogout)
  },
  methods: {
    ...mapMutations(['setLocalConfig', 'setCurrentMindMapId']),

    // 初始化本地配置
    initLocalConfig() {
      let config = getLocalConfig()
      if (config) {
        this.setLocalConfig({
          ...this.$store.state.localConfig,
          ...config
        })
      }
    },

    // 检查并恢复刷新前的思维导图ID
    checkAndRestoreMindMapId() {
      const refreshId = localStorage.getItem('REFRESH_ID');
      if (refreshId) {
        this.setCurrentMindMapId(refreshId);
        // 清除已使用的REFRESH_ID
        localStorage.removeItem('REFRESH_ID');
      }
    },

    setBodyDark() {
      this.isDark
        ? document.body.classList.add('isDark')
        : document.body.classList.remove('isDark')
    },
    
    // 处理键盘快捷键
    handleKeyDown(event) {
      // 检查是否按下 Ctrl+G (或 Cmd+G on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault() // 阻止默认的Ctrl+G浏览器行为
        // 触发AI创建事件
        this.$bus.$emit('open_ai_create')
      }
    },
    
    handleLoadMindMap(mindMap) {
      // 检查当前思维导图是否有未保存的更改
      this.$confirm('当前思维导图可能有未保存的更改，是否继续加载新思维导图？', '确认', {
        confirmButtonText: '继续',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        // 用户确认加载新思维导图
        this.$bus.$emit('loadMindMapData', mindMap)
      }).catch(() => {
        // 用户取消操作
        // 用户取消加载思维导图
      })
    },
    
    handleLogout() {
      // 清除用户登录信息
      localStorage.removeItem('currentUser')
      
      // 跳转到登录页面
      this.$router.push('/login')
      
      // 显示成功消息
      this.$message.success('已退出登录')
    }
  },
  
  beforeDestroy() {
    // 移除键盘事件监听
    window.removeEventListener('keydown', this.handleKeyDown)
    
    // 移除退出登录事件监听
    this.$bus.$off('logout', this.handleLogout)
  }
}
</script>

<style lang="less">
.container {
}

body {
  &.isDark {
    /* el-button */
    .el-button {
      background-color: #363b3f;
      color: hsla(0, 0%, 100%, 0.9);
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    /* el-input */
    .el-input__inner {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
      color: hsla(0, 0%, 100%, 0.9);
    }

    .el-input.is-disabled .el-input__inner {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
      color: hsla(0, 0%, 100%, 0.3);
    }

    .el-input-group__append,
    .el-input-group__prepend {
      background-color: #363b3f;
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    .el-input-group__append button.el-button {
      color: hsla(0, 0%, 100%, 0.9);
    }

    /* el-select */
    .el-select-dropdown {
      background-color: #36393d;
      border-color: hsla(0, 0%, 100%, 0.1);

      .el-select-dropdown__item {
        color: hsla(0, 0%, 100%, 0.6);
      }

      .el-select-dropdown__item.selected {
        color: #409eff;
      }

      .el-select-dropdown__item.hover,
      .el-select-dropdown__item:hover {
        background-color: hsla(0, 0%, 100%, 0.05);
      }
    }

    .el-select .el-input.is-disabled .el-input__inner:hover {
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    /* el-popper*/
    .el-popper {
      background-color: #36393d;
      border-color: hsla(0, 0%, 100%, 0.1);
    }

    .el-popper[x-placement^='bottom'] .popper__arrow {
      background-color: #36393d;
    }

    .el-popper[x-placement^='bottom'] .popper__arrow::after {
      border-bottom-color: #36393d;
    }

    .el-popper[x-placement^='top'] .popper__arrow {
      background-color: #36393d;
    }

    .el-popper[x-placement^='top'] .popper__arrow::after {
      border-top-color: #36393d;
    }

    /* el-tabs */
    .el-tabs__item {
      color: hsla(0, 0%, 100%, 0.6);

      &:hover,
      &.is-active {
        color: #409eff;
      }
    }

    .el-tabs__nav-wrap::after {
      background-color: hsla(0, 0%, 100%, 0.6);
    }

    /* el-slider */
    .el-slider__runway {
      background-color: hsla(0, 0%, 100%, 0.6);
    }

    /* el-radio-group */
    .el-radio-group {
      .el-radio-button__inner {
        background-color: #36393d;
        color: hsla(0, 0%, 100%, 0.6);
      }

      .el-radio-button__orig-radio:checked + .el-radio-button__inner {
        color: #fff;
        background-color: #409eff;
      }
    }

    /* el-dialog */
    .el-dialog {
      background-color: #262a2e;

      .el-dialog__header {
        border-bottom: 1px solid hsla(0, 0%, 100%, 0.1);
      }

      .el-dialog__title {
        color: hsla(0, 0%, 100%, 0.9);
      }

      .el-dialog__body {
        background-color: #262a2e;
      }

      .el-dialog__footer {
        border-top: 1px solid hsla(0, 0%, 100%, 0.1);
      }
    }

    /* el-upload */
    .el-upload__tip {
      color: #999;
    }

    /* 富文本编辑器 */
    .toastui-editor-main-container {
      background-color: #fff;
    }
  }
}
</style>
