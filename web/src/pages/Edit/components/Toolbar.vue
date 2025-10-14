<template>
  <div class="toolbarContainer" :class="{ isDark: isDark }">
    <div class="toolbar" ref="toolbarRef">
      <!-- 节点操作 -->
      <div class="toolbarBlock">
        <ToolbarNodeBtnList :list="horizontalList"></ToolbarNodeBtnList>
        <!-- 更多 -->
        <el-popover
          v-model="popoverShow"
          placement="bottom-end"
          width="120"
          trigger="hover"
          v-if="showMoreBtn"
          :style="{ marginLeft: horizontalList.length > 0 ? '20px' : 0 }"
        >
          <ToolbarNodeBtnList
            dir="v"
            :list="verticalList"
            @click.native="popoverShow = false"
          ></ToolbarNodeBtnList>
          <div slot="reference" class="toolbarBtn">
            <span class="icon iconfont icongongshi"></span>
            <span class="text">{{ $t('toolbar.more') }}</span>
          </div>
        </el-popover>
      </div>
      <!-- 导出 -->
      <div class="toolbarBlock">
        <div class="toolbarBtn" @click="showMindMapHistory" v-if="!isMobile">
          <span class="icon iconfont iconxmind"></span>
          <span class="text">思维导图</span>
        </div>
        <div class="toolbarBtn" @click="openDirectory" v-if="!isMobile">
          <span class="icon iconfont icondakai"></span>
          <span class="text">{{ $t('toolbar.directory') }}</span>
        </div>
        <el-tooltip
          effect="dark"
          :content="$t('toolbar.newFileTip')"
          placement="bottom"
          v-if="!isMobile"
        >
          <div class="toolbarBtn" @click="createNewLocalFile">
            <span class="icon iconfont iconxinjian"></span>
            <span class="text">{{ $t('toolbar.newFile') }}</span>
          </div>
        </el-tooltip>
        <el-tooltip
          effect="dark"
          :content="$t('toolbar.openFileTip')"
          placement="bottom"
          v-if="!isMobile"
        >
          <div class="toolbarBtn" @click="openLocalFile">
            <span class="icon iconfont iconwenjian1"></span>
            <span class="text">{{ $t('toolbar.openFile') }}</span>
          </div>
        </el-tooltip>
        <div class="toolbarBtn" @click="saveToDatabase" v-if="!isMobile">
          <span class="icon iconfont iconexport"></span>
          <span class="text">保存</span>
        </div>
        <div class="toolbarBtn" @click="saveLocalFile" v-if="!isMobile">
          <span class="icon iconfont iconlingcunwei"></span>
          <span class="text">{{ $t('toolbar.saveAs') }}</span>
        </div>
        <div class="toolbarBtn" @click="$bus.$emit('showImport')">
          <span class="icon iconfont icondaoru"></span>
          <span class="text">{{ $t('toolbar.import') }}</span>
        </div>
        <div
          class="toolbarBtn"
          @click="$bus.$emit('showExport')"
        >
          <span class="icon iconfont iconexport"></span>
          <span class="text">{{ $t('toolbar.export') }}</span>
        </div>
        <!-- 用户下拉菜单 -->
        <el-dropdown class="user-dropdown" popper-class="user-dropdown-popper" @command="handleUserCommand" trigger="click">
          <div class="toolbarBtn user-menu-btn">
            <i class="el-icon-user-solid icon"></i>
            <span class="text">{{ currentUser ? currentUser.username || currentUser.email || currentUser.id : '用户' }}</span>
          </div>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="changePassword">
              <i class="el-icon-edit"></i>
              修改密码
            </el-dropdown-item>
            <el-dropdown-item command="logout">
              <i class="el-icon-switch-button"></i>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
        <!-- 本地文件树 -->
        <div
          class="fileTreeBox"
          v-if="fileTreeVisible"
          :class="{ expand: fileTreeExpand }"
        >
          <div class="fileTreeToolbar">
            <div class="fileTreeName">
              {{ rootDirName ? '/' + rootDirName : '' }}
            </div>
            <div class="fileTreeActionList">
              <div
                class="btn"
                :class="[
                  fileTreeExpand ? 'el-icon-arrow-up' : 'el-icon-arrow-down'
                ]"
                @click="fileTreeExpand = !fileTreeExpand"
              ></div>
              <div
                class="btn el-icon-close"
                @click="fileTreeVisible = false"
              ></div>
            </div>
          </div>
          <div class="fileTreeWrap">
            <el-tree
              :props="fileTreeProps"
              :load="loadFileTreeNode"
              :expand-on-click-node="false"
              node-key="id"
              lazy
            >
              <span class="customTreeNode" slot-scope="{ node, data }">
                <div class="treeNodeInfo">
                  <span
                    class="treeNodeIcon iconfont"
                    :class="[
                      data.type === 'file' ? 'iconwenjian' : 'icondakai'
                    ]"
                  ></span>
                  <span class="treeNodeName">{{ node.label }}</span>
                </div>
                <div class="treeNodeBtnList" v-if="data.type === 'file'">
                  <el-button
                    type="text"
                    size="mini"
                    v-if="data.enableEdit"
                    @click="editLocalFile(data)"
                    >编辑</el-button
                  >
                  <el-button
                    type="text"
                    size="mini"
                    v-else
                    @click="importLocalFile(data)"
                    >导入</el-button
                  >
                </div>
              </span>
            </el-tree>
          </div>
        </div>
      </div>
    </div>
    <NodeImage></NodeImage>
    <NodeHyperlink></NodeHyperlink>
    <NodeIcon></NodeIcon>
    <NodeNote></NodeNote>
    <NodeTag></NodeTag>
    <Export></Export>
    <Import ref="ImportRef"></Import>
    
    <!-- 思维导图历史对话框 -->
    <el-dialog
      title="思维导图"
      :visible.sync="showMindMapDialog"
      width="600px"
      :modal-append-to-body="false"
      :close-on-click-modal="false"
      :before-close="closeMindMapDialog"
      :destroy-on-close="false"
      custom-class="draggable-dialog"
      ref="mindMapDialog"
    >
      <!-- 统一容器 -->
      <div class="mindmap-content-wrapper">
        <!-- 功能操作栏 -->
        <div class="mindmap-toolbar-container">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索思维导图..."
            size="small"
            clearable
            prefix-icon="el-icon-search"
            style="width: 240px;"
            @input="handleSearch"
          />
          
          <div class="mindmap-toolbar-buttons">
            <el-button
              size="small"
              type="primary"
              plain
              @click="refreshMindMaps"
              icon="el-icon-refresh"
            >
              刷新
            </el-button>
            
            <el-button
              size="small"
              type="danger"
              :disabled="selectedMindMaps.length === 0"
              @click="batchDeleteMindMaps"
              icon="el-icon-delete"
            >
              批量删除 ({{ selectedMindMaps.length }})
            </el-button>
            
            <el-button
              size="small"
              type="danger"
              plain
              @click="deleteAllMindMaps"
              icon="el-icon-delete-solid"
            >
              一键删除
            </el-button>
          </div>
        </div>
        
        <!-- 思维导图列表 -->
        <div class="mindmap-list-container">
        <!-- 加载状态 -->
        <div v-if="mindMapLoading" class="loading-container">
          <div class="loading-spinner">
            <i class="el-icon-loading"></i>
            <span>正在加载思维导图...</span>
          </div>
        </div>
        
        <!-- 无数据状态 -->
        <div v-else-if="mindMaps.length === 0" class="no-mindmaps">
          暂无思维导图
        </div>
        
        <!-- 思维导图列表 -->
        <div 
          v-else
          v-for="mindMap in filteredMindMaps" 
          :key="mindMap.id" 
          class="mindmap-card"
          :class="{ 'selected': isSelected(mindMap.id) }"
          @dblclick.stop="loadMindMap(mindMap)"
          @click="handleCardClick(mindMap)"
        >
          <div class="mindmap-card-content">
            <div class="mindmap-info">
              <div class="mindmap-title" :title="mindMap.title">{{ mindMap.title }}</div>
              <div class="mindmap-date">{{ formatDate(mindMap.updated_at) }}</div>
            </div>
            
            <div class="mindmap-bottom">
              <!-- 选择框 -->
              <div class="mindmap-checkbox">
                <el-checkbox
                  :value="isSelected(mindMap.id)"
                  @change="toggleSelection(mindMap.id)"
                  @click.stop
                />
              </div>
              
              <!-- 操作按钮 -->
              <div class="mindmap-actions">
                <el-button size="mini" type="danger" @click.stop="deleteMindMap(mindMap)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      <!-- 状态栏作为对话框footer，填满整个footer区域 -->
      <div slot="footer" class="mindmap-status-bar" style="margin: 0; padding: 0; width: 100%; height: 100%;">
        <span class="status-text">{{ statusMessage || '就绪' }}</span>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import NodeImage from './NodeImage.vue'
