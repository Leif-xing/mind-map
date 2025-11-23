<template>
  <div class="tagTreePanel" :class="{ isDark: isDark }">
    <!-- 面板头部 -->
    <div class="panel-header">
      <div class="header-title">
        <i class="iconfont iconbiaoqian"></i>
        <span>标签分类</span>
      </div>
      <div class="header-actions">
        <el-button type="text" :icon="isRefreshing ? 'el-icon-loading' : 'el-icon-refresh'" 
          size="mini" @click="refreshTags" :title="isRefreshing ? '正在刷新...' : '刷新'" 
          :disabled="isRefreshing" class="refresh-button"></el-button>
      </div>
    </div>

    <!-- 标签统计 -->
    <div class="tag-stats">
      <div class="stat-item">
        <span class="stat-number">{{ Object.keys(userTags).length }}</span>
        <span class="stat-label">标签</span>
      </div>
      <div class="stat-item" data-stat-type="categorized">
        <span class="stat-number">{{ taggedMindmapsCount }}</span>
        <span class="stat-label">已分类</span>
      </div>
      <div class="stat-item" data-stat-type="uncategorized">
        <span class="stat-number">{{ untaggedMindmapsCount }}</span>
        <span class="stat-label">未分类</span>
      </div>
    </div>

    <!-- 快速筛选 -->
    <div class="quick-filters">
      <div class="filter-title">快速筛选</div>
      <div class="filter-buttons">
        <el-button size="mini" :type="selectedTagIds.length === 0 ? 'primary' : 'default'" @click="selectAllTags">
          全部
        </el-button>
        <el-button size="mini" :type="showOnlyUntagged ? 'primary' : 'default'" @click="toggleUntaggedFilter">
          未分类
        </el-button>
        <el-button size="mini" @click="clearSelection" v-if="selectedTagIds.length > 0">
          清除选择
        </el-button>
      </div>
    </div>

    <!-- 标签树 -->
    <div class="tag-tree-container">
      <div class="tree-content">
        <!-- 标签列表 -->
        <template v-for="(tag, index) in sortedTags">
          <!-- 公共标签分隔符 -->
          <div v-if="tag.isPublic && (index === 0 || !sortedTags[index - 1].isPublic)" :key="`separator-${tag.id}`"
            class="tag-separator">
            <div class="separator-line"></div>
            <div class="separator-text">
              <i class="el-icon-unlock"></i>
              <span>公共标签</span>
            </div>
            <div class="separator-line"></div>
          </div>

          <!-- 标签节点 -->
          <div :key="tag.id" :data-tag-id="tag.id" class="tag-node" :class="{
            selected: selectedTagIds.includes(tag.id),
            'has-mindmaps': tag.mindmapCount > 0,
            'drag-over': dragOverTagId === tag.id,
            'public-tag': tag.isPublic
          }" @click="toggleTagSelection(tag.id)" @contextmenu.prevent="showTagContextMenu($event, tag.id, tag)"
            @dragover.prevent="handleDragOver($event, tag.id)" @dragenter.prevent="handleDragEnter($event, tag.id)"
            @dragleave="handleDragLeave($event, tag.id)" @drop.prevent="handleDrop($event, tag.id)">
            <!-- 标签颜色指示器 -->
            <div class="tag-color-indicator" :style="{ backgroundColor: tag.color || '#409EFF' }"></div>

            <!-- 标签信息 -->
            <div class="tag-info">
              <div class="tag-name">
                {{ tag.name }}
                <span v-if="tag.isPublic" class="public-indicator">
                  <i class="el-icon-unlock"></i>
                </span>
              </div>
              <div class="tag-count">{{ tag.mindmapCount }} 个导图</div>
            </div>

            <!-- 标签操作 - 只有私有标签才显示 -->
            <div v-if="!tag.isPublic" class="tag-actions" @click.stop>
              <el-dropdown trigger="click" @command="handleTagAction">
                <el-button type="text" size="mini" class="more-button">
                  <i class="el-icon-more"></i>
                </el-button>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item :command="{ action: 'edit', tagId: tag.id }">
                    <i class="el-icon-edit"></i> 编辑
                  </el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'delete', tagId: tag.id }">
                    <i class="el-icon-delete"></i> 删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </div>
          </div>
        </template>

        <!-- 未分类节点 -->
        <div class="tag-node untagged-node" :class="{ selected: showOnlyUntagged }" @click="toggleUntaggedFilter">
          <div class="tag-color-indicator untagged-color"></div>
          <div class="tag-info">
            <div class="tag-name">未分类</div>
            <div class="tag-count">{{ untaggedMindmapsCount }} 个导图</div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="Object.keys(userTags).length === 0" class="empty-state">
          <div class="empty-icon">
            <i class="iconfont iconbiaoqian"></i>
          </div>
          <div class="empty-text">暂无标签</div>
          <el-button type="primary" size="mini" @click="showCreateTagDialog">
            创建第一个标签
          </el-button>
        </div>
      </div>
    </div>

    <!-- 创建/编辑标签对话框 -->
    <el-dialog :title="tagDialogMode === 'create' ? '创建标签' : '编辑标签'" :visible.sync="tagDialogVisible" width="400px"
      :close-on-press-escape="true" :modal-append-to-body="false" v-drag-dialog custom-class="tag-dialog">
      <el-form :model="tagForm" :rules="tagFormRules" ref="tagForm" label-width="80px">
        <el-form-item label="标签名称" prop="name">
          <el-input v-model="tagForm.name" placeholder="请输入标签名称" maxlength="20" show-word-limit></el-input>
        </el-form-item>
        <el-form-item label="标签颜色" prop="color">
          <div class="color-picker-container">
            <el-color-picker v-model="tagForm.color" :predefine="predefineColors" show-alpha
              @change="handleColorChange"></el-color-picker>
          </div>
          <div class="color-value-container">
            <span class="color-value-display" :style="{
              backgroundColor: tagForm.color,
              color: getContrastColor(tagForm.color)
            }">
              {{ tagForm.color.toUpperCase() }}
            </span>
          </div>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmTagAction">确定</el-button>
      </div>
    </el-dialog>

    <!-- 删除标签确认对话框 -->
    <el-dialog title="删除标签确认" :visible.sync="deleteTagDialogVisible" width="450px" :close-on-press-escape="true"
      :modal-append-to-body="false" custom-class="delete-tag-confirm-dialog" :class="{ isDark: isDark }">
      <div class="confirm-content">
        <div class="confirm-icon">
          <i class="el-icon-warning" style="color: #F56C6C; font-size: 48px;"></i>
        </div>
        <p class="confirm-text">
          <template v-if="deleteTagMindmapCount > 0">
            确定要删除标签"<strong>{{ deleteTagName }}</strong>"吗？<br />
            <span class="warning-text">这将影响 <strong>{{ deleteTagMindmapCount }}</strong> 个思维导图。</span>
          </template>
          <template v-else>
            确定要删除标签"<strong>{{ deleteTagName }}</strong>"吗？
          </template>
        </p>
      </div>

      <div slot="footer" class="dialog-footer">
        <el-button size="small" @click="deleteTagDialogVisible = false">
          取消
        </el-button>
        <el-button size="small" type="danger" @click="confirmDeleteTag" icon="el-icon-delete">
          确定删除
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import TagCacheManager from '@/utils/tagCacheManager'

