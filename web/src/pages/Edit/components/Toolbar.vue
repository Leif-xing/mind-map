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
          <span class="icon iconfont iconlishi"></span>
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
        <div
          class="toolbarBtn"
          @click="logout"
          style="margin-right: 0;"
        >
          <span class="icon iconfont iconwithdraw"></span>
          <span class="text">退出登录</span>
        </div>
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
    >
      <div class="mindmap-list-container">
        <div v-if="mindMaps.length === 0" class="no-mindmaps">
          暂无思维导图
        </div>
        <div 
          v-for="mindMap in mindMaps" 
          :key="mindMap.id" 
          class="mindmap-card"
        >
          <div class="mindmap-card-content">
            <div class="mindmap-title" :title="mindMap.title">{{ mindMap.title }}</div>
            <div class="mindmap-date">{{ formatDate(mindMap.updated_at) }}</div>
            <div class="mindmap-actions">
              <el-button size="mini" type="primary" @click="loadMindMap(mindMap)">加载</el-button>
              <el-button size="mini" type="danger" @click="deleteMindMap(mindMap)">删除</el-button>
            </div>
          </div>
        </div>
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
      mindMaps: []
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      isHandleLocalFile: state => state.isHandleLocalFile,
      openNodeRichText: state => state.localConfig.openNodeRichText,
      enableAi: state => state.localConfig.enableAi
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
        console.log(error)
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
        console.log(error)
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
        console.log(error)
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
      console.log('开始自动保存思维导图...');
      try {
        // 获取当前思维导图数据
        let data = getData()
        console.log('获取到的思维导图数据:', data);
        
        // 检查用户是否已登录
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        console.log('当前用户:', currentUser);
        if (!currentUser) {
          this.$message.error('请先登录')
          this.$router.push('/login')
          return
        }
        
        // 使用当前时间作为标题（用于自动保存）
        let autoSaveTitle = `思维导图_${new Date().toISOString().replace(/[:.]/g, '-')}`
        console.log('自动保存标题:', autoSaveTitle);
        
        // 如果有根节点，使用根节点文本作为标题（去除HTML标签）
        if (data && data.root && data.root.data && data.root.data.text) {
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = data.root.data.text
          const rootNodeText = tempDiv.textContent || tempDiv.innerText || ''
          autoSaveTitle = `${rootNodeText}_自动保存_${new Date().toISOString().replace(/[:.]/g, '-')}`
          console.log('使用根节点文本的标题:', autoSaveTitle);
        }
        
        // 调用store中的保存方法
        console.log('调用store保存方法...');
        const result = await this.$store.dispatch('saveMindMap', {
          userId: currentUser.id,
          title: autoSaveTitle,
          content: data
        })
        console.log('自动保存成功:', result)
      } catch (error) {
        console.error('自动保存思维导图失败:', error)
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
        
        // 获取用户的思维导图列表
        const mindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id)
        console.log('获取到的思维导图列表:', mindMaps);
        console.log('思维导图列表详情:');
        if (mindMaps && mindMaps.length > 0) {
          mindMaps.forEach((map, index) => {
            console.log(`  ${index + 1}. ID: ${map.id}, 标题: ${map.title}, 内容预览: ${map.content ? (map.content.root ? map.content.root.data.text : '无根节点') : '无内容'}`);
          });
        }
        this.mindMaps = mindMaps
        
        // 显示对话框
        this.showMindMapDialog = true
      } catch (error) {
        console.error('加载思维导图失败:', error)
        this.$message.error('加载思维导图失败: ' + error.message)
      }
    },
    
    // 关闭思维导图对话框
    closeMindMapDialog(done) {
      this.showMindMapDialog = false
      if (done) {
        done()
      }
    },
    
    // 加载思维导图
    async loadMindMap(selectedMindMap) {
      console.log('准备加载思维导图:', selectedMindMap);
      console.log('准备加载的思维导图ID:', selectedMindMap.id);
      console.log('准备加载的思维导图标题:', selectedMindMap.title);
      console.log('准备加载的思维导图内容预览:', selectedMindMap.content ? selectedMindMap.content.root.data.text.substring(0, 50) + '...' : '无内容');
      
      // 保存一份副本以避免引用问题
      // 使用更深层的复制方法，确保所有属性都被复制
      const mindMapToLoad = JSON.parse(JSON.stringify(selectedMindMap));
      console.log('复制后的思维导图子节点检查:', {
        hasContent: !!mindMapToLoad.content,
        hasRoot: !!mindMapToLoad.content?.root,
        hasChildren: !!mindMapToLoad.content?.root?.children,
        childCount: mindMapToLoad.content?.root?.children ? mindMapToLoad.content.root.children.length : 0,
        childrenPreview: mindMapToLoad.content?.root?.children?.slice(0, 2).map(child => ({
          text: child.data?.text,
          childCount: child.children?.length || 0
        }))
      });
      console.log('复制后的思维导图:', mindMapToLoad);
      
      try {
        // 加载思维导图
        console.log('发送加载思维导图事件，数据:', { content: mindMapToLoad.content });
        console.log('即将加载的思维导图ID:', mindMapToLoad.id);
        console.log('即将加载的思维导图标题:', mindMapToLoad.title);
        
        // 确保传递正确的数据格式
        const contentToLoad = mindMapToLoad.content;
        console.log('加载的内容结构检查:', {
          hasRoot: !!contentToLoad?.root,
          rootData: contentToLoad?.root ? contentToLoad.root.data : null,
          contentKeys: contentToLoad ? Object.keys(contentToLoad) : null
        });
        
        // 创建一个Promise来确保数据加载完成
        const loadPromise = new Promise((resolve) => {
          // 监听一个自定义事件，当思维导图渲染完成时触发
          const listener = () => {
            this.$bus.$off('mindMapLoaded', listener);
            console.log('接收到思维导图加载完成事件');
            resolve();
          };
          this.$bus.$on('mindMapLoaded', listener);
          
          // 检查 contentToLoad 是否包含完整的子节点数据
          console.log('准备发送的思维导图数据检查:', {
            hasRoot: !!contentToLoad?.root,
            hasChildren: !!contentToLoad?.root?.children,
            childCount: contentToLoad?.root?.children ? contentToLoad.root.children.length : 0,
            childrenPreview: contentToLoad?.root?.children?.slice(0, 2).map(child => ({
              text: child.data?.text,
              childCount: child.children?.length || 0
            }))
          });
          
          console.log('🚀 Toolbar.vue - 正在发送 loadMindMapData 事件');
          console.log('🚀 Toolbar.vue - 事件总线实例:', this.$bus);
          console.log('🚀 Toolbar.vue - 发送的数据:', { content: contentToLoad });
          // 发送加载数据事件
          this.$bus.$emit('loadMindMapData', { content: contentToLoad });
          
          // 设置超时，确保即使没有收到完成事件也能继续
          setTimeout(() => {
            this.$bus.$off('mindMapLoaded', listener);
            console.log('思维导图加载超时，继续执行');
            resolve();
          }, 3000); // 3秒后超时
        });
        
        // 等待思维导图加载完成后再关闭对话框
        await loadPromise;
        console.log('思维导图已加载，关闭对话框');
        this.closeMindMapDialog();
        console.log('思维导图加载完成');
      } catch (err) {
        console.error('加载思维导图异常:', err);
      }
    },
    
    // 删除思维导图
    async deleteMindMap(mindMap) {
      console.log('准备删除思维导图:', mindMap);
      try {
        await this.$confirm(`确定要删除思维导图 "${mindMap.title}" 吗？`, '删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        await this.$store.dispatch('deleteMindMap', {
          mindMapId: mindMap.id,
          userId: currentUser.id
        })
        
        this.$message.success('思维导图删除成功')
        
        // 重新加载思维导图列表
        const updatedMindMaps = await this.$store.dispatch('getUserMindMaps', currentUser.id)
        this.mindMaps = updatedMindMaps
      } catch (err) {
        if (err !== 'cancel') {
          console.error('删除思维导图失败:', err)
          this.$message.error('删除思维导图失败: ' + err.message)
        }
      }
    },
    
    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN')
    },
    
    logout() {
      // 触发退出登录事件
      this.$bus.$emit('logout')
    }
  }
}

