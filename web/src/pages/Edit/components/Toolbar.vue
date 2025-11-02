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
        <div class="toolbarBtn" @click="openDirectory" v-if="false">
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
          v-if="false"
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
        <div class="toolbarBtn" @click="showTagManager" v-if="!isMobile">
          <span class="icon iconfont iconbiaoqian"></span>
          <span class="text">标签管理</span>
        </div>
        <div class="toolbarBtn" @click="saveLocalFile" v-if="false">
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
        <el-dropdown class="user-dropdown" popper-class="user-dropdown-popper" @command="handleUserCommand" @visible-change="onDropdownVisibilityChange" trigger="click">
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
    <MindMapHistory 
      :visible.sync="showMindMapDialog"
      @load-mind-map="handleLoadMindMap"
    />
    
    <!-- 标签管理器 -->
    <MindMapTagManager ref="tagManager" />
    
    <!-- 新建思维导图保存确认对话框 -->
    <el-dialog
      title="温馨提示"
      :visible.sync="showNewMindMapSaveConfirm"
      width="500px"
      :modal-append-to-body="false"
      :close-on-click-modal="false"
      :before-close="handleNewMindMapSaveConfirmClose"
      custom-class="draggable-new-mindmap-confirm-dialog newMindMapSaveConfirmDialog"
      :class="{ isDark: isDark }"
    >
      <div class="confirm-content">
        <p class="confirm-text">
          检测到当前思维导图"<strong>{{ currentMindMapTitleForNew }}</strong>"已发生变化，是否需要保存？
        </p>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button 
          size="small" 
          @click="handleCancelNewMindMap"
          icon="el-icon-close"
        >
          取消
        </el-button>
        <el-button 
          size="small" 
          type="warning" 
          @click="handleNewMindMapWithoutSave"
          icon="el-icon-warning"
        >
          不保存
        </el-button>
        <el-button 
          size="small" 
          type="primary" 
          @click="handleSaveAndNewMindMap"
          icon="el-icon-check"
        >
          保存并新建
        </el-button>
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
import MindMapHistory from './MindMapHistory.vue'
import MindMapTagManager from './MindMapTagManager.vue'
import { mapState } from 'vuex'
import { Notification } from 'element-ui'
import exampleData from 'simple-mind-map/example/exampleData'
import { getData } from '../../../api'
import ToolbarNodeBtnList from './ToolbarNodeBtnList.vue'
import { throttle, isMobile } from 'simple-mind-map/src/utils/index'
import { setMindMapCache, removeMindMapCache } from '@/utils/mindmap-cache-manager'
import { getCurrentMindMapIdFromVueInstance } from '@/utils/vue-instance-helpers'

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
  'numbering',
  'todo',
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
    ToolbarNodeBtnList,
    MindMapHistory,
    MindMapTagManager
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
      // 密码修改相关
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
      
      // 新建思维导图保存确认对话框相关
      showNewMindMapSaveConfirm: false,
      currentMindMapTitleForNew: '',
      
      // 本地思维导图实例
      localMindMapInstance: null
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
    // 监听思维导图初始化事件
    this.$bus.$on('mind_map_inited', this.handleMindMapInited)
    
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
    // 移除思维导图初始化事件监听
    this.$bus.$off('mind_map_inited', this.handleMindMapInited)
    // 清理新建确认对话框拖拽事件
    this.cleanupNewMindMapSaveConfirmDragEvents()
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
      // 保存当前思维导图ID到localStorage，以便刷新后恢复
      // 只有当ID存在时才保存，避免存储null值
      const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
      if (currentMindMapId) {
        localStorage.setItem('REFRESH_ID', currentMindMapId);
      } else {
        // 如果当前没有ID（如新建的思维导图），清除可能存在的REFRESH_ID
        localStorage.removeItem('REFRESH_ID');
      }
      
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

    // 创建新思维导图
    async createNewLocalFile() {
      // 首先检查当前思维导图是否需要保存
      try {
        const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
        
        // 获取当前思维导图实例
        const currentMindMap = this.getCurrentMindMapInstance();
        if (!currentMindMap) {
          await this.createActualNewMindMap();
          return;
        }
        
        const currentData = currentMindMap.getData(true);
        const needsSave = await this.$store.dispatch('needsSave', {
          currentMindMap: {
            id: currentMindMapId,
            data: currentData
          }
        });
        
        if (needsSave) {
          // 需要保存，显示保存确认对话框
          this.showNewMindMapSaveConfirmDialog();
        } else {
          // 不需要保存，直接创建新思维导图
          await this.createActualNewMindMap();
        }
      } catch (error) {
        // 出错时按需要保存处理
        this.showNewMindMapSaveConfirmDialog();
      }
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
        
        const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
        // 调用store中的保存方法，根据是否有ID决定是更新还是创建
        const result = await this.$store.dispatch('saveMindMap', {
          id: currentMindMapId,  // 传递ID参数，如果有ID则更新，否则创建
          userId: currentUser.id,
          title: title,
          content: data
        })
        
        // 如果之前没有ID但保存后获得了ID，则更新当前ID
        if (result && result.id) {
          const updatedCurrentMindMapId = this.$store.state.currentMindMapId;
          if (!updatedCurrentMindMapId) {
            this.$store.commit('setCurrentMindMapId', result.id);
          } else {
          }
          
          // 保存成功后，立即更新本地缓存
          try {
            setMindMapCache(result.id, data);
          } catch (error) {
          }
        } else {
          // 如果是更新操作，使用当前ID更新缓存
          const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
          if (currentMindMapId) {
            try {
              const cacheKey = `mindmap_cache_${currentMindMapId}`;
              localStorage.setItem(cacheKey, JSON.stringify(data));
            } catch (error) {
            }
          }
        }
        
        this.$message.success('思维导图保存成功')
      } catch (error) {
        if (error && error.message && error.message.includes('取消')) {
          // 用户取消操作，不显示错误消息
          return
        }
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
        
        const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
        // 调用store中的保存方法，根据是否有ID决定是更新还是创建
        const result = await this.$store.dispatch('saveMindMap', {
          id: currentMindMapId,  // 传递ID参数，如果有ID则更新，否则创建
          userId: currentUser.id,
          title: autoSaveTitle,
          content: data
        })
        
        // 如果自动保存成功且获得了新ID（表示新建了思维导图），更新当前思维导图ID
        if (result && result.id) {
          const updatedCurrentMindMapId = this.$store.state.currentMindMapId;
          if (!updatedCurrentMindMapId) {
            this.$store.commit('setCurrentMindMapId', result.id);
          } else {
          }
          
          // 自动保存成功后，立即更新本地缓存
          try {
            setMindMapCache(result.id, data);
          } catch (error) {
          }
        } else {
          // 如果是更新操作，使用当前ID更新缓存
          const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
          if (currentMindMapId) {
            try {
              setMindMapCache(currentMindMapId, data);
            } catch (error) {
            }
          }
        }
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
      
      // 检查是否按下Alt+t - 打开标签管理器
      if (event.altKey && event.key === 't') {
        event.preventDefault() // 阻止默认行为
        this.showTagManager() // 显示标签管理器
      }
      
      // 检查是否按下Shift+C - 打开备注对话框
      if (event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault() // 阻止默认行为
        // 检查是否有选中的节点
        if (this.$mindMap && this.$mindMap.getSelectedNodeList().length > 0) {
          // 触发备注对话框事件
          this.$bus.$emit('showNodeNote', this.$mindMap.getSelectedNodeList()[0])
        }
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
        
        // 显示对话框
        this.showMindMapDialog = true
      } catch (error) {
        this.$message.error('显示思维导图对话框失败: ' + error.message)
      }
    },
    
    // 处理从 MindMapHistory 组件传来的加载思维导图事件
    async handleLoadMindMap(mindMap) {
      // 保存一份副本以避免引用问题
      const mindMapToLoad = JSON.parse(JSON.stringify(mindMap));
      
      try {
        // 1. 先保存当前思维导图的数据到缓存（如果有修改）
        if (this.$getCurrentData) {
          const currentData = this.$getCurrentData();
          const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance() || 'current';
          this.saveMindMapDataToCache(currentMindMapId, currentData);
        }
        
        // 2. 从缓存中获取目标思维导图的数据
        const contentToLoad = await this.getMindMapDataFromCache(mindMapToLoad.id);
        
        if (!contentToLoad) {
          this.$message.error('加载思维导图失败：无法获取数据');
          return;
        }
        
        // 创建一个Promise来确保数据加载完成
        const loadPromise = new Promise((resolve) => {
          // 监听一个自定义事件，当思维导图渲染完成时触发
          const listener = () => {
            this.$bus.$off('mindMapLoaded', listener);
            resolve();
          };
          this.$bus.$on('mindMapLoaded', listener);
          
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
        
        // 等待思维导图加载完成
        await loadPromise;
      } catch (err) {
        this.$message.error('加载思维导图失败');
      }
    },
    
    
    // 从缓存中获取思维导图数据（如果缓存中没有，则从数据库获取）
    async getMindMapDataFromCache(mindMapId) {
      // 1. 先尝试从统一缓存获取
      try {
        const cachedData = getMindMapCache(mindMapId);
        
        if (cachedData) {
          return cachedData;
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
        setMindMapCache(mindMapId, data);
      } catch (error) {
        // 保存失败，但不抛出错误
      }
    },
    
    
    // 预加载思维导图列表
    async preloadMindMaps() {
      try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        if (!currentUser) {
          return // 用户未登录，跳过预加载
        }
        
        // 使用store中的增量同步函数
        await this.$store.dispatch('syncMindMapCacheIncrementally', currentUser.id);
        
        // 获取最新的思维导图列表用于界面显示
        const updatedMindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id);
        this.mindMaps = updatedMindMaps;
        
        
      } catch (error) {
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
        
        const aiConfigs = await this.$store.dispatch('fetchAvailableAiConfigs', currentUser.id)
      } catch (error) {
      }
    },
    
    // 显示标签管理器
    showTagManager() {
      this.$refs.tagManager.show()
    },

    // 刷新思维导图列表
    async refreshMindMaps() {
      try {
        // 1. 获取当前用户
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
          this.$message.error('请先登录');
          this.$router.push('/login');
          return;
        }

        // 2. 调用缓存同步函数，补全内容缓存
        await this.$store.dispatch('syncMindMapCacheIncrementally', currentUser.id);

        // 3. 从缓存中更新思维导图列表
        const updatedMindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id);
        this.mindMaps = updatedMindMaps;

        this.$message.success('刷新完成');
        this.statusMessage = `刷新完成，共 ${updatedMindMaps.length} 个思维导图`;
        
        // 移除自动重置为就绪的逻辑，保持状态信息不变
        // setTimeout(() => {
        //   this.statusMessage = '';
        // }, 5000);
      } catch (error) {
        this.$message.error('刷新失败: ' + error.message);
        this.statusMessage = `刷新失败: ${error.message}`;
        
        // 移除自动重置为就绪的逻辑，保持状态信息不变
        // setTimeout(() => {
        //   this.statusMessage = '';
        // }, 5000);
      }
    },

    
    // 从思维导图数据中获取标题
    getCurrentMindMapTitleFromData(data) {
      if (data && data.root && data.root.data && data.root.data.text) {
        // 移除HTML标签，获取纯文本
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = data.root.data.text;
        return tempDiv.textContent || tempDiv.innerText || '未命名思维导图';
      }
      return '未命名思维导图';
    },
    
    // 处理搜索
    handleSearch() {
      // 搜索时清空选中状态
      this.selectedMindMaps = []
      
      // 更新状态栏信息
      const count = this.filteredMindMaps.length
      this.statusMessage = `共检索出 ${count} 个思维导图`
      
      // 移除自动重置为就绪的逻辑，保持状态信息不变
      // setTimeout(() => {
      //   this.statusMessage = ''
      // }, 8000)
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
      
      // 移除自动重置为就绪的逻辑，保持状态信息不变
      // setTimeout(() => {
      //   this.statusMessage = ''
      // }, 8000)
    },
    

    
    // 批量删除思维导图
    async batchDeleteMindMaps() {
      if (this.selectedMindMaps.length === 0) {
        this.$message.warning('请选择要删除的思维导图')
        this.statusMessage = '未选择任何思维导图，无法执行批量删除'
        // 移除自动重置为就绪的逻辑，保持状态信息不变
        // setTimeout(() => {
        //   this.statusMessage = ''
        // }, 8000)
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
        // 清理被删除思维导图的本地缓存
        this.selectedMindMaps.forEach(mindMap => {
          removeMindMapCache(mindMap.id);
        });
        
        this.selectedMindMaps = []
        
        // 重新加载思维导图列表
        const updatedMindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id)
        this.mindMaps = updatedMindMaps
        // 同步到Vuex本地缓存
        this.$store.commit('setLocalMindMaps', updatedMindMaps)
        
        // 批量删除后清空思维导图内容缓存
        const currentMindMapId = this.$store.state.currentMindMapId;
        // 获取所有缓存的ID
        const allCacheIds = Object.keys(this.$store.state.mindMapCacheManager?.cache || {});
        allCacheIds.forEach(cacheId => {
          if (currentMindMapId && cacheId !== currentMindMapId.toString()) {
            removeMindMapCache(cacheId);
          } else if (!currentMindMapId) {
            removeMindMapCache(cacheId);
          }
        });
        
      } catch (err) {
        if (err !== 'cancel') {
          this.$message.error('批量删除思维导图失败: ' + err.message)
          this.statusMessage = '批量删除失败: ' + err.message
        } else {
          this.statusMessage = '用户取消了批量删除操作'
        }
      }
    },
    
    // 一键删除所有思维导图
    async deleteAllMindMaps() {
      if (this.mindMaps.length === 0) {
        this.$message.warning('没有思维导图可以删除')
        this.statusMessage = '没有思维导图可以删除'
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
        // 同步清空Vuex本地缓存
        this.$store.commit('setLocalMindMaps', [])
        
      } catch (err) {
        if (err !== 'cancel') {
          this.$message.error('一键删除思维导图失败: ' + err.message)
          this.statusMessage = '一键删除失败: ' + err.message
        } else {
          this.statusMessage = '用户取消了一键删除操作'
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
        // console.error('修改密码失败:', error);
        throw error;
      }
    },
    
    resetPasswordFields() {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmNewPassword = '';
    },

    // 处理下拉菜单显示/隐藏，动态添加深色主题样式
    onDropdownVisibilityChange(visible) {
      if (visible && this.isDark) {
        // 下拉菜单显示时，如果是深色主题，添加深色主题类
        this.$nextTick(() => {
          const dropdownEl = document.querySelector('.user-dropdown-popper')
          if (dropdownEl) {
            dropdownEl.classList.add('dropdown-dark-theme')
          }
        })
      }
    },

    // 获取当前思维导图实例
    getCurrentMindMapInstance() {
      // 1. 优先使用本地保存的实例
      if (this.localMindMapInstance) {
        return this.localMindMapInstance;
      }
      
      // 2. 尝试从事件总线获取
      if (window.mindMapInstance) {
        return window.mindMapInstance;
      }
      
      // 3. 尝试从全局变量获取
      if (this.$root.$children && this.$root.$children[0] && this.$root.$children[0].mindMap) {
        return this.$root.$children[0].mindMap;
      }
      
      // 4. 尝试通过getData函数的上下文获取
      try {
        const data = getData();
        if (data && window.mindMapInstanceFromGetData) {
          return window.mindMapInstanceFromGetData;
        }
      } catch (error) {
      }
      
      return null;
    },

    // 显示新建思维导图保存确认对话框
    showNewMindMapSaveConfirmDialog() {
      // 获取当前思维导图的标题
      this.getCurrentMindMapTitleForNew();
      
      // 显示确认对话框
      this.showNewMindMapSaveConfirm = true;
      
      // 延迟初始化拖拽功能，确保DOM完全渲染
      this.$nextTick(() => {
        setTimeout(() => {
          this.initDragForNewMindMapDialog('.draggable-new-mindmap-confirm-dialog', '温馨提示');
        }, 100);
      });
    },

    // 获取当前思维导图标题（用于新建确认对话框）
    getCurrentMindMapTitleForNew() {
      try {
        const currentMindMap = this.getCurrentMindMapInstance();
        if (currentMindMap && currentMindMap.renderer && currentMindMap.renderer.root) {
          const rootData = currentMindMap.renderer.root.getData();
          if (rootData && rootData.text) {
            // 移除HTML标签，获取纯文本
            this.currentMindMapTitleForNew = rootData.text.replace(/<[^>]*>/g, '').trim();
          } else {
            this.currentMindMapTitleForNew = '未命名思维导图';
          }
        } else {
          this.currentMindMapTitleForNew = '未命名思维导图';
        }
      } catch (error) {
        this.currentMindMapTitleForNew = '未命名思维导图';
      }
    },

    // 执行实际的新建思维导图
    async createActualNewMindMap() {
      try {
        // 获取当前主题信息
        const currentTheme = this.$store.state.localConfig.theme || 'default';
        // 创建新的思维导图数据，只包含根节点
        const newMindMapData = {
          root: {
            data: {
              text: '未命名主题'
            },
            children: []
          },
          theme: currentTheme,
          layout: this.$store.state.localConfig.layout || 'logicalStructure',
          config: {
            // 保持当前的一些基本配置
            enableFreeDrag: this.$store.state.localConfig.enableFreeDrag || false,
            watermark: this.$store.state.localConfig.watermark || {}
          }
        };
        
        // 通过事件总线设置新数据
        this.$bus.$emit('setData', newMindMapData);
        
        // 清除当前思维导图ID
        this.$store.commit('setCurrentMindMapId', null);
        // 等待一下让思维导图渲染
        setTimeout(() => {
          const currentMindMap = this.getCurrentMindMapInstance();
          if (currentMindMap && currentMindMap.renderer && currentMindMap.renderer.root) {
            currentMindMap.renderer.setRootNodeCenter();
          }
        }, 100);
        
        this.$message.success('新思维导图创建成功');
      } catch (error) {
        this.$message.error('创建新思维导图失败: ' + error.message);
      }
    },

    // 处理保存并新建
    async handleSaveAndNewMindMap() {
      // 1. 关闭确认对话框
      this.showNewMindMapSaveConfirm = false;
      
      // 2. 在开始任何操作前，先复制当前思维导图的数据和ID
      const currentMindMapId = this.$store.state.currentMindMapId;
      const currentUser = this.$store.state.currentUser;
      const currentMindMap = this.getCurrentMindMapInstance();
      
      if (!currentMindMap) {
        await this.createActualNewMindMap();
        return;
      }
      
      const originalData = JSON.parse(JSON.stringify(currentMindMap.getData(true))); // 深拷贝原始数据
      const originalTitle = this.currentMindMapTitleForNew;
      
      // 3. 开始新建（与保存同时进行）
      const newMindMapPromise = this.createActualNewMindMap();
      
      // 4. 在后台异步保存原始数据（与新建同时进行）
      if (currentUser && originalData) {
        // 显示保存状态
        this.saveMindMapDataForNew(originalData, originalTitle, currentMindMapId, currentUser.id)
          .then(result => {
            // 使用通知提示保存成功
            this.$notify({
              title: '保存成功',
              message: '原思维导图已保存!',
              type: 'success',
              duration: 3000
            });
          })
          .catch(error => {
            // 使用通知提示保存失败
            this.$notify({
              title: '保存失败',
              message: '原思维导图保存失败: ' + error.message,
              type: 'error',
              duration: 5000
            });
          });
      } else {
      }
      
      // 等待新建完成
      await newMindMapPromise;
    },

    // 处理不保存直接新建
    async handleNewMindMapWithoutSave() {
      // 1. 关闭确认对话框
      this.showNewMindMapSaveConfirm = false;
      
      // 2. 直接开始新建
      await this.createActualNewMindMap();
    },

    // 处理取消新建
    handleCancelNewMindMap() {
      // 关闭确认对话框
      this.showNewMindMapSaveConfirm = false;
      this.$message.info('已取消新建思维导图');
    },

    // 处理新建保存确认对话框关闭
    handleNewMindMapSaveConfirmClose() {
      // 用户直接关闭对话框，相当于取消操作
      this.showNewMindMapSaveConfirm = false;
      this.$message.info('已取消新建思维导图');
    },

    // 保存思维导图数据的辅助方法（用于新建功能）
    async saveMindMapDataForNew(content, title, mindMapId, userId) {
      try {
        let result;
        if (mindMapId) {
          // 更新现有思维导图
          result = await this.$store.dispatch('saveMindMap', {
            id: mindMapId,
            userId: userId,
            title: title,
            content: content,
            isUpdate: true
          });
        } else {
          // 创建新思维导图
          result = await this.$store.dispatch('saveMindMap', {
            userId: userId,
            title: title,
            content: content,
            isUpdate: false
          });
        }
        return result;
      } catch (error) {
        throw error;
      }
    },

    // 为新建确认对话框初始化拖拽功能
    initDragForNewMindMapDialog(dialogClass, dialogTitle) {
      // 尝试多种选择器方式
      let dialogHeaderEl = document.querySelector(`${dialogClass} .el-dialog__header`);
      let dragDom = document.querySelector(`${dialogClass} .el-dialog`);
      
      // 如果通过custom-class找不到，尝试通过class找
      if (!dialogHeaderEl || !dragDom) {
        const allDialogs = document.querySelectorAll('.el-dialog');
        for (let dialog of allDialogs) {
          const title = dialog.querySelector('.el-dialog__title');
          if (title && title.textContent.includes(dialogTitle)) {
            dragDom = dialog;
            dialogHeaderEl = dialog.querySelector('.el-dialog__header');
            break;
          }
        }
      }

      if (!dialogHeaderEl || !dragDom) {
        return;
      }
      // 设置标题栏样式
      dialogHeaderEl.style.cursor = 'move';
      dialogHeaderEl.style.userSelect = 'none';

      let startX = 0;
      let startY = 0;
      let lastX = 0;
      let lastY = 0;

      const mousedownHandler = (e) => {
        // 只有点击标题栏才触发拖拽
        if (e.target !== dialogHeaderEl && !dialogHeaderEl.contains(e.target)) {
          return;
        }

        startX = e.clientX;
        startY = e.clientY;

        // 获取当前transform值
        const style = window.getComputedStyle(dragDom);
        const transform = style.transform;
        if (transform && transform !== 'none') {
          const matrix = new DOMMatrix(transform);
          lastX = matrix.m41;
          lastY = matrix.m42;
        } else {
          lastX = 0;
          lastY = 0;
        }

        const mousemoveHandler = (e) => {
          const offsetX = e.clientX - startX;
          const offsetY = e.clientY - startY;
          dragDom.style.transform = `translate(${lastX + offsetX}px, ${lastY + offsetY}px)`;
          dragDom.style.willChange = 'transform'; // 优化性能
        };

        const mouseupHandler = () => {
          dragDom.style.willChange = 'auto';
          document.removeEventListener('mousemove', mousemoveHandler);
          document.removeEventListener('mouseup', mouseupHandler);
        };

        document.addEventListener('mousemove', mousemoveHandler);
        document.addEventListener('mouseup', mouseupHandler);

        e.preventDefault();
      };

      dialogHeaderEl.addEventListener('mousedown', mousedownHandler);

      // 保存拖拽处理器以便清理
      if (dialogTitle.includes('温馨提示')) {
        this.newMindMapSaveConfirmDragHandler = {
          element: dialogHeaderEl,
          mousedownHandler: mousedownHandler
        };
      }
    },

    // 清理新建确认对话框拖拽事件
    cleanupNewMindMapSaveConfirmDragEvents() {
      if (this.newMindMapSaveConfirmDragHandler) {
        this.newMindMapSaveConfirmDragHandler.element.removeEventListener('mousedown', this.newMindMapSaveConfirmDragHandler.mousedownHandler);
        this.newMindMapSaveConfirmDragHandler = null;
      }
    },

    // 处理思维导图初始化事件
    handleMindMapInited(mindMap) {
      this.localMindMapInstance = mindMap;
    }
  }
}