export default {
  name: 'TagTreePanel',
  props: {
    userTags: {
      type: Object,
      default: () => ({})
    },
    selectedTagIds: {
      type: Array,
      default: () => []
    },
    mindmapTagMapping: {
      type: Object,
      default: () => ({})
    },
    localMindmaps: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      showOnlyUntagged: false,

      // 拖拽相关
      dragOverTagId: null,
      isDragActive: false,

      // 标签对话框
      tagDialogVisible: false,
      tagDialogMode: 'create', // 'create' | 'edit'
      editingTagId: null,
      tagForm: {
        name: '',
        color: '#409EFF',
        description: ''
      },
      tagFormRules: {
        name: [
          { required: true, message: '请输入标签名称', trigger: 'blur' },
          { min: 1, max: 20, message: '长度在 1 到 20 个字符', trigger: 'blur' }
        ],
        color: [
          { required: true, message: '请选择标签颜色', trigger: 'change' }
        ]
      },

      // 预定义颜色
      predefineColors: [
        '#409EFF',
        '#67C23A',
        '#E6A23C',
        '#F56C6C',
        '#909399',
        '#00D084',
        '#13C2C2',
        '#722ED1',
        '#EB2F96',
        '#FA541C'
      ],

      // 删除标签确认对话框
      deleteTagDialogVisible: false,
      deleteTagName: '',
      deleteTagMindmapCount: 0,
      pendingDeleteTagId: null,
      
      // 刷新状态
      isRefreshing: false
    }
  },
  computed: {
    isDark() {
      return this.$store?.state?.localConfig?.isDark || false
    },

    // 已分类的思维导图数量
    taggedMindmapsCount() {
      return this.localMindmaps.filter(mindmap => {
        const tags = this.mindmapTagMapping[mindmap.id] || []
        return tags.length > 0
      }).length
    },

    // 未分类的思维导图数量
    untaggedMindmapsCount() {
      return this.localMindmaps.filter(mindmap => {
        const tags = this.mindmapTagMapping[mindmap.id] || []
        return tags.length === 0
      }).length
    },

    // 排序后的标签（私有标签在前，按关联导图数降序）
    sortedTags() {
      return Object.entries(this.userTags)
        .map(([tagId, tag]) => ({
          id: tagId,
          ...tag,
          mindmapCount: this.getTagMindmapCount(tagId),
          isPublic: tag.is_public === true || tag.isOwned === false
        }))
        .sort((a, b) => {
          // 先按是否为公共标签排序（私有在前）
          if (a.isPublic !== b.isPublic) {
            return a.isPublic ? 1 : -1
          }
          // 然后按关联导图数降序排序
          return b.mindmapCount - a.mindmapCount
        })
    }
  },
  watch: {
    selectedTagIds: {
      handler() {
        this.emitTagSelection()
      },
      immediate: true
    },

    showOnlyUntagged() {
      this.emitTagSelection()
    }
  },

  created() {
    // 监听数据更新事件
    this.$bus.$on('mindmap-tag-data-updated', this.handleTagDataUpdated)
    this.$bus.$on('force-refresh-tag-tree', this.forceRefreshTagTree)
    // 监听标签更新事件
    this.$bus.$on('tag-updated', this.handleTagUpdated)
  },

  beforeDestroy() {
    // 清理事件监听器
    this.$bus.$off('mindmap-tag-data-updated', this.handleTagDataUpdated)
    this.$bus.$off('force-refresh-tag-tree', this.forceRefreshTagTree)
    this.$bus.$off('tag-updated', this.handleTagUpdated)
  },

  methods: {
    // 获取标签下的思维导图数量
    getTagMindmapCount(tagId) {
      return this.localMindmaps.filter(mindmap => {
        const tags = this.mindmapTagMapping[mindmap.id] || []
        return tags.includes(tagId)
      }).length
    },

    // 切换标签选择
    toggleTagSelection(tagId) {
      this.showOnlyUntagged = false

      const selectedIds = [...this.selectedTagIds]
      const index = selectedIds.indexOf(tagId)

      if (index > -1) {
        selectedIds.splice(index, 1)
      } else {
        selectedIds.push(tagId)
      }

      this.$emit('tag-select', selectedIds)
    },

    // 拖拽进入处理
    handleDragEnter(event, tagId) {
      this.dragOverTagId = tagId
      this.isDragActive = true
    },

    // 拖拽悬停处理
    handleDragOver(event, tagId) {
      event.dataTransfer.dropEffect = 'copy'
      this.dragOverTagId = tagId
    },

    // 拖拽离开处理
    handleDragLeave(event, tagId) {
      // 使用延迟来避免子元素触发的dragLeave
      setTimeout(() => {
        // 确保event和currentTarget存在再调用contains方法
        if (event && event.currentTarget &&
          (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget))) {
          this.dragOverTagId = null
        }
      }, 50)
    },

    // 拖拽放置处理
    handleDrop(event, tagId) {
      this.dragOverTagId = null
      this.isDragActive = false

      try {
        const dragData = JSON.parse(event.dataTransfer.getData('text/plain'))

        if (dragData.type === 'mindmap') {
          this.addTagToMindmap(dragData.mindmapId, tagId, dragData.mindmapTitle)
        }
      } catch (error) {
        console.error('解析拖拽数据失败:', error)
        this.$message.error('拖拽操作失败')
      }
    },

    // 为思维导图添加标签
    addTagToMindmap(mindmapId, tagId, mindmapTitle) {
      const tagName = this.userTags[tagId]?.name || '未知标签'

      // 🔥 修复：使用统一数据源 TagCacheManager.getMindMapTagIds()
      const currentTags = TagCacheManager.getMindMapTagIds()[mindmapId] || []

      if (currentTags.includes(tagId)) {
        this.$message.info(`"${mindmapTitle}" 已经包含标签 "${tagName}"`)
        return
      }

      // 触发添加标签事件
      this.$emit('mindmap-add-tag', {
        mindmapId,
        tagId,
        mindmapTitle,
        tagName
      })

      // 注意：成功消息现在在TagMindmapPage中显示，避免重复提示
    },

    // 处理标签数据更新
    handleTagDataUpdated(data) {
      // 强制更新标签统计
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },

    // 强制刷新标签树
    forceRefreshTagTree() {
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },

    // 选择所有标签
    selectAllTags() {
      this.showOnlyUntagged = false
      this.$emit('tag-select', [])
    },

    // 切换未分类筛选
    toggleUntaggedFilter() {
      this.showOnlyUntagged = !this.showOnlyUntagged
      if (this.showOnlyUntagged) {
        this.$emit('tag-select', [])
      }
    },

    // 清除选择
    clearSelection() {
      this.showOnlyUntagged = false
      this.$emit('tag-select', [])
    },

    // 发送标签选择事件
    emitTagSelection() {
      if (this.showOnlyUntagged) {
        this.$emit('tag-select', ['__untagged__'])
      } else {
        this.$emit('tag-select', this.selectedTagIds)
      }
    },

    // 显示创建标签对话框
    showCreateTagDialog() {
      this.tagDialogMode = 'create'
      this.editingTagId = null
      this.tagForm = {
        name: '',
        color: '#409EFF', // 确保是标准的十六进制格式
        description: ''
      }
      this.tagDialogVisible = true

      this.$nextTick(() => {
        this.$refs.tagForm?.clearValidate()
      })
    },

    // 处理颜色变化
    handleColorChange(color) {
      // 确保颜色格式为十六进制格式
      if (color && color.startsWith('#')) {
        // 如果是十六进制格式，直接使用
        this.tagForm.color = color.toUpperCase()
      } else if (color && color.includes('rgba')) {
        // 如果是rgba格式，转换为十六进制（不考虑透明度）
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
          const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
          const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
          this.tagForm.color = `#${r}${g}${b}`.toUpperCase()
        }
      }
    },

    // 获取对比色
    getContrastColor(hexColor) {
      if (!hexColor) return '#333'

      // 移除 # 号
      const hex = hexColor.replace('#', '')

      // 如果是rgba格式，只取rgb部分
      const cleanHex = hex.split('(')[0].replace('rgba', '').replace('rgb', '')

      // 确保是6位的十六进制值
      let finalHex = cleanHex
      if (finalHex.length === 3) {
        finalHex = finalHex.split('').map(c => c + c).join('')
      } else if (finalHex.length < 6) {
        finalHex = finalHex.padEnd(6, '0')
      }

      // 取前6位
      finalHex = finalHex.substring(0, 6)

      // 计算亮度
      const r = parseInt(finalHex.substr(0, 2), 16)
      const g = parseInt(finalHex.substr(2, 2), 16)
      const b = parseInt(finalHex.substr(4, 2), 16)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000

      return brightness > 128 ? '#333' : '#fff'
    },

    // 显示编辑标签对话框
    showEditTagDialog(tagId, tag) {
      this.tagDialogMode = 'edit'
      this.editingTagId = tagId

      // 确保颜色是标准的十六进制格式
      let color = tag.color || '#409EFF'
      if (color && !color.startsWith('#')) {
        // 如果不是十六进制格式，尝试转换
        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        if (rgbaMatch) {
          const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
          const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
          const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
          color = `#${r}${g}${b}`.toUpperCase()
        } else {
          color = '#409EFF' // 默认颜色
        }
      } else if (color) {
        color = color.toUpperCase() // 确保大写
      }

      this.tagForm = {
        name: tag.name,
        color: color,
        description: tag.description || ''
      }
      this.tagDialogVisible = true

      this.$nextTick(() => {
        this.$refs.tagForm?.clearValidate()
      })
    },

    // 确认标签操作
    confirmTagAction() {
      this.$refs.tagForm.validate((valid) => {
        if (valid) {
          // 确保颜色是标准的十六进制格式
          let color = this.tagForm.color
          if (color && !color.startsWith('#')) {
            // 如果不是十六进制格式，尝试转换
            const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
            if (rgbaMatch) {
              const r = parseInt(rgbaMatch[1]).toString(16).padStart(2, '0')
              const g = parseInt(rgbaMatch[2]).toString(16).padStart(2, '0')
              const b = parseInt(rgbaMatch[3]).toString(16).padStart(2, '0')
              color = `#${r}${g}${b}`.toUpperCase()
            } else {
              color = '#409EFF' // 默认颜色
            }
          } else if (color) {
            color = color.toUpperCase() // 确保大写
          }

          const tagData = {
            ...this.tagForm,
            color: color
          }

          if (this.tagDialogMode === 'create') {
            this.$emit('tag-create', tagData)
          } else {
            this.$emit('tag-edit', this.editingTagId, tagData)
          }
          this.tagDialogVisible = false
        }
      })
    },

    // 处理标签操作
    handleTagAction(command) {
      const { action, tagId } = command
      const tag = this.userTags[tagId]

      switch (action) {
        case 'edit':
          this.showEditTagDialog(tagId, tag)
          break
        case 'delete':
          this.deleteTag(tagId, tag)
          break
      }
    },


    // 删除标签
    deleteTag(tagId, tag) {
      const mindmapCount = this.getTagMindmapCount(tagId);

      // 保存待删除的标签信息
      this.pendingDeleteTagId = tagId;
      this.deleteTagName = tag.name;
      this.deleteTagMindmapCount = mindmapCount;

      // 显示确认对话框
      this.deleteTagDialogVisible = true;
    },

    // 确认删除标签
    confirmDeleteTag() {
      // 关闭对话框
      this.deleteTagDialogVisible = false;

      const tagId = this.pendingDeleteTagId;

      if (!tagId) {
        return;
      }

      // 发出删除事件
      this.$emit('tag-delete', tagId);

      // 清理临时数据
      this.pendingDeleteTagId = null;
    },

    // 显示标签右键菜单
    showTagContextMenu(event, tagId, tag) {
      // 这里可以实现自定义右键菜单
      // 暂时使用下拉菜单替代
    },

    // 处理标签更新事件
    handleTagUpdated(data) {
      const { tagId, tagData } = data

      // 如果当前组件的userTags中包含该标签，强制更新组件
      if (this.userTags[tagId]) {
        this.$forceUpdate()
      }
    },

    // 刷新标签
    async refreshTags() {
      if (this.isRefreshing) return
      
      this.isRefreshing = true
      
      try {
        // 获取当前用户信息
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null')
        if (!currentUser) {
          this.$message({
            type: 'error',
            message: '请先登录',
            duration: 3000,
            showClose: true
          })
          return
        }
        
        // 1. 从数据库获取思维导图元数据
        const mindMapsData = await this.$store.dispatch('getUserMindMaps', currentUser.id)
        
        // 2. 从数据库获取用户标签数据
        const { tagApi } = await import('@/api/supabase-api')
        const userTagsData = await tagApi.getUserTagsFromDatabase(currentUser.id)
        
        // 3. 从数据库获取思维导图与标签的关联数据
        const tagRelationsData = await tagApi.getMindMapTagRelations(currentUser.id)
        
        // 4. 批量获取思维导图内容数据（异步执行，不阻塞界面）
        this.refreshMindMapContents(mindMapsData, currentUser.id)
        
        // 5. 更新vue store缓存
        this.$store.commit('setLocalMindMaps', mindMapsData)
        
        // 6. 更新localStorage缓存
        this.updateLocalStorageCache(userTagsData, tagRelationsData, mindMapsData)
        
        // 7. 强制触发界面重新渲染
        this.forceRefreshInterface()
        
        // 显示成功提示
        this.$message({
          type: 'success',
          message: `思维导图和标签数据加载完成！获取了 ${mindMapsData.length} 个思维导图，${userTagsData.length} 个标签`,
          duration: 4000,
          showClose: true
        })
        
      } catch (error) {
        console.error('刷新数据失败:', error)
        this.$message({
          type: 'error', 
          message: '刷新失败: ' + error.message,
          duration: 5000,
          showClose: true
        })
      } finally {
        this.isRefreshing = false
      }
    },
    
    // 更新localStorage缓存
    updateLocalStorageCache(userTagsData, tagRelationsData, mindMapsData) {
      // 更新标签缓存
      const TagCacheManager = require('@/utils/tagCacheManager').default
      
      // 将标签数组转换为以ID为键的对象
      const userTagsObject = {}
      userTagsData.forEach(tag => {
        userTagsObject[tag.id] = {
          name: tag.name,
          is_public: tag.is_public,
          created_at: tag.created_at,
          owner_id: tag.owner_id,
          color: tag.color || '#cccccc'
        }
      })
      
      // 将关联数据转换为以思维导图ID为键，标签ID数组为值的对象
      const mindMapTagMappings = {}
      tagRelationsData.forEach(relation => {
        if (!mindMapTagMappings[relation.mindmap_id]) {
          mindMapTagMappings[relation.mindmap_id] = []
        }
        mindMapTagMappings[relation.mindmap_id].push(relation.tag_id)
      })
      
      // 更新标签缓存
      TagCacheManager.setUserTags(userTagsObject)
      TagCacheManager.setMindMapTagIds(mindMapTagMappings)
      
      // 更新思维导图元数据到store（已经在上面做了）
    },
    
    // 异步刷新思维导图内容数据
    async refreshMindMapContents(mindMapsData, userId) {
      const { mindMapCacheManager } = require('@/utils/mindmap-cache-manager')
      
      // 批量获取思维导图内容，但不阻塞主界面
      const contentPromises = mindMapsData.map(async (mindMap) => {
        try {
          const { mindMapApi } = await import('@/api/supabase-api')
          const content = await mindMapApi.getMindMapById(mindMap.id, userId)
          if (content) {
            mindMapCacheManager.set(mindMap.id, content)
          }
        } catch (error) {
          console.warn(`获取思维导图内容失败 (ID: ${mindMap.id}):`, error.message)
        }
      })
      
      // 等待所有内容获取完成
      await Promise.allSettled(contentPromises)
      console.log('思维导图内容缓存更新完成')
    },
    
    // 强制触发界面重新渲染
    forceRefreshInterface() {
      // 触发父组件刷新
      this.$emit('refresh-tags')
      
      // 强制更新当前组件
      this.$forceUpdate()
      
      // 触发全局事件，让其他相关组件也刷新
      this.$root.$emit('global-data-refreshed')
    },

    // 🔥 强制刷新方法，供父组件调用
    forceRefresh() {
      // 只触发组件强制更新，不发送事件避免循环
      this.$forceUpdate()
    }
  }
}
</script>

