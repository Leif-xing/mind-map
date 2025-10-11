<template>
  <div class="navigatorContainer customScrollbar" :class="{ isDark: isDark }">
    <!-- 可折叠的右侧边栏 -->
    <div class="sidebar-container" :class="{ expanded: isSidebarExpanded }" @mouseenter="expandSidebar" @mouseleave="collapseSidebar">
      <div class="sidebar-content" v-show="isSidebarExpanded" @mouseenter="expandSidebar">
        <div class="item">
          <el-select
            v-model="lang"
            size="small"
            style="width: 100px"
            @change="onLangChange"
          >
            <el-option
              v-for="item in langList"
              :key="item.value"
              :label="item.name"
              :value="item.value"
            />
          </el-select>
        </div>
        <div class="item">
          <el-tooltip
            effect="dark"
            :content="$t('navigatorToolbar.backToRoot')"
            placement="top"
          >
            <div class="btn iconfont icondingwei" @click="backToRoot"></div>
          </el-tooltip>
        </div>
        <div class="item">
          <div class="btn iconfont iconsousuo" @click="showSearch"></div>
        </div>
        <div class="item">
          <MouseAction :isDark="isDark" :mindMap="mindMap"></MouseAction>
        </div>
        <div class="item">
          <el-tooltip
            effect="dark"
            :content="
              openMiniMap
                ? $t('navigatorToolbar.closeMiniMap')
                : $t('navigatorToolbar.openMiniMap')
            "
            placement="top"
          >
            <div class="btn iconfont icondaohang1" @click="toggleMiniMap"></div>
          </el-tooltip>
        </div>
        <div class="item">
          <!-- <el-switch
            v-model="isReadonly"
            :active-text="$t('navigatorToolbar.readonly')"
            :inactive-text="$t('navigatorToolbar.edit')"
            @change="readonlyChange"
          >
          </el-switch> -->
          <el-tooltip
            effect="dark"
            :content="
              isReadonly
                ? $t('navigatorToolbar.edit')
                : $t('navigatorToolbar.readonly')
            "
            placement="top"
          >
            <div
              class="btn iconfont"
              :class="[isReadonly ? 'iconyanjing' : 'iconbianji1']"
              @click="readonlyChange"
            ></div>
          </el-tooltip>
        </div>
        <div class="item">
          <Fullscreen :isDark="isDark" :mindMap="mindMap"></Fullscreen>
        </div>
        <div class="item">
          <Scale :isDark="isDark" :mindMap="mindMap"></Scale>
        </div>
        <div class="item">
          <div
            class="btn iconfont"
            :class="[isDark ? 'iconmoon_line' : 'iconlieri']"
            @click="toggleDark"
          ></div>
        </div>
        <!-- <div class="item">
          <el-tooltip
            effect="dark"
            :content="$t('navigatorToolbar.changeSourceCodeEdit')"
            placement="top"
          >
            <div class="btn iconfont iconyuanma" @click="openSourceCodeEdit"></div>
          </el-tooltip>
        </div> -->
        <div class="item">
          <Demonstrate :isDark="isDark" :mindMap="mindMap"></Demonstrate>
        </div>
        <div class="item">
          <el-dropdown @command="handleCommand">
            <div class="btn el-icon-more"></div>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="shortcutKey">
                <span class="iconfont iconjianpan"></span>
                {{ $t('navigatorToolbar.shortcutKeys') }}
              </el-dropdown-item>
              <el-dropdown-item command="aiChat">
                <span class="iconfont iconAIshengcheng"></span>
                {{ $t('navigatorToolbar.ai') }}
              </el-dropdown-item>
              <el-dropdown-item command="client">
                <span class="iconfont iconxiazai"></span>
                {{ $t('navigatorToolbar.downloadClient') }}
              </el-dropdown-item>
              <el-dropdown-item command="github">
                <span class="iconfont icongithub"></span>
                Github
              </el-dropdown-item>
              <el-dropdown-item command="site">
                <span class="iconfont iconwangzhan"></span>
                {{ $t('navigatorToolbar.site') }}
              </el-dropdown-item>
              <el-dropdown-item disabled
                >{{ $t('navigatorToolbar.current') }}v{{
                  version
                }}</el-dropdown-item
              >
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>
      <div class="sidebar-trigger" :class="{ expanded: isSidebarExpanded }" @click="toggleSidebar">
        <i :class="isSidebarExpanded ? 'el-icon-arrow-left' : 'el-icon-arrow-right'"></i>
      </div>
    </div>
  </div>
</template>

<script>
import Scale from './Scale.vue'
import Fullscreen from './Fullscreen.vue'
import MouseAction from './MouseAction.vue'
import { langList } from '@/config'
import i18n from '@/i18n'
import { storeLang, getLang } from '@/api'
import { mapState, mapMutations } from 'vuex'
import pkg from 'simple-mind-map/package.json'
import Demonstrate from './Demonstrate.vue'

// 导航器工具栏
export default {
  components: {
    Scale,
    Fullscreen,
    MouseAction,
    Demonstrate
  },
  props: {
    mindMap: {
      type: Object
    }
  },
  data() {
    return {
      version: pkg.version,
      langList,
      lang: '',
      openMiniMap: false,
      isSidebarExpanded: false // 控制侧边栏展开/收起
    }
  },
  computed: {
    ...mapState({
      isReadonly: state => state.isReadonly,
      isDark: state => state.localConfig.isDark
    })
  },
  created() {
    this.lang = getLang()
  },
  methods: {
    ...mapMutations([
      'setLocalConfig',
      'setIsReadonly',
      'setIsSourceCodeEdit',
      'setActiveSidebar'
    ]),

    readonlyChange() {
      this.setIsReadonly(!this.isReadonly)
      this.mindMap.setMode(this.isReadonly ? 'readonly' : 'edit')
    },

    toggleMiniMap() {
      this.openMiniMap = !this.openMiniMap
      this.$bus.$emit('toggle_mini_map', this.openMiniMap)
    },

    onLangChange(lang) {
      i18n.locale = lang
      storeLang(lang)
      this.$bus.$emit('lang_change')
    },

    showSearch() {
      this.$bus.$emit('show_search')
    },

    toggleDark() {
      this.setLocalConfig({
        isDark: !this.isDark
      })
    },

    handleCommand(command) {
      if (command === 'shortcutKey') {
        this.setActiveSidebar('shortcutKey')
        return
      } else if (command === 'aiChat') {
        this.setActiveSidebar('ai')
        return
      } else if (command === 'client') {
        this.$bus.$emit(
          'showDownloadTip',
          this.$t('navigatorToolbar.downloadClient'),
          this.$t('navigatorToolbar.downloadDesc')
        )
        return
      }
      let url = ''
      switch (command) {
        case 'github':
          url = 'https://github.com/wanglin2/mind-map'
          break
        case 'helpDoc':
          url = 'https://wanglin2.github.io/mind-map-docs/help/help1.html'
          break
        case 'devDoc':
          url =
            'https://wanglin2.github.io/mind-map-docs/start/introduction.html'
          break
        case 'site':
          url = 'https://wanglin2.github.io/mind-map-docs/'
          break
        case 'issue':
          url = 'https://github.com/wanglin2/mind-map/issues/new'
          break

        default:
          break
      }
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.click()
    },

    backToRoot() {
      this.mindMap.renderer.setRootNodeCenter()
    },

    openSourceCodeEdit() {
      this.setIsSourceCodeEdit(true)
    },
    
    // 展开侧边栏
    expandSidebar() {
      this.isSidebarExpanded = true
    },
    
    // 收起侧边栏
    collapseSidebar() {
      // 添加延迟，允许用户点击内容
      setTimeout(() => {
        this.isSidebarExpanded = false
      }, 300)
    },
    
    // 立即收起侧边栏（用于点击触发器）
    toggleSidebar() {
      this.isSidebarExpanded = !this.isSidebarExpanded
    }
  }
}
</script>

<style lang="less" scoped>
.navigatorContainer {
  padding: 0 12px;
  position: fixed;
  right: 20px;
  bottom: 20px;
  background: hsla(0, 0%, 100%, 0.8);
  border-radius: 5px;
  opacity: 0.8;
  height: 44px;
  font-size: 12px;
  display: flex;
  align-items: center;

  &.isDark {
    background: #262a2e;

    .item {
      a {
        color: hsla(0, 0%, 100%, 0.6);
      }

      .btn {
        color: hsla(0, 0%, 100%, 0.6);
      }
    }
  }

  .item {
    margin-right: 20px;

    &:last-of-type {
      margin-right: 0;
    }

    a {
      color: #303133;
      text-decoration: none;
    }

    .btn {
      cursor: pointer;
      font-size: 18px;
    }
  }
  
  /* 新的可折叠侧边栏样式 */
  .sidebar-container {
    position: relative;
    display: flex;
    align-items: center;
    height: 100%;
    min-width: 24px; /* 确保收起时占据一定空间 */
  }

  .sidebar-trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 44px;
    background-color: #f5f5f5;
    color: #303133;
    cursor: pointer;
    z-index: 10;
    transition: all 0.3s ease;
  }
  
  .sidebar-content {
    display: flex;
    align-items: center;
    padding: 0 12px;
    opacity: 1;
    visibility: visible;
    transition: opacity 0.3s ease;
  }
  
  /* 收起状态：隐藏内容，只显示触发器 */
  .sidebar-container:not(.expanded) .sidebar-content {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    position: absolute;
    right: 24px; /* 触发器的宽度 */
  }
  
  .sidebar-container.expanded .sidebar-content {
    opacity: 1;
    visibility: visible;
  }

  /* 深色主题样式 */
  &.isDark .sidebar-trigger {
    background-color: #4c5156;
    color: hsla(0, 0%, 100%, 0.8);
  }
  
  /* 将触发器放置在右侧 */
  .sidebar-container {
    flex-direction: row-reverse; /* 反转顺序，让触发器在右侧 */
  }
}

@media screen and (max-width: 700px) {
  .navigatorContainer {
    left: 20px;
    overflow-x: auto;
    overflow-y: hidden;
    height: 60px;
  }
}
</style>