import NodeHyperlink from './NodeHyperlink.vue'
import NodeIcon from './NodeIcon.vue'
import NodeNote from './NodeNote.vue'
import NodeTag from './NodeTag.vue'
import Export from './Export.vue'
import Import from './Import.vue'
import { mapState } from 'vuex'
import { Notification } from 'element-ui'
import exampleData from 'simple-mind-map/example/exampleData'
import { getData } from '../../../api'
import ToolbarNodeBtnList from './ToolbarNodeBtnList.vue'
import { throttle, isMobile } from 'simple-mind-map/src/utils/index'

// 工具栏
let fileHandle = null
const defaultBtnList = [
  'back',
  'forward',
  'painter',
  'siblingNode',
  'childNode',
  'deleteNode',
  'image',
  'icon',
  'link',
  'note',
  'tag',
  'summary',
  'associativeLine',
  'formula',
  // 'attachment',
  'outerFrame',
  'annotation',
  'aiConfig',
  'aiCreate'
]

export default {
  components: {
    NodeImage,
    NodeHyperlink,
    NodeIcon,
    NodeNote,
    NodeTag,
    Export,
    Import,
    ToolbarNodeBtnList
  },
  data() {
    return {
      isMobile: isMobile(),
      horizontalList: [],
      verticalList: [],
      showMoreBtn: true,
      popoverShow: false,
      fileTreeProps: {
        label: 'name',
        children: 'children',
        isLeaf: 'leaf'
      },
      fileTreeVisible: false,
      rootDirName: '',
      fileTreeExpand: true,
      waitingWriteToLocalFile: false,
      // 思维导图历史相关
      showMindMapDialog: false,
      mindMaps: [],
      mindMapLoading: false,
      searchKeyword: '',
      selectedMindMaps: [],
      // 对话框拖拽相关
      dialogDragData: {
        isDragging: false,
        startX: 0,
        startY: 0,
        initialLeft: 0,
        initialTop: 0
      },
      // 状态栏消息
      statusMessage: '',
      // 密码修改相关
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      isHandleLocalFile: state => state.isHandleLocalFile,
      openNodeRichText: state => state.localConfig.openNodeRichText,
      enableAi: state => state.localConfig.enableAi,
      currentUser: state => state.currentUser
    }),

    btnLit() {
      let res = [...defaultBtnList]
      if (!this.openNodeRichText) {
        res = res.filter(item => {
          return item !== 'formula'
        })
      }
      if (!this.enableAi) {
        res = res.filter(item => {
          return item !== 'ai'
        })
      }
      return res
    },

    // 过滤后的思维导图列表
    filteredMindMaps() {
      if (!this.searchKeyword.trim()) {
        return this.mindMaps
      }
      
      const keyword = this.searchKeyword.toLowerCase()
      return this.mindMaps.filter(mindMap => {
        return mindMap.title.toLowerCase().includes(keyword)
      })
    }
  },
  watch: {
    isHandleLocalFile(val) {
      if (!val) {
        Notification.closeAll()
      }
    },
    btnLit: {
      deep: true,
      handler() {
        this.computeToolbarShow()
      }
    }
  },
  created() {
    this.$bus.$on('write_local_file', this.onWriteLocalFile)
  },
  mounted() {
    this.computeToolbarShow()
    this.computeToolbarShowThrottle = throttle(this.computeToolbarShow, 300)
    window.addEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$on('lang_change', this.computeToolbarShowThrottle)
    window.addEventListener('beforeunload', this.onUnload)
    this.$bus.$on('node_note_dblclick', this.onNodeNoteDblclick)
    // 添加键盘事件监听
    window.addEventListener('keydown', this.handleKeyDown)
    // 添加保存当前思维导图事件监听
    this.$bus.$on('saveCurrentMindMap', this.saveToDatabaseAuto)
    
    // 预加载思维导图列表（延迟执行，不阻塞页面初始化）
    this.$nextTick(() => {
      setTimeout(() => {
        this.preloadMindMaps()
        this.preloadAiConfigs() // 同时预加载AI模型配置
      }, 2000) // 2秒后开始预加载
    })
  },
  beforeDestroy() {
    this.$bus.$off('write_local_file', this.onWriteLocalFile)
    window.removeEventListener('resize', this.computeToolbarShowThrottle)
    this.$bus.$off('lang_change', this.computeToolbarShowThrottle)
    window.removeEventListener('beforeunload', this.onUnload)
    this.$bus.$off('node_note_dblclick', this.onNodeNoteDblclick)
    // 移除键盘事件监听
    window.removeEventListener('keydown', this.handleKeyDown)
    // 移除保存当前思维导图事件监听
    this.$bus.$off('saveCurrentMindMap', this.saveToDatabase)
    // 清理拖拽事件监听
    this.cleanupDragEvents()
  },
  methods: {
    // 计算工具按钮如何显示
    computeToolbarShow() {
      if (!this.$refs.toolbarRef) return
      const windowWidth = window.innerWidth - 40
      const all = [...this.btnLit]
      let index = 1
      const loopCheck = () => {
        if (index > all.length) return done()
        this.horizontalList = all.slice(0, index)
        this.$nextTick(() => {
          const width = this.$refs.toolbarRef.getBoundingClientRect().width
          if (width < windowWidth) {
            index++
            loopCheck()
          } else if (index > 0 && width > windowWidth) {
            index--
            this.horizontalList = all.slice(0, index)
            done()
          }
        })
      }
      const done = () => {
        this.verticalList = all.slice(index)
        this.showMoreBtn = this.verticalList.length > 0
      }
      loopCheck()
    },

    // 监听本地文件读写
    onWriteLocalFile(content) {
      clearTimeout(this.timer)
      if (fileHandle && this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = true
      }
      this.timer = setTimeout(() => {
        this.writeLocalFile(content)
      }, 1000)
    },

    onUnload(e) {
      if (this.waitingWriteToLocalFile) {
        const msg = '存在未保存的数据'
        e.returnValue = msg
        return msg
      }
    },

    // 加载本地文件树
    async loadFileTreeNode(node, resolve) {
      try {
        let dirHandle
        if (node.level === 0) {
          dirHandle = await window.showDirectoryPicker()
          this.rootDirName = dirHandle.name
        } else {
          dirHandle = node.data.handle
        }
        const dirList = []
        const fileList = []
        for await (const [key, value] of dirHandle.entries()) {
          const isFile = value.kind === 'file'
          if (isFile && !/\.(smm|xmind|md|json)$/.test(value.name)) {
            continue
          }
          const enableEdit = isFile && /\.smm$/.test(value.name)
          const data = {
            id: key,
            name: value.name,
            type: value.kind,
            handle: value,
            leaf: isFile,
            enableEdit
          }
          if (isFile) {
            fileList.push(data)
          } else {
            dirList.push(data)
          }
        }
        resolve([...dirList, ...fileList])
      } catch (error) {
        this.fileTreeVisible = false
        resolve([])
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 扫描本地文件夹
    openDirectory() {
      this.fileTreeVisible = false
      this.fileTreeExpand = true
      this.rootDirName = ''
      this.$nextTick(() => {
        this.fileTreeVisible = true
      })
    },

    // 编辑指定文件
    editLocalFile(data) {
      if (data.handle) {
        fileHandle = data.handle
        this.readFile()
      }
    },

    // 导入指定文件
    async importLocalFile(data) {
      try {
        const file = await data.handle.getFile()
        this.$refs.ImportRef.onChange({
          raw: file,
          name: file.name
        })
        this.$refs.ImportRef.confirm()
      } catch (error) {
      }
    },

    // 打开本地文件
    async openLocalFile() {
      try {
        let [_fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: '',
              accept: {
                'application/json': ['.smm']
              }
            }
          ],
          excludeAcceptAllOption: true,
          multiple: false
        })
        if (!_fileHandle) {
          return
        }
        fileHandle = _fileHandle
        if (fileHandle.kind === 'directory') {
          this.$message.warning(this.$t('toolbar.selectFileTip'))
          return
        }
        this.readFile()
      } catch (error) {
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    // 读取本地文件
    async readFile() {
      let file = await fileHandle.getFile()
      let fileReader = new FileReader()
      fileReader.onload = async () => {
        this.$store.commit('setIsHandleLocalFile', true)
        this.setData(fileReader.result)
        Notification.closeAll()
        Notification({
          title: this.$t('toolbar.tip'),
          message: `${this.$t('toolbar.editingLocalFileTipFront')}${
            file.name
          }${this.$t('toolbar.editingLocalFileTipEnd')}`,
          duration: 0,
          showClose: true
        })
      }
      fileReader.readAsText(file)
    },

    // 渲染读取的数据
    setData(str) {
      try {
        let data = JSON.parse(str)
        if (typeof data !== 'object') {
          throw new Error(this.$t('toolbar.fileContentError'))
        }
        if (data.root) {
          this.isFullDataFile = true
        } else {
          this.isFullDataFile = false
          data = {
            ...exampleData,
            root: data
          }
        }
        this.$bus.$emit('setData', data)
      } catch (error) {
        console.log(error)
        this.$message.error(this.$t('toolbar.fileOpenFailed'))
      }
    },

    // 写入本地文件
    async writeLocalFile(content) {
      if (!fileHandle || !this.isHandleLocalFile) {
        this.waitingWriteToLocalFile = false
        return
      }
      if (!this.isFullDataFile) {
        content = content.root
      }
      let string = JSON.stringify(content)
      const writable = await fileHandle.createWritable()
      await writable.write(string)
      await writable.close()
      this.waitingWriteToLocalFile = false
    },

    // 创建本地文件
    async createNewLocalFile() {
      await this.createLocalFile(exampleData)
    },

    // 另存为
    async saveLocalFile() {
      let data = getData()
      await this.createLocalFile(data)
    },
    
    // 保存到数据库（手动模式，提示用户输入标题）
    async saveToDatabase() {
      try {
        // 获取当前思维导图数据
        let data = getData()
        
        // 检查用户是否已登录
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        if (!currentUser) {
          this.$message.error('请先登录')
          this.$router.push('/login')
          return
        }
        
        // 使用思维导图的根节点文本作为默认标题
        let defaultTitle = `思维导图_${new Date().toLocaleDateString()}`
        if (data && data.root && data.root.data && data.root.data.text) {
          // 去除HTML标签，只保留纯文本
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = data.root.data.text
          defaultTitle = tempDiv.textContent || tempDiv.innerText || ''
        }
        
        // 弹出对话框让用户输入标题
        const title = await this.$prompt('请输入思维导图标题:', '保存思维导图', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: defaultTitle,
          inputPattern: /.+/,
          inputErrorMessage: '标题不能为空'
        }).then(({ value }) => {
          return value
        }).catch(() => {
          // 用户取消保存
          return null
        })
        
        // 如果用户取消，则不保存
        if (title === null) {
          return
        }
        
        // 调用store中的保存方法
        const result = await this.$store.dispatch('saveMindMap', {
          userId: currentUser.id,
          title: title,
          content: data
        })
        
        this.$message.success('思维导图保存成功')
      } catch (error) {
        if (error && error.message && error.message.includes('取消')) {
          // 用户取消操作，不显示错误消息
          return
        }
        console.error('保存思维导图失败:', error)
        this.$message.error('保存思维导图失败: ' + error.message)
      }
    },
    
    // 保存到数据库（自动模式，不提示用户输入标题）
    async saveToDatabaseAuto() {
      try {
        // 获取当前思维导图数据
        let data = getData()
        
        // 检查用户是否已登录
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        if (!currentUser) {
          this.$message.error('请先登录')
          this.$router.push('/login')
          return
        }
        
        // 使用当前时间作为标题（用于自动保存）
        let autoSaveTitle = `思维导图_${new Date().toISOString().replace(/[:.]/g, '-')}`
        
        // 如果有根节点，使用根节点文本作为标题（去除HTML标签）
        if (data && data.root && data.root.data && data.root.data.text) {
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = data.root.data.text
          const rootNodeText = tempDiv.textContent || tempDiv.innerText || ''
          autoSaveTitle = `${rootNodeText}_自动保存_${new Date().toISOString().replace(/[:.]/g, '-')}`
        }
        
        // 调用store中的保存方法
        await this.$store.dispatch('saveMindMap', {
          userId: currentUser.id,
          title: autoSaveTitle,
          content: data
        })
      } catch (error) {
        // 自动保存失败时不显示错误消息，避免打扰用户
      }
    },

    // 创建本地文件
    async createLocalFile(content) {
      try {
        let _fileHandle = await window.showSaveFilePicker({
          types: [
            {
              description: '',
              accept: { 'application/json': ['.smm'] }
            }
          ],
          suggestedName: this.$t('toolbar.defaultFileName')
        })
        if (!_fileHandle) {
          return
        }
        const loading = this.$loading({
          lock: true,
          text: this.$t('toolbar.creatingTip'),
          spinner: 'el-icon-loading',
          background: 'rgba(0, 0, 0, 0.7)'
        })
        fileHandle = _fileHandle
        this.$store.commit('setIsHandleLocalFile', true)
        this.isFullDataFile = true
        await this.writeLocalFile(content)
        await this.readFile()
        loading.close()
      } catch (error) {
        console.log(error)
        if (error.toString().includes('aborted')) {
          return
        }
        this.$message.warning(this.$t('toolbar.notSupportTip'))
      }
    },

    onNodeNoteDblclick(node, e) {
      e.stopPropagation()
      this.$bus.$emit('showNodeNote', node)
    },
    
    // 处理键盘快捷键
    handleKeyDown(event) {
      // 检查是否按下Ctrl+S (或Cmd+S on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault() // 阻止默认的保存行为
        this.saveToDatabase()  // 调用保存到数据库的方法
      }
      
      // 检查是否按下Ctrl+L (或Cmd+L on Mac) - 打开思维导图对话框
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault() // 阻止默认行为（如浏览器地址栏聚焦）
        this.showMindMapHistory() // 显示思维导图对话框
      }
    },
    
    // 显示思维导图历史
    async showMindMapHistory() {
      try {
        // 检查用户是否已登录
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        if (!currentUser) {
          this.$message.error('请先登录')
          this.$router.push('/login')
          return
        }
        
        // 立即显示对话框
        this.showMindMapDialog = true
        
        // 设置状态栏提示信息
        this.statusMessage = '双击卡片切换所选思维导图'
        
        // 初始化拖拽功能
        this.initDialogDrag()
        
        // 如果已有预加载的数据，直接使用
        if (this.mindMaps.length > 0) {
          // console.log('使用预加载的思维导图数据，共', this.mindMaps.length, '个'); // 仅调试时使用
          this.mindMapLoading = false
        } else {
          // 没有预加载数据，显示加载状态并获取
          this.mindMapLoading = true
          
          try {
            const mindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id)
            // console.log('获取到的思维导图列表:', mindMaps); // 隐私保护：不输出用户数据
            // console.log('思维导图列表详情:'); // 隐私保护：不输出用户数据
            // if (mindMaps && mindMaps.length > 0) {
            //   mindMaps.forEach((map, index) => {
            //     console.log(`  ${index + 1}. ID: ${map.id}, 标题: ${map.title}, 内容预览: ${map.content ? (map.content.root ? map.content.root.data.text : '无根节点') : '无内容'}`); // 隐私保护：不输出用户数据
            //   });
            // }
            this.mindMaps = mindMaps
          } catch (error) {
            console.error('加载思维导图失败:', error)
            this.$message.error('加载思维导图失败: ' + error.message)
          } finally {
            this.mindMapLoading = false
          }
        }
      } catch (error) {
        console.error('显示思维导图对话框失败:', error)
        this.$message.error('显示思维导图对话框失败: ' + error.message)
      }
    },
    
    // 关闭思维导图对话框
    closeMindMapDialog(done) {
      this.showMindMapDialog = false
      if (done) {
        done()
      }
    },
    
    // 初始化对话框拖拽功能
    initDialogDrag() {
      this.$nextTick(() => {
        const dialogEl = document.querySelector('.draggable-dialog')
        if (!dialogEl) return
        
        const headerEl = dialogEl.querySelector('.el-dialog__header')
        if (!headerEl) return
        
        // 设置拖拽样式
        headerEl.style.cursor = 'move'
        headerEl.style.userSelect = 'none'
        
        // 绑定拖拽事件
        headerEl.addEventListener('mousedown', this.startDrag)
      })
    },
    
    // 开始拖拽
    startDrag(e) {
      const dialogEl = document.querySelector('.draggable-dialog')
      if (!dialogEl) return
      
      // 记录初始位置
      this.dialogDragData.isDragging = true
      this.dialogDragData.startX = e.clientX
      this.dialogDragData.startY = e.clientY
      
      // 获取当前对话框位置
      const rect = dialogEl.getBoundingClientRect()
      this.dialogDragData.initialLeft = rect.left
      this.dialogDragData.initialTop = rect.top
      
      // 绑定移动和结束事件
      document.addEventListener('mousemove', this.onDrag)
      document.addEventListener('mouseup', this.endDrag)
      
      // 添加拖拽样式
      dialogEl.classList.add('dragging')
      
      // 防止选中文本
      e.preventDefault()
    },
    
    // 拖拽中
    onDrag(e) {
      if (!this.dialogDragData.isDragging) return
      
      const dialogEl = document.querySelector('.draggable-dialog')
      if (!dialogEl) return
      
      // 计算新位置
      const deltaX = e.clientX - this.dialogDragData.startX
      const deltaY = e.clientY - this.dialogDragData.startY
      
      const newLeft = this.dialogDragData.initialLeft + deltaX
      const newTop = this.dialogDragData.initialTop + deltaY
      
      // 获取窗口尺寸，确保对话框不会拖出视口
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      const dialogRect = dialogEl.getBoundingClientRect()
      
      const maxLeft = windowWidth - dialogRect.width
      const maxTop = windowHeight - dialogRect.height
      
      const finalLeft = Math.max(0, Math.min(newLeft, maxLeft))
      const finalTop = Math.max(0, Math.min(newTop, maxTop))
      
      // 应用新位置
      dialogEl.style.position = 'fixed'
      dialogEl.style.left = finalLeft + 'px'
      dialogEl.style.top = finalTop + 'px'
      dialogEl.style.marginLeft = '0'
      dialogEl.style.marginTop = '0'
    },
    
    // 结束拖拽
    endDrag() {
      this.dialogDragData.isDragging = false
      
      // 移除拖拽样式
      const dialogEl = document.querySelector('.draggable-dialog')
      if (dialogEl) {
        dialogEl.classList.remove('dragging')
      }
      
      // 移除事件监听
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.endDrag)
    },
    
    // 清理拖拽事件监听
    cleanupDragEvents() {
      // 移除可能残留的事件监听
      document.removeEventListener('mousemove', this.onDrag)
      document.removeEventListener('mouseup', this.endDrag)
      
      // 清理对话框头部的事件监听
      const headerEl = document.querySelector('.draggable-dialog .el-dialog__header')
      if (headerEl) {
        headerEl.removeEventListener('mousedown', this.startDrag)
      }
    },
    
    // 处理卡片单击事件（用于调试）
    handleCardClick(mindMap) {
      // 移除调试日志
    },
    
    // 从缓存中获取思维导图数据（如果缓存中没有，则从数据库获取）
    async getMindMapDataFromCache(mindMapId) {
      // 1. 先尝试从localStorage获取
      try {
        const cacheKey = `mindmap_cache_${mindMapId}`;
        const cachedData = localStorage.getItem(cacheKey);
        
        if (cachedData) {
          return JSON.parse(cachedData);
        }
        
        // 2. 如果缓存中没有，从数据库获取
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
          return null;
        }
        
        const fullMindMapData = await this.$store.dispatch('getMindMapById', {
          mindMapId: mindMapId,
          userId: currentUser.id
        });
        
        if (fullMindMapData && fullMindMapData.content) {
          // 保存到缓存供下次使用
          this.saveMindMapDataToCache(mindMapId, fullMindMapData.content);
          return fullMindMapData.content;
        } else {
          return null;
        }
        
      } catch (error) {
        return null;
      }
    },
    
    // 保存思维导图数据到缓存
    saveMindMapDataToCache(mindMapId, data) {
      try {
        const cacheKey = `mindmap_cache_${mindMapId}`;
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (error) {
        // 保存失败，但不抛出错误
      }
    },
    
    // 加载思维导图
    async loadMindMap(selectedMindMap) {

      
      // 保存一份副本以避免引用问题
      // 使用更深层的复制方法，确保所有属性都被复制
      const mindMapToLoad = JSON.parse(JSON.stringify(selectedMindMap));
      // console.log('复制后的思维导图子节点检查:', {
      //   hasContent: !!mindMapToLoad.content,
      //   hasRoot: !!mindMapToLoad.content?.root,
      //   hasChildren: !!mindMapToLoad.content?.root?.children,
      //   childCount: mindMapToLoad.content?.root?.children ? mindMapToLoad.content.root.children.length : 0,
      //   childrenPreview: mindMapToLoad.content?.root?.children?.slice(0, 2).map(child => ({
      //     text: child.data?.text,
      //     childCount: child.children?.length || 0
      //   }))
      // }); // 隐私保护：不输出用户数据
      // console.log('复制后的思维导图:', mindMapToLoad); // 隐私保护：不输出用户数据
      
      try {
        // 加载思维导图
        // console.log('发送加载思维导图事件，数据:', { content: mindMapToLoad.content }); // 隐私保护：不输出用户数据
        // console.log('即将加载的思维导图ID:', mindMapToLoad.id); // 隐私保护：不输出用户数据
        // console.log('即将加载的思维导图标题:', mindMapToLoad.title); // 隐私保护：不输出用户数据
        
        // 正确的逻辑：从缓存中获取思维导图数据

        
        // 1. 先保存当前思维导图的数据到缓存（如果有修改）

        if (this.$getCurrentData) {
          const currentData = this.$getCurrentData();

          
          // 获取当前思维导图的ID（需要从store或其他地方获取）
          const currentMindMapId = this.$store.state.currentMindMapId || 'current';
          this.saveMindMapDataToCache(currentMindMapId, currentData);
        } else {

        }
        
        // 2. 从缓存中获取目标思维导图的数据
        const contentToLoad = await this.getMindMapDataFromCache(mindMapToLoad.id);
        
        if (!contentToLoad) {
          this.$message.error('加载思维导图失败：无法获取数据');
          return;
        }
        // console.log('加载的内容结构检查:', {
        //   hasRoot: !!contentToLoad?.root,
        //   rootData: contentToLoad?.root ? contentToLoad.root.data : null,
        //   contentKeys: contentToLoad ? Object.keys(contentToLoad) : null
        // }); // 隐私保护：不输出用户数据
        
        // 创建一个Promise来确保数据加载完成
        const loadPromise = new Promise((resolve) => {
          // 监听一个自定义事件，当思维导图渲染完成时触发
          const listener = () => {
            this.$bus.$off('mindMapLoaded', listener);
            // console.log('接收到思维导图加载完成事件'); // 仅调试时使用
            resolve();
          };
          this.$bus.$on('mindMapLoaded', listener);
          
          // 检查 contentToLoad 是否包含完整的子节点数据
          // console.log('准备发送的思维导图数据检查:', {
          //   hasRoot: !!contentToLoad?.root,
          //   hasChildren: !!contentToLoad?.root?.children,
          //   childCount: contentToLoad?.root?.children ? contentToLoad.root.children.length : 0,
          //   childrenPreview: contentToLoad?.root?.children?.slice(0, 2).map(child => ({
          //     text: child.data?.text,
          //     childCount: child.children?.length || 0
          //   }))
          // }); // 隐私保护：不输出用户数据
          
          // 发送加载数据事件
          this.$bus.$emit('loadMindMapData', { content: contentToLoad });
          
          // 更新当前思维导图ID到store
          this.$store.commit('setCurrentMindMapId', mindMapToLoad.id);
          
          // 设置超时，确保即使没有收到完成事件也能继续
          setTimeout(() => {
            this.$bus.$off('mindMapLoaded', listener);
            resolve();
          }, 100);
        });
        
        // 等待思维导图加载完成后再关闭对话框
        await loadPromise;
        // console.log('思维导图已加载，关闭对话框'); // 仅调试时使用
        this.closeMindMapDialog();
        // console.log('思维导图加载完成'); // 仅调试时使用
      } catch (err) {
        // 加载思维导图异常
      }
    },
    
    // 删除思维导图
    async deleteMindMap(mindMap) {
      // console.log('准备删除思维导图:', mindMap); // 隐私保护：不输出用户数据
      try {
        await this.$confirm(`确定要删除思维导图 "${mindMap.title}" 吗？`, '删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        this.statusMessage = `正在删除: ${mindMap.title}`
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        await this.$store.dispatch('deleteMindMap', {
          mindMapId: mindMap.id,
          userId: currentUser.id
        })
        
        this.$message.success('思维导图删除成功')
        
        // 更新状态栏信息
        this.statusMessage = `已删除: ${mindMap.title}`
        
        // 重新加载思维导图列表
        const updatedMindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id)
        this.mindMaps = updatedMindMaps
        // console.log('删除后更新思维导图列表，共', updatedMindMaps.length, '个'); // 仅调试时使用
        
        // 设置状态消息在8秒后清除
        setTimeout(() => {
          this.statusMessage = ''
        }, 8000)
      } catch (err) {
        if (err !== 'cancel') {
          console.error('删除思维导图失败:', err)
          this.$message.error('删除思维导图失败: ' + err.message)
          this.statusMessage = `删除失败: ${mindMap.title} - ${err.message}`
          // 设置状态消息在8秒后清除
          setTimeout(() => {
            this.statusMessage = ''
          }, 8000)
        } else {
          this.statusMessage = `用户取消删除: ${mindMap.title}`
          // 设置状态消息在8秒后清除
          setTimeout(() => {
            this.statusMessage = ''
          }, 8000)
        }
      }
    },
    
    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    },
    
    // 预加载思维导图列表
    async preloadMindMaps() {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        if (!currentUser) {
          return // 用户未登录，跳过预加载
        }
        
        // console.log('开始预加载思维导图列表...'); // 仅调试时使用
        const mindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id)
        this.mindMaps = mindMaps
        // console.log('思维导图列表预加载完成，共', mindMaps.length, '个'); // 仅调试时使用
      } catch (error) {
        // console.log('思维导图预加载失败:', error.message); // 仅调试时使用
        // 预加载失败不影响用户体验，静默处理
      }
    },
    
    // 预加载AI模型配置
    async preloadAiConfigs() {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        if (!currentUser) {
          return // 用户未登录，跳过预加载
        }
        
        // console.log('开始预加载AI模型配置...'); // 仅调试时使用
        const aiConfigs = await this.$store.dispatch('fetchAvailableAiConfigs', currentUser.id)
        // console.log('AI模型配置预加载完成，共', aiConfigs.length, '个'); // 仅调试时使用
      } catch (error) {
        // console.log('AI模型配置预加载失败:', error.message); // 仅调试时使用
        // 预加载失败不影响用户体验，静默处理
      }
    },
    
    // 刷新思维导图列表
    async refreshMindMaps() {
      try {
        this.mindMapLoading = true; // 显示加载状态
        this.statusMessage = '正在刷新思维导图列表...';
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
          this.$message.error('用户未登录，无法刷新思维导图列表');
          this.statusMessage = '用户未登录';
          // 设置状态消息在8秒后清除
          setTimeout(() => {
            this.statusMessage = '';
          }, 8000);
          return;
        }
        
        // console.log('开始刷新思维导图列表...'); // 仅调试时使用
        const mindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id);
        this.mindMaps = mindMaps;
        this.filteredMindMaps = mindMaps; // 同时更新过滤后的列表
        
        // console.log('思维导图列表刷新完成，共', mindMaps.length, '个'); // 仅调试时使用
        this.$message.success(`思维导图列表刷新完成，共 ${mindMaps.length} 个`);
        this.statusMessage = `已更新 ${mindMaps.length} 个思维导图`;
      } catch (error) {
        console.error('刷新思维导图列表失败:', error);
        this.$message.error('刷新思维导图列表失败: ' + error.message);
        this.statusMessage = '刷新失败: ' + error.message;
      } finally {
        this.mindMapLoading = false; // 隐藏加载状态
        // 8秒后清除状态消息
        setTimeout(() => {
          this.statusMessage = '';
        }, 8000);
      }
    },
    
    // 处理搜索
    handleSearch() {
      // 搜索时清空选中状态
      this.selectedMindMaps = []
      
      // 更新状态栏信息
      const count = this.filteredMindMaps.length
      this.statusMessage = `共检索出 ${count} 个思维导图`
      
      // 设置状态消息在8秒后清除
      setTimeout(() => {
        this.statusMessage = ''
      }, 8000)
    },
    
    // 检查是否选中
    isSelected(mindMapId) {
      return this.selectedMindMaps.includes(mindMapId)
    },
    
    // 切换选中状态
    toggleSelection(mindMapId) {
      const index = this.selectedMindMaps.indexOf(mindMapId)
      const mindMap = this.mindMaps.find(map => map.id === mindMapId)
      const mindMapTitle = mindMap ? mindMap.title : '未知思维导图'
      
      if (index > -1) {
        this.selectedMindMaps.splice(index, 1)
        this.statusMessage = `已取消选中: ${mindMapTitle}`
      } else {
        this.selectedMindMaps.push(mindMapId)
        this.statusMessage = `已选中: ${mindMapTitle}`
      }
      
      // 设置状态消息在8秒后清除
      setTimeout(() => {
        this.statusMessage = ''
      }, 8000)
    },
    
    // 批量删除思维导图
    async batchDeleteMindMaps() {
      if (this.selectedMindMaps.length === 0) {
        this.$message.warning('请选择要删除的思维导图')
        this.statusMessage = '未选择任何思维导图，无法执行批量删除'
        // 设置状态消息在8秒后清除
        setTimeout(() => {
          this.statusMessage = ''
        }, 8000)
        return
      }
      
      try {
        await this.$confirm(`确定要删除选中的 ${this.selectedMindMaps.length} 个思维导图吗？`, '批量删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        this.statusMessage = `正在删除 ${this.selectedMindMaps.length} 个思维导图...`
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        
        // 逐个删除选中的思维导图
        for (const mindMapId of this.selectedMindMaps) {
          await this.$store.dispatch('deleteMindMap', {
            mindMapId: mindMapId,
            userId: currentUser.id
          })
        }
        
        this.$message.success(`成功删除 ${this.selectedMindMaps.length} 个思维导图`)
        
        // 更新状态栏信息
        this.statusMessage = `已删除 ${this.selectedMindMaps.length} 个思维导图`
        
        // 清空选中状态
        this.selectedMindMaps = []
        
        // 重新加载思维导图列表
        const updatedMindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id)
        this.mindMaps = updatedMindMaps
        // console.log('批量删除后更新思维导图列表，共', updatedMindMaps.length, '个'); // 仅调试时使用
        
        // 设置状态消息在8秒后清除
        setTimeout(() => {
          this.statusMessage = ''
        }, 8000)
      } catch (err) {
        if (err !== 'cancel') {
          console.error('批量删除思维导图失败:', err)
          this.$message.error('批量删除思维导图失败: ' + err.message)
          this.statusMessage = '批量删除失败: ' + err.message
          // 设置状态消息在8秒后清除
          setTimeout(() => {
            this.statusMessage = ''
          }, 8000)
        } else {
          this.statusMessage = '用户取消了批量删除操作'
          // 设置状态消息在8秒后清除
          setTimeout(() => {
            this.statusMessage = ''
          }, 8000)
        }
      }
    },
    
    // 一键删除所有思维导图
    async deleteAllMindMaps() {
      if (this.mindMaps.length === 0) {
        this.$message.warning('没有思维导图可以删除')
        this.statusMessage = '没有思维导图可以删除'
        // 设置状态消息在8秒后清除
        setTimeout(() => {
          this.statusMessage = ''
        }, 8000)
        return
      }
      
      try {
        await this.$confirm(
          `⚠️ 危险操作警告！\n\n您即将删除所有 ${this.mindMaps.length} 个思维导图，此操作不可撤销！\n\n请确认您真的要执行此操作？`, 
          '一键删除警告', 
          {
            confirmButtonText: '我确定要删除所有',
            cancelButtonText: '取消',
            type: 'error',
            dangerouslyUseHTMLString: true
          }
        )
        
        // 二次确认
        await this.$confirm(
          '这是最后一次确认！\n\n删除后无法恢复，您确定要继续吗？', 
          '最终确认', 
          {
            confirmButtonText: '确定删除',
            cancelButtonText: '取消',
            type: 'error'
          }
        )
        
        this.statusMessage = '正在执行一键删除操作...'
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        
        // 删除所有思维导图
        for (const mindMap of this.mindMaps) {
          await this.$store.dispatch('deleteMindMap', {
            mindMapId: mindMap.id,
            userId: currentUser.id
          })
        }
        
        this.$message.success(`成功删除所有 ${this.mindMaps.length} 个思维导图`)
        
        // 更新状态栏信息
        this.statusMessage = `思维导图已全部删除（共 ${this.mindMaps.length} 个）`
        
        // 清空选中状态和列表
        this.selectedMindMaps = []
        this.mindMaps = []
        
        // 设置状态消息在8秒后清除
        setTimeout(() => {
          this.statusMessage = ''
        }, 8000)
      } catch (err) {
        if (err !== 'cancel') {
          console.error('一键删除思维导图失败:', err)
          this.$message.error('一键删除思维导图失败: ' + err.message)
          this.statusMessage = '一键删除失败: ' + err.message
          // 设置状态消息在8秒后清除
          setTimeout(() => {
            this.statusMessage = ''
          }, 8000)
        } else {
          this.statusMessage = '用户取消了一键删除操作'
          // 设置状态消息在8秒后清除
          setTimeout(() => {
            this.statusMessage = ''
          }, 8000)
        }
      }
    },
    
    handleUserCommand(command) {
      if (command === 'logout') {
        // 触发退出登录事件
        this.$bus.$emit('logout')
      } else if (command === 'changePassword') {
        this.changePassword()
      }
    },
    
    logout() {
      // 触发退出登录事件
      this.$bus.$emit('logout')
    },
    
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
        console.error('修改密码失败:', error);
        throw error;
      }
    },
    
    resetPasswordFields() {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    }
  }
}