<style scoped>
.tagTreePanel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color-1);
}

/* 面板头部 */
.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.header-title i {
  font-size: 18px;
  color: var(--primary-color);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.header-actions .el-button {
  color: var(--text-color-2);
}

.header-actions .el-button:hover {
  color: var(--primary-color);
}

/* 刷新按钮样式 */
.refresh-button {
  width: 60px !important;
  /* 增加一倍宽度 */
}

/* 标签统计 */
.tag-stats {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  gap: 16px;
}

.stat-item {
  text-align: center;
  flex: 1;
}

.stat-number {
  display: block;
  font-size: 20px;
  font-weight: bold;
  color: var(--primary-color);
  line-height: 1;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: var(--text-color-2);
  margin-top: 4px;
}

/* 快速筛选 */
.quick-filters {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.filter-title {
  font-size: 13px;
  color: var(--text-color-2);
  margin-bottom: 8px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 标签树容器 */
.tag-tree-container {
  flex: 1;
  overflow: hidden;
}

.tree-content {
  height: 100%;
  overflow-y: auto;
  padding: 8px 0;
}

/* 标签区域标题 */
.tag-section {
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-2);
  background: var(--bg-color-2);
  border-radius: 4px;
  margin-bottom: 8px;
}

.section-title i {
  font-size: 14px;
}

/* 标签分隔符 */
.tag-separator {
  display: flex;
  align-items: center;
  margin: 12px 20px 8px;
  gap: 8px;
}

.separator-line {
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.separator-text {
  font-size: 12px;
  color: var(--text-color-2);
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

/* 标签节点 */
.tag-node {
  padding: 12px 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.tag-node.public-tag {
  opacity: 0.85;
}

.tag-node.public-tag:hover {
  opacity: 1;
}

.tag-node:hover {
  background: var(--bg-color-2);
}

.tag-node.selected {
  background: var(--primary-color-light);
  border-left-color: var(--primary-color);
}

.tag-node.has-mindmaps {
  font-weight: 500;
}

.tag-node.drag-over {
  background: rgba(103, 194, 58, 0.1);
  border-left-color: #67C23A;
  border-style: solid;
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
}

.tag-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.untagged-color {
  background: var(--text-color-3);
}

.tag-info {
  flex: 1;
  min-width: 0;
}

.tag-name {
  font-size: 14px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.public-indicator {
  font-size: 12px;
  color: var(--text-color-2);
  opacity: 0.7;
}

.tag-count {
  font-size: 12px;
  color: var(--text-color-2);
  margin-top: 2px;
}

/* 三个点按钮样式 */
.more-button {
  width: 60px !important;
  /* 增加一倍宽度 */
}

.tag-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.tag-node:hover .tag-actions {
  opacity: 1;
}

.untagged-node {
  font-style: italic;
}

/* 空状态 */
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-color-2);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
  margin-bottom: 16px;
}

/* 颜色选择器容器 */
.color-picker-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 颜色值容器 */
.color-value-container {
  margin-top: 10px;
  display: flex;
  justify-content: flex-start;
}

.color-value-display {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  border: 1px solid var(--border-color);
  min-width: 100px;
  text-align: center;
  font-weight: 500;
  transition: all 0.2s ease;
}

.color-value-display:hover {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 对话框样式 */
.color-picker-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

/* 标签对话框样式 */
.tag-dialog {
  z-index: 10000 !important;
}

.tag-dialog .el-dialog {
  margin-top: 0 !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
}

/* 修复遮罩层导致变暗的问题 */
.tag-dialog+.v-modal {
  opacity: 0.3 !important;
  background-color: rgba(0, 0, 0, 0.3) !important;
}

/* 深色主题适配 */
.isDark .tag-stats {
  border-color: #404040 !important;
}

.isDark .quick-filters {
  border-color: #404040 !important;
}

.isDark .panel-header {
  border-color: #404040 !important;
  background: #1E1E1E !important;
  /* 使用更深的背景色 */
}

.isDark .tag-node {
  color: #E4E7ED !important;
  /* 文字颜色更亮 */
  background: #252525 !important;
  /* 添加节点背景色 */
  border-left: 3px solid transparent !important;
}

.isDark .tag-node:hover {
  background: #2D2D2D !important;
  /* 更清晰的悬停背景 */
  color: #FFFFFF !important;
}

.isDark .tag-node.selected {
  background: #2A2A2A !important;
  /* 深色选中背景 */
  color: #FFFFFF !important;
  border-left-color: #4A9EFF !important;
  /* 选中状态的高亮条 */
}

.isDark .tag-name {
  color: #E4E7ED !important;
  /* 增强标签名称对比度 */
}

.isDark .tag-count {
  color: #A3A6AD !important;
  /* 增强标签计数对比度 */
}

.isDark .empty-state {
  color: #909399 !important;
}

.isDark .empty-text {
  color: #909399 !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .panel-header {
    padding: 12px 16px;
  }

  .tag-stats {
    padding: 12px 16px;
  }

  .quick-filters {
    padding: 12px 16px;
  }

  .tag-node {
    padding: 10px 16px;
  }

  .stat-number {
    font-size: 18px;
  }
}

/* 删除标签确认对话框样式 */
.delete-tag-confirm-dialog .confirm-content {
  text-align: center;
  padding: 20px 0;
}

.delete-tag-confirm-dialog .confirm-icon {
  margin-bottom: 16px;
}

.delete-tag-confirm-dialog .confirm-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  margin: 0;
}

.delete-tag-confirm-dialog .confirm-text strong {
  color: #303133;
  font-weight: 600;
}

.delete-tag-confirm-dialog .warning-text {
  color: #E6A23C;
  font-size: 13px;
  display: inline-block;
  margin-top: 8px;
}

.delete-tag-confirm-dialog .warning-text strong {
  color: #E6A23C;
}

/* 深色主题下的对话框样式 */
.isDark .delete-tag-confirm-dialog .confirm-text {
  color: #e4e7ed;
}

.isDark .delete-tag-confirm-dialog .confirm-text strong {
  color: #ffffff;
}

.isDark .delete-tag-confirm-dialog .warning-text {
  color: #F0B429;
}

.isDark .delete-tag-confirm-dialog .warning-text strong {
  color: #F0B429;
}
</style>