// 添加弹窗和卡片样式
const style = document.createElement('style');
style.textContent = `
  .mind-map-history-dialog {
    width: 600px !important;
    max-height: 70vh;
    overflow: hidden;
  }
  
  .mindmap-list-container {
    max-height: 50vh;
    overflow-y: auto;
    padding-right: 10px;
  }
  
  .no-mindmaps {
    text-align: center;
    color: #999;
    padding: 20px;
  }
  
  .mindmap-card {
    border: 1px solid #ebeef5;
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 10px;
    background-color: #fafafa;
    transition: all 0.3s;
  }
  
  .mindmap-card:hover {
    box-shadow: 0 0 8px rgba(0,0,0,0.1);
    border-color: #c6e2ff;
    background-color: #ecf5ff;
  }
  
  .mindmap-card-content {
    display: flex;
    flex-direction: column;
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
`;

// 遵活地添加样式

</script>

<style lang="less" scoped>
.no-mindmaps {
  text-align: center;
  color: #999;
  padding: 20px;
}

.mindmap-list-container {
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 10px;
}

.mindmap-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 10px;
  background-color: #fafafa;
  transition: all 0.3s;
  cursor: default;
  
  &:hover {
    box-shadow: 0 0 8px rgba(0,0,0,0.1);
    border-color: #c6e2ff;
    background-color: #ecf5ff;
  }
}

.mindmap-card-content {
  display: flex;
  flex-direction: column;
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
</style>
