<template>
  <div class="toolbarNodeBtnList" :class="[dir, { isDark: isDark }]">
    <template v-for="item in list">
      <div
        v-if="item === 'back'"
        class="toolbarBtn"
        :class="{
          disabled: readonly || backEnd
        }"
        @click="$bus.$emit('execCommand', 'BACK')"
      >
        <span class="icon iconfont iconhoutui-shi"></span>
        <span class="text">{{ $t('toolbar.undo') }}</span>
      </div>
      <div
        v-if="item === 'forward'"
        class="toolbarBtn"
        :class="{
          disabled: readonly || forwardEnd
        }"
        @click="$bus.$emit('execCommand', 'FORWARD')"
      >
        <span class="icon iconfont iconqianjin1"></span>
        <span class="text">{{ $t('toolbar.redo') }}</span>
      </div>
      <div
        v-if="item === 'painter'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization,
          active: isInPainter
        }"
        @click="$bus.$emit('startPainter')"
      >
        <span class="icon iconfont iconjiedian"></span>
        <span class="text">{{ $t('toolbar.painter') }}</span>
      </div>
      <div
        v-if="item === 'siblingNode'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasRoot || hasGeneralization
        }"
        @click="$bus.$emit('execCommand', 'INSERT_NODE')"
      >
        <span class="icon iconfont iconjiedian"></span>
        <span class="text">{{ $t('toolbar.insertSiblingNode') }}</span>
      </div>
      <div
        v-if="item === 'childNode'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization
        }"
        @click="$bus.$emit('execCommand', 'INSERT_CHILD_NODE')"
      >
        <span class="icon iconfont icontianjiazijiedian"></span>
        <span class="text">{{ $t('toolbar.insertChildNode') }}</span>
      </div>
      <div
        v-if="item === 'deleteNode'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0
        }"
        @click="$bus.$emit('execCommand', 'REMOVE_NODE')"
      >
        <span class="icon iconfont iconshanchu"></span>
        <span class="text">{{ $t('toolbar.deleteNode') }}</span>
      </div>
      <div
        v-if="item === 'image'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0
        }"
        @click="$bus.$emit('showNodeImage')"
      >
        <span class="icon iconfont iconimage"></span>
        <span class="text">{{ $t('toolbar.image') }}</span>
      </div>
      <div
        v-if="item === 'numbering'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0
        }"
        @click="handleNumberingClick"
      >
        <span class="icon iconfont iconfuhao-dagangshu"></span>
        <span class="text">编号</span>
      </div>
      <div
        v-if="item === 'todo'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization
        }"
        @click="handleTodoClick"
      >
        <span class="icon iconfont iconchoose1"></span>
        <span class="text">待办</span>
      </div>
      <div
        v-if="item === 'icon'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0
        }"
        @click="showNodeIcon"
      >
        <span class="icon iconfont iconxiaolian"></span>
        <span class="text">{{ $t('toolbar.icon') }}</span>
      </div>
      <div
        v-if="item === 'link'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0
        }"
        @click="$bus.$emit('showNodeLink')"
      >
        <span class="icon iconfont iconchaolianjie"></span>
        <span class="text">{{ $t('toolbar.link') }}</span>
      </div>
      <div
        v-if="item === 'note'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0
        }"
        @click="$bus.$emit('showNodeNote')"
      >
        <span class="icon iconfont iconflow-Mark"></span>
        <span class="text">{{ $t('toolbar.note') }}</span>
      </div>
      <div
        v-if="item === 'tag'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0
        }"
        @click="$bus.$emit('showNodeTag')"
      >
        <span class="icon iconfont iconbiaoqian"></span>
        <span class="text">{{ $t('toolbar.tag') }}</span>
      </div>
      <div
        v-if="item === 'summary'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasRoot || hasGeneralization
        }"
        @click="$bus.$emit('execCommand', 'ADD_GENERALIZATION')"
      >
        <span class="icon iconfont icongaikuozonglan"></span>
        <span class="text">{{ $t('toolbar.summary') }}</span>
      </div>
      <div
        v-if="item === 'associativeLine'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization
        }"
        @click="$bus.$emit('createAssociativeLine')"
      >
        <span class="icon iconfont iconlianjiexian"></span>
        <span class="text">{{ $t('toolbar.associativeLine') }}</span>
      </div>
      <div
        v-if="item === 'formula'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization
        }"
        @click="showFormula"
      >
        <span class="icon iconfont icongongshi"></span>
        <span class="text">{{ $t('toolbar.formula') }}</span>
      </div>
      <div
        v-if="item === 'attachment'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization
        }"
        @click="selectAttachmentFile"
      >
        <span class="icon iconfont iconfujian"></span>
        <span class="text">{{ $t('toolbar.attachment') }}</span>
      </div>
      <div
        v-if="item === 'outerFrame'"
        class="toolbarBtn"
        :class="{
          disabled: activeNodes.length <= 0 || hasGeneralization
        }"
        @click="$bus.$emit('execCommand', 'ADD_OUTER_FRAME')"
      >
        <span class="icon iconfont iconwaikuang"></span>
        <span class="text">{{ $t('toolbar.outerFrame') }}</span>
      </div>
      <div
        v-if="item === 'aiConfig'"
        class="toolbarBtn"
        :class="{
          disabled: hasGeneralization
        }"
        @click="openAiConfig"
      >
        <span class="icon iconfont iconshezhi"></span>
        <span class="text">{{ isCurrentUserAdmin ? 'AI配置' : 'AI选择' }}</span>
      </div>
      <div
        v-if="item === 'aiCreate'"
        class="toolbarBtn"
        :class="{
          disabled: hasGeneralization
        }"
        @click="openAiCreate"
      >
        <span class="icon iconfont iconAIshengcheng"></span>
        <span class="text">AI创建</span>
      </div>
    </template>
  </div>