// CSS样式已移动到 <style> 标签中

</script>

<style lang="less" scoped>
.no-mindmaps {
  text-align: center;
  color: #999;
  padding: 20px;
}

.mindmap-toolbar-container {
  display: flex;
  align-items: center;
  gap: 12px;  /* 在搜索框和按钮组之间添加间距 */
  margin-bottom: 20px;  /* 增加间距从15px到20px，增加了5px */
  padding: 0 24px !important;  /* 与列表容器对齐 */
}

.mindmap-toolbar-buttons {
  display: flex;
  gap: 8px;  /* 按钮之间的间距 */
  align-items: center;  /* 垂直居中对齐 */
  flex-wrap: nowrap;  /* 防止换行 */
}

.mindmap-list-container {
  max-height: 50vh !important;
  overflow-y: auto !important;
  padding: 0 24px !important;
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 16px !important;
}

/* 为第一行的卡片增加上边距 */
.mindmap-list-container .mindmap-card:nth-child(-n+3) {
  margin-top: 5px !important;
}

/* 状态栏样式 */
.mindmap-status-bar {
  padding: 8px 24px;
  background-color: #f5f7fa;
  border-top: 1px solid #ebeef5;
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  margin: 0 !important; /* 重置可能的默认边距 */
  padding-left: 24px !important;
  padding-right: 24px !important;
}