// CSS样式已移动到 <style> 标签中

</script>

<style lang="less" scoped>
// 新建思维导图保存确认对话框样式
.newMindMapSaveConfirmDialog {
  margin-top: 115px;
  
  .confirm-content {
    padding: 10px 0;
    
    .confirm-text {
      margin: 0 0 15px 0;
      font-size: 15px;
      color: #606266;
      line-height: 1.5;
      text-align: center;
    }
  }
  
  .dialog-footer {
    text-align: right;
    padding: 15px 20px 0 20px;
    border-top: none;
    
    .el-button {
      margin-left: 12px;
      
      i {
        margin-right: 5px;
      }
    }
  }
}
</style>

<style lang="less">
// 深色主题下的新建思维导图保存确认对话框
.toolbarContainer.isDark .newMindMapSaveConfirmDialog {
  .el-dialog {
    background-color: #2b2f33 !important;
    border: 1px solid #404040 !important;
  }
  
  .el-dialog__header {
    background-color: #2b2f33 !important;
    border-bottom: 1px solid #404040 !important;
  }
  
  .el-dialog__title {
    color: hsla(0, 0%, 100%, 0.9) !important;
  }
  
  .el-dialog__headerbtn .el-dialog__close {
    color: hsla(0, 0%, 100%, 0.6) !important;
  }
  
  .confirm-content {
    .confirm-text {
      color: hsla(0, 0%, 100%, 0.8) !important;
    }
  }
  
  .dialog-footer {
    border-top: none !important;
  }
}</style>

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
  grid-template-columns: repeat(2, 1fr) !important;
  gap: 16px !important;
}