</template>

<script>
import { mapState, mapMutations } from 'vuex'
import { sortIconList } from '../../../utils/index.js'

export default {
  props: {
    dir: {
      type: String,
      default: 'h' // h（水平排列）、v（垂直排列）
    },
    list: {
      type: Array,
      default() {
        return []
      }
    }
  },
  data() {
    return {
      activeNodes: [],
      backEnd: true,
      forwardEnd: true,
      readonly: false,
      isFullDataFile: false,
      timer: null,
      isInPainter: false
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      currentUser: state => state.currentUser
    }),
    hasRoot() {
      return (
        this.activeNodes.findIndex(node => {
          return node.isRoot
        }) !== -1
      )
    },
    hasGeneralization() {
      return (
        this.activeNodes.findIndex(node => {
          return node.isGeneralization
        }) !== -1
      )
    },
    annotationRightHasBtn() {
      const index = this.list.findIndex(item => {
        return item === 'annotation'
      })
      return index !== -1 && index < this.list.length - 1
    },
    isCurrentUserAdmin() {
      return this.currentUser && this.currentUser.isAdmin;
    }
  },
  created() {
    this.$bus.$on('mode_change', this.onModeChange)
    this.$bus.$on('node_active', this.onNodeActive)
    this.$bus.$on('back_forward', this.onBackForward)
    this.$bus.$on('painter_start', this.onPainterStart)
    this.$bus.$on('painter_end', this.onPainterEnd)
  },
  beforeDestroy() {
    this.$bus.$off('mode_change', this.onModeChange)
    this.$bus.$off('node_active', this.onNodeActive)
    this.$bus.$off('back_forward', this.onBackForward)
    this.$bus.$off('painter_start', this.onPainterStart)
    this.$bus.$off('painter_end', this.onPainterEnd)
  },
  methods: {
    ...mapMutations(['setActiveSidebar']),

    // 监听模式切换
    onModeChange(mode) {
      this.readonly = mode === 'readonly'
    },

    // 监听节点激活
    onNodeActive(...args) {
      this.activeNodes = [...args[1]]
    },

    // 监听前进后退
    onBackForward(index, len) {
      this.backEnd = index <= 0
      this.forwardEnd = index >= len - 1
    },

    // 开始格式刷
    onPainterStart() {
      this.isInPainter = true
    },

    // 格式刷结束
    onPainterEnd() {
      this.isInPainter = false
    },

    // 显示节点图标侧边栏
    showNodeIcon() {
      this.$bus.$emit('close_node_icon_toolbar')
      this.setActiveSidebar('nodeIconSidebar')
    },

    // 打开公式侧边栏
    showFormula() {
      this.setActiveSidebar('formulaSidebar')
    },

    // 选择附件
    selectAttachmentFile() {
      this.$bus.$emit('selectAttachment', this.activeNodes)
    },

    // 设置标记
    onSetAnnotation(...args) {
      this.$bus.$emit('execCommand', 'SET_NOTATION', this.activeNodes, ...args)
    },

    // 打开AI配置
    openAiConfig() {
      this.$bus.$emit('open_ai_config')
    },

    // 打开AI创建
    openAiCreate() {
      this.$bus.$emit('open_ai_create')
    },

    // 处理编号点击 - 使用图标系统实现编号
    handleNumberingClick() {
      if (!this.activeNodes || this.activeNodes.length === 0) {
        this.$message.warning('请先选择节点')
        return
      }

      // 检查是否选中了根节点
      const hasRootNode = this.activeNodes.some(node => node.isRoot)
      
      if (hasRootNode && this.activeNodes.length === 1) {
        // 如果只选中了根节点，为所有直接子节点编号
        this.numberingChildNodes(this.activeNodes[0])
      } else {
        // 为所有选中的非根节点添加编号
        this.activeNodes.forEach(node => {
          if (!node.isRoot) {
            this.numberingSingleNode(node)
          }
        })
        
        // 如果包含根节点，给出提示
        if (hasRootNode) {
          this.$message.info('已为选中的非根节点添加编号，根节点已跳过')
        }
      }
    },

    // 为所有节点编号（递归处理所有层级）
    numberingChildNodes(rootNode) {
      const children = rootNode.children || []
      if (children.length === 0) {
        this.$message.info('根节点没有子节点可以编号')
        return
      }

      // 递归处理所有层级的节点
      this.numberingAllNodes(rootNode, 0)
    },

    // 递归为所有层级的节点编号
    numberingAllNodes(node, parentLevel) {
      const children = node.children || []
      
      children.forEach((child, index) => {
        const currentLevel = parentLevel + 1
        this.toggleNodeNumbering(child, currentLevel, index)
        
        // 递归处理子节点
        if (child.children && child.children.length > 0) {
          this.numberingAllNodes(child, currentLevel)
        }
      })
    },

    // 为单个节点编号
    numberingSingleNode(node) {
      const level = this.getNodeLevel(node)
      const siblings = this.getSiblingNodes(node)
      const index = siblings.indexOf(node)
      
      this.toggleNodeNumbering(node, level, index)
    },

    // 切换节点编号状态 - 使用图标系统
    toggleNodeNumbering(node, level, index) {
      // 获取节点当前的图标列表
      const iconList = [...(node.getData('icon') || [])]
      
      // 查找是否已有编号图标（任何number-开头的图标）
      const numberIconIndex = iconList.findIndex(item => item.startsWith('number-'))
      
      if (numberIconIndex !== -1) {
        // 移除现有编号图标
        iconList.splice(numberIconIndex, 1)
      } else {
        // 添加新的编号图标
        const numberingIcon = this.generateNumberingIcon(level, index)
        if (numberingIcon) {
          iconList.push(numberingIcon)
        }
      }
      
      // 使用统一的排序函数确保checkbox始终在最左边
      const sortedIconList = sortIconList(iconList)
      
      // 更新节点图标
      node.setIcon(sortedIconList)
    },

    // 生成编号图标标识
    generateNumberingIcon(level, index) {
      // 根据层级确定编号类型和文本
      let numberType = ''
      let numberText = ''
      
      switch (level) {
        case 1:
          // 一级：中文数字
          numberType = 'number-1'
          numberText = this.toChineseNumber(index + 1)
          break
        case 2:
          // 二级：阿拉伯数字
          numberType = 'number-2'
          numberText = `${index + 1}`
          break
        case 3:
          // 三级：大写字母
          numberType = 'number-3'
          numberText = String.fromCharCode(65 + (index % 26))
          break
        case 4:
          // 四级：小写字母
          numberType = 'number-4'
          numberText = String.fromCharCode(97 + (index % 26))
          break
        default:
          // 五级及以上：循环使用
          const cycleLevel = ((level - 1) % 4) + 1
          return this.generateNumberingIcon(cycleLevel, index)
      }
      
      // 返回图标标识：type_text格式
      return `${numberType}_${numberText}`
    },

    // 中文数字转换函数
    toChineseNumber(num) {
      const chineseDigits = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
      const chineseUnits = ['', '十', '百', '千']
      
      if (num === 0) return '零'
      if (num <= 10) return chineseDigits[num] || '十'
      if (num < 20) return '十' + (num === 10 ? '' : chineseDigits[num - 10])
      if (num < 100) {
        const tens = Math.floor(num / 10)
        const ones = num % 10
        return chineseDigits[tens] + '十' + (ones === 0 ? '' : chineseDigits[ones])
      }
      
      // 处理更大的数字
      return num.toString()
    },

    // 获取节点层级
    getNodeLevel(node) {
      let level = 0
      let current = node.parent
      while (current && !current.isRoot) {
        level++
        current = current.parent
      }
      return level + 1 // 根节点的直接子节点为第1层
    },

    // 获取同级节点
    getSiblingNodes(node) {
      if (!node.parent) return [node]
      return node.parent.children || []
    },
    
    // 处理待办点击
    handleTodoClick() {
      if (!this.activeNodes || this.activeNodes.length === 0) {
        this.$message.warning('请先选择节点')
        return
      }
      
      // 检查是否选中了根节点
      const hasRootNode = this.activeNodes.some(node => node.isRoot)
      
      if (hasRootNode && this.activeNodes.length === 1) {
        // 如果只选中了根节点，触发Shift+W快捷键对应的事件（在Edit组件中实现的逻辑）
        this.$bus.$emit('triggerShiftWForRootNode')
      } else {
        // 为所有选中的非根节点添加/移除待办
        this.activeNodes.forEach(node => {
          if (!node.isRoot) {
            this.toggleTodoForSingleNode(node)
          }
        })
        
        // 如果包含根节点，给出提示
        if (hasRootNode) {
          this.$message.info('已为选中的非根节点切换待办状态，根节点已跳过')
        }
      }
    },
    
    // 为单个节点切换待办状态
    toggleTodoForSingleNode(node) {
      // 获取当前节点的图标列表
      const iconList = [...(node.getData('icon') || [])]
      
      // 查找是否存在复选框图标
      const checkboxIcons = ['checkbox_unchecked', 'checkbox_success', 'checkbox_failed']
      const existingCheckboxIndex = iconList.findIndex(item => checkboxIcons.includes(item))
      
      if (existingCheckboxIndex !== -1) {
        // 如果存在复选框图标，则移除它
        iconList.splice(existingCheckboxIndex, 1)
      } else {
        // 如果不存在，则添加未选中状态的复选框图标
        iconList.push('checkbox_unchecked')
      }
      
      // 使用统一的排序函数确保checkbox始终在最左边
      const sortedIconList = sortIconList(iconList)
      
      // 更新节点图标
      node.setIcon(sortedIconList)
    }
  }
}
</script>