/* 在对话框footer中的状态栏样式，填满整个footer区域 */
.el-dialog__footer {
  padding: 0 !important;
}

.el-dialog__footer .mindmap-status-bar {
  padding: 0 !important;
  margin: 0 !important;
  height: 38px !important; /* 默认高度38px */
  width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-top: none !important; /* 移除顶部边框 */
  min-height: 38px !important; /* 最小高度也设置为38px */
}

/* 对话框内部整体容器样式，确保列表区域可滚动 */
.mindmap-content-wrapper {
  max-height: calc(50vh - 60px); /* 考虑标题栏和其他元素高度 */
  display: flex;
  flex-direction: column;
}

/* 列表容器占据可用空间并可滚动 */
.mindmap-list-container {
  max-height: calc(50vh - 120px) !important; /* 调整高度以考虑工具栏和状态栏 */
  overflow-y: auto !important;
  padding: 0 24px !important;
  display: grid !important;
  grid-template-columns: repeat(3, 1fr) !important;
  gap: 16px !important;
  flex: 1; /* 占据可用空间 */
}

.toolbarContainer.isDark .mindmap-status-bar {
  background-color: #2d3238;
  border-top-color: #4c5156;
  color: #c0c4cc;
}

.mindmap-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  background-color: #f5f7fa;  /* 改善背景色，更柔和 */
  transition: all 0.3s;
  cursor: pointer;  /* 改为pointer提示可双击 */
  height: fit-content;
  
  &:hover {
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    border-color: #409eff;
    background-color: #ecf5ff;
    transform: translateY(-2px);  /* 添加轻微上浮效果 */
  }
}