/* 为第一行的卡片增加上边距 */
.mindmap-list-container .mindmap-card:nth-child(-n+2) {
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
  grid-template-columns: repeat(2, 1fr) !important;
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
  padding: 10px;
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

/* 选中状态的卡片样式 */
.mindmap-card.selected {
  border-color: #409eff !important;
  background-color: #e6f7ff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3) !important;
  transform: translateY(-2px); /* 稍微上移以增强选中效果 */
  position: relative;
  z-index: 2; /* 确保选中卡片在其他卡片之上 */
}

/* 深色主题下的样式 */
.toolbarContainer.isDark .mindmap-card {
  background-color: #3a3f45;  /* 深色主题下更柔和的背景 */
  border-color: #54595f;
  color: #e4e7ed;
  padding: 10px;
  
  &:hover {
    background-color: #4a5056;
    border-color: #409eff;
  }
}

/* 深色主题下选中状态的卡片样式 */
.toolbarContainer.isDark .mindmap-card.selected {
  background-color: #409eff !important; /* 蓝色背景 */
  border-color: #66b1ff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.4) !important;
  color: #ffffff !important; /* 确保文字在深色背景上可读 */
  transform: translateY(-2px); /* 稍微上移以增强选中效果 */
  position: relative;
  z-index: 2; /* 确保选中卡片在其他卡片之上 */
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
  position: relative;
  padding-bottom: 30px; /* 为底部操作按钮预留空间，根据整体padding调整 */
}

.mindmap-bottom {
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
  position: absolute;
  bottom: 5px;
  right: 10px;
  display: flex;
  gap: 6px;
  z-index: 1; /* 确保按钮在顶层 */
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

/* 深色主题下的下拉菜单项样式 - 使用深度选择器穿透scoped */
/deep/ .toolbarContainer.isDark .el-dropdown-menu {
  background-color: #2c2f33 !important;
  border-color: #4a4e52 !important;
}

/deep/ .toolbarContainer.isDark .el-dropdown-menu .el-dropdown-menu__item {
  color: #e4e7ed !important; /* 醒目的浅色文字 */
  font-weight: 500 !important; /* 稍微加粗 */
}

/deep/ .toolbarContainer.isDark .el-dropdown-menu .el-dropdown-menu__item:hover {
  background-color: #409EFF !important; /* 悬停时使用醒目的蓝色背景 */
  color: #ffffff !important; /* 悬停时使用白色文字 */
}

/deep/ .toolbarContainer.isDark .el-dropdown-menu .el-dropdown-menu__item:focus {
  background-color: #409EFF !important; /* 选中时使用醒目的蓝色背景 */
  color: #ffffff !important; /* 选中时使用白色文字 */
}

/* 深色主题下的下拉菜单项图标样式 */
/deep/ .toolbarContainer.isDark .el-dropdown-menu .el-dropdown-menu__item i {
  color: #67C23A !important; /* 图标使用醒目的绿色 */
  margin-right: 8px;
}

/deep/ .toolbarContainer.isDark .el-dropdown-menu .el-dropdown-menu__item:hover i {
  color: #ffffff !important; /* 悬停时图标变为白色 */
}

/deep/ .toolbarContainer.isDark .el-dropdown-menu .el-dropdown-menu__item:focus i {
  color: #ffffff !important; /* 选中时图标变为白色 */
}

/* 全局深色主题下拉菜单样式 - 通过data属性检测深色主题 */
/deep/ .user-dropdown-popper {
  /* 当父容器是深色主题时 */
  &[data-theme="dark"],
  body[data-theme="dark"] &,
  .isDark ~ & {
    background-color: #2c2f33 !important;
    border-color: #4a4e52 !important;
    
    .el-dropdown-menu__item {
      color: #e4e7ed !important;
      font-weight: 500 !important;
      
      &:hover {
        background-color: #409EFF !important;
        color: #ffffff !important;
        
        i {
          color: #ffffff !important;
        }
      }
      
      &:focus {
        background-color: #409EFF !important;
        color: #ffffff !important;
        
        i {
          color: #ffffff !important;
        }
      }
      
      i {
        color: #67C23A !important;
        margin-right: 8px;
      }
    }
  }
}

/* 备用方案：使用CSS变量和全局样式 */
/deep/ .el-dropdown-menu[data-popper-reference-hidden="false"] {
  /* 通过JavaScript动态添加dark类 */
  &.dropdown-dark-theme {
    background-color: #2c2f33 !important;
    border-color: #4a4e52 !important;
    
    .el-dropdown-menu__item {
      color: #e4e7ed !important;
      font-weight: 500 !important;
      
      &:hover {
        background-color: #409EFF !important;
        color: #ffffff !important;
        
        i {
          color: #ffffff !important;
        }
      }
      
      &:focus {
        background-color: #409EFF !important;
        color: #ffffff !important;
        
        i {
          color: #ffffff !important;
        }
      }
      
      i {
        color: #67C23A !important;
        margin-right: 8px;
      }
    }
  }
}
</style>