<style lang="less">
.toolbarNodeBtnList {
  display: flex;

  &.isDark {
    .toolbarBtn {
      color: hsla(0, 0%, 100%, 0.9);

      .icon {
        background: transparent;
        border-color: transparent;
      }

      &:hover {
        &:not(.disabled) {
          .icon {
            background: hsla(0, 0%, 100%, 0.05);
          }
        }
      }

      &.disabled {
        color: #54595f;
      }
    }
  }

  .toolbarBtn {
    display: flex;
    justify-content: center;
    flex-direction: column;
    cursor: pointer;
    margin-right: 20px;

    &:last-of-type {
      margin-right: 0;
    }

    &:hover {
      &:not(.disabled) {
        .icon {
          background: #f5f5f5;
        }
      }
    }

    &.active {
      .icon {
        background: #f5f5f5;
      }
    }

    &.disabled {
      color: #bcbcbc;
      cursor: not-allowed;
      pointer-events: none;
    }

    .icon {
      display: flex;
      height: 26px;
      background: #fff;
      border-radius: 4px;
      border: 1px solid #e9e9e9;
      justify-content: center;
      flex-direction: column;
      text-align: center;
      padding: 0 5px;
    }

    .text {
      margin-top: 3px;
      text-align: center;
    }
  }

  &.v {
    display: block;
    width: 120px;
    flex-wrap: wrap;

    .toolbarBtn {
      flex-direction: row;
      justify-content: flex-start;
      margin-bottom: 10px;
      width: 100%;
      margin-right: 0;

      &:last-of-type {
        margin-bottom: 0;
      }

      .icon {
        margin-right: 10px;
      }

      .text {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}
</style>