/* 深色主题下的样式 */
.toolbarContainer.isDark .mindmap-card {
  background-color: #3a3f45;  /* 深色主题下更柔和的背景 */
  border-color: #54595f;
  color: #e4e7ed;
  
  &:hover {
    background-color: #4a5056;
    border-color: #409eff;
  }
}

.toolbarContainer.isDark .mindmap-title {
  color: #ffffff;
}

.toolbarContainer.isDark .mindmap-date {
  color: #a8abb2;
}

.mindmap-card-content {
  display: flex;
  flex-direction: column;
}

.mindmap-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.mindmap-checkbox {
  /deep/ .el-checkbox {
    /deep/ .el-checkbox__input {
      /deep/ .el-checkbox__inner {
        border-radius: 50% !important;  /* 改为圆形 */
        width: 16px !important;
        height: 16px !important;
      }
    }
  }
}

/* 深色主题下的选择框样式 */
.toolbarContainer.isDark {
  /deep/ .mindmap-checkbox {
    /deep/ .el-checkbox {
      /deep/ .el-checkbox__input {
        /deep/ .el-checkbox__inner {
          background-color: #3a3f45 !important;  /* 柔和的深色背景 */
          border-color: #606266 !important;
          
          &:hover {
            border-color: #409eff !important;
          }
        }
        
        &.is-checked /deep/ .el-checkbox__inner {
          background-color: #409eff !important;
          border-color: #409eff !important;
        }
        
        &.is-indeterminate /deep/ .el-checkbox__inner {
          background-color: #409eff !important;
          border-color: #409eff !important;
        }
      }
      
      /deep/ .el-checkbox__label {
        color: #e4e7ed !important;
      }
    }
    
    /deep/ .el-checkbox__input.is-checked + .el-checkbox__label {
      color: #409eff !important;
    }
  }
}

.mindmap-title {
  font-weight: bold;
  margin-bottom: 5px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mindmap-date {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.mindmap-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.mindmap-actions button {
  padding: 4px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  background-color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.mindmap-actions .load-btn {
  color: #409eff;
  border-color: #b3d8ff;
  background-color: #ecf5ff;
}

.mindmap-actions .load-btn:hover {
  background-color: #409eff;
  color: #fff;
}

.mindmap-actions .delete-btn {
  color: #f56c6c;
  border-color: #fbc4c4;
  background-color: #fef0f0;
}

.mindmap-actions .delete-btn:hover {
  background-color: #f56c6c;
  color: #fff;
}

.toolbarContainer {
  &.isDark {
    .toolbar {
      color: hsla(0, 0%, 100%, 0.9);
      .toolbarBlock {
        background-color: #262a2e;

        .fileTreeBox {
          background-color: #262a2e;

          /deep/ .el-tree {
            background-color: #262a2e;

            &.el-tree--highlight-current {
              .el-tree-node.is-current > .el-tree-node__content {
                background-color: hsla(0, 0%, 100%, 0.05) !important;
              }
            }

            .el-tree-node:focus > .el-tree-node__content {
              background-color: hsla(0, 0%, 100%, 0.05) !important;
            }

            .el-tree-node__content:hover,
            .el-upload-list__item:hover {
              background-color: hsla(0, 0%, 100%, 0.02) !important;
            }
          }

          .fileTreeWrap {
            .customTreeNode {
              .treeNodeInfo {
                color: #fff;
              }

              .treeNodeBtnList {
                .el-button {
                  padding: 7px 5px;
                }
              }
            }
          }
        }
      }

      .toolbarBtn {
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
  }
  .toolbar {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    top: 20px;
    width: max-content;
    display: flex;
    font-size: 12px;
    font-family: PingFangSC-Regular, PingFang SC;
    font-weight: 400;
    color: rgba(26, 26, 26, 0.8);
    z-index: 2;

    .toolbarBlock {
      display: flex;
      background-color: #fff;
      padding: 10px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);
      border: 1px solid rgba(0, 0, 0, 0.06);
      margin-right: 20px;
      flex-shrink: 0;
      position: relative;

      &:last-of-type {
        margin-right: 0;
      }

      .fileTreeBox {
        position: absolute;
        left: 0;
        top: 68px;
        width: 100%;
        height: 30px;
        background-color: #fff;
        padding: 12px 5px;
        padding-top: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-radius: 5px;
        min-width: 200px;
        box-shadow: 0 2px 16px 0 rgba(0, 0, 0, 0.06);

        &.expand {
          height: 300px;

          .fileTreeWrap {
            visibility: visible;
          }
        }

        .fileTreeToolbar {
          width: 100%;
          height: 30px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e9e9e9;
          margin-bottom: 12px;
          padding-left: 12px;

          .fileTreeName {
          }

          .fileTreeActionList {
            .btn {
              font-size: 18px;
              margin-left: 12px;
              cursor: pointer;
            }
          }
        }

        .fileTreeWrap {
          width: 100%;
          height: 100%;
          overflow: auto;
          visibility: hidden;

          .customTreeNode {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
            padding-right: 5px;

            .treeNodeInfo {
              display: flex;
              align-items: center;

              .treeNodeIcon {
                margin-right: 5px;
                opacity: 0.7;
              }

              .treeNodeName {
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }

            .treeNodeBtnList {
              display: flex;
              align-items: center;
            }
          }
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
      }
    }
  }
}

/* 用户下拉菜单样式 */
.user-dropdown {
  margin-right: 0;
}

.user-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0 10px;
}

.user-menu-btn .icon {
  font-size: 16px;
  margin-right: 5px;
}

.user-menu-btn .text {
  margin: 0 5px 0 0; /* 调整用户名文本的边距 */
  max-width: 100px; /* 限制用户名宽度 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 用户下拉菜单弹出层样式 - 与触发元素右对齐，并向右偏移4px */
.user-dropdown-popper {
  right: -4px !important;
  left: auto !important;
}

/* 用户下拉菜单文本颜色 */
.user-dropdown-popper .el-dropdown-menu__item {
  color: #606266 !important; /* 设置为浅亮色 */
}

.user-dropdown-popper .el-dropdown-menu__item:focus,
.user-dropdown-popper .el-dropdown-menu__item:hover {
  background-color: #f5f7fa !important;
  color: #409eff !important; /* 悬停时的颜色 */
}

/* 灰色主题消息框样式 */
.el-message-box-gray {
  background-color: #f4f4f5 !important;
  border-color: #e4e7ed !important;
  color: #000 !important;
}

.el-message-box-gray .el-message-box__title,
.el-message-box-gray .el-message-box__message {
  color: #000 !important;
}

.el-message-box-gray .el-input__inner {
  background-color: #fff !important;
  border-color: #dcdfe6 !important;
  color: #000 !important;
}

.el-message-box-gray .el-message-box__btns {
  border-top-color: #e4e7ed !important;
}

/* 深色主题下的用户菜单样式 */
.toolbarContainer.isDark .user-menu-btn .icon {
  color: #fff;
}

.toolbarContainer.isDark .user-menu-btn .text {
  color: #409EFF; /* 使用醒目的蓝色 */
  font-weight: bold; /* 加粗显示 */
}

.toolbarContainer.isDark .user-menu-btn:hover .icon {
  background: hsla(0, 0%, 100%, 0.05);
}
</style>
