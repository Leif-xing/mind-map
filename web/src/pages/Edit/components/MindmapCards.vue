<template>
  <div class="mindmapCards" :class="{ isDark: isDark }">
    <!-- 工具栏 -->
    <div class="cards-toolbar">
      <div class="toolbar-left">
        <div class="result-info">
          <span class="result-count">{{ filteredMindmaps.length }} 个思维导图</span>
          <!-- 选中信息 - 已屏蔽 -->
          <!-- <span v-if="selectedMindmapIds.length > 0" class="selected-info">
            (已选择 {{ selectedMindmapIds.length }} 个)
          </span> -->
        </div>
      </div>
      
      <div class="toolbar-right">
        <!-- 批量操作 - 已屏蔽 -->
        <!-- <div v-if="selectedMindmapIds.length > 0" class="batch-actions">
          <el-dropdown @command="handleBatchCommand" trigger="click">
            <el-button size="small" type="primary">
              批量操作 <i class="el-icon-arrow-down el-icon--right"></i>
            </el-button>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="addTags">
                <i class="el-icon-price-tag"></i> 添加标签
              </el-dropdown-item>
              <el-dropdown-item command="removeTags">
                <i class="el-icon-remove-outline"></i> 移除标签
              </el-dropdown-item>
              <el-dropdown-item command="delete" divided>
                <i class="el-icon-delete"></i> 删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div> -->
        
        
        <!-- 排序 -->
        <el-dropdown @command="handleSortCommand" trigger="click">
          <el-button size="small">
            排序 <i class="el-icon-arrow-down el-icon--right"></i>
          </el-button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item :command="{ field: 'updated_at', order: 'desc' }">
              <i class="el-icon-time"></i> 最近更新
            </el-dropdown-item>
            <el-dropdown-item :command="{ field: 'created_at', order: 'desc' }">
              <i class="el-icon-plus"></i> 最近创建
            </el-dropdown-item>
            <el-dropdown-item :command="{ field: 'title', order: 'asc' }">
              <i class="el-icon-sort-up"></i> 名称升序
            </el-dropdown-item>
            <el-dropdown-item :command="{ field: 'title', order: 'desc' }">
              <i class="el-icon-sort-down"></i> 名称降序
            </el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
    </div>

    <!-- 卡片容器 -->
    <div class="cards-container">
      <div 
        class="cards-content"
        v-loading="loading"
        element-loading-text="加载中..."
        element-loading-spinner="el-icon-loading"
      >
        <!-- 思维导图卡片 -->
        <div
          v-for="mindmap in sortedMindmaps"
          :key="mindmap.id"
          class="mindmap-card"
          :class="{ 
            'drag-active': dragActive && dragMindmapId === mindmap.id
          }"
          draggable="true"
          @click="handleCardClick($event, mindmap)"
          @dblclick="handleMindmapDoubleClick($event, mindmap)"
          @contextmenu.prevent="showContextMenu($event, mindmap)"
          @dragstart="handleDragStart($event, mindmap)"
          @dragend="handleDragEnd($event)"
        >
          <!-- 卡片内容 -->
          <div class="card-content">
            <!-- 标题 (显示在左上方) -->
            <div class="card-title" :title="getMindmapTitle(mindmap)">
              {{ getMindmapTitle(mindmap) }}
            </div>
            
            <!-- 标签 -->
            <div class="card-tags" v-if="getMindmapTags(mindmap.id).length > 0">
              <el-tag
                v-for="tag in getMindmapTags(mindmap.id).slice(0, 3)"
                :key="tag.id"
                size="mini"
                :style="{ 
                  backgroundColor: tag.color, 
                  borderColor: tag.color,
                  color: getContrastColor(tag.color)
                }"
              >
                {{ tag.name }}
              </el-tag>
              <el-tag 
                v-if="getMindmapTags(mindmap.id).length > 3"
                size="mini"
                type="info"
              >
                +{{ getMindmapTags(mindmap.id).length - 3 }}
              </el-tag>
            </div>

            <!-- 元信息 -->
            <div class="card-meta">
              <div class="meta-item">
                <i class="el-icon-time"></i>
                <span>{{ formatDate(mindmap.updated_at) }}</span>
              </div>
              <div class="meta-item">
                <i class="el-icon-document"></i>
                <span>创建于 {{ formatDate(mindmap.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="sortedMindmaps.length === 0 && !loading" class="empty-state">
          <div class="empty-icon">
            <i class="iconfont iconwenjian"></i>
          </div>
          <div class="empty-text">
            <div v-if="searchKeyword">没有找到匹配的思维导图</div>
            <div v-else>暂无思维导图</div>
          </div>
          <el-button 
            v-if="!searchKeyword" 
            type="primary" 
            @click="createNewMindmap"
          >
            创建第一个思维导图
          </el-button>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <el-dialog
      title="重命名思维导图"
      :visible.sync="renameDialogVisible"
      width="400px"
      :close-on-press-escape="true"
    >
      <el-input
        v-model="newTitle"
        placeholder="请输入新标题"
        maxlength="50"
        show-word-limit
        @keyup.enter.native="confirmRename"
        ref="titleInput"
      ></el-input>
      <div slot="footer" class="dialog-footer">
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确定</el-button>
      </div>
    </el-dialog>

    <!-- 标签管理对话框 -->
    <el-dialog
      title="管理标签"
      :visible.sync="tagDialogVisible"
      width="500px"
      :close-on-press-escape="true"
    >
      <div class="tag-management">
        <div class="available-tags">
          <div class="section-title">可用标签</div>
          <div class="tag-list">
            <el-tag
              v-for="(tag, tagId) in userTags"
              :key="tagId"
              :type="currentMindmapTags.includes(tagId) ? 'primary' : 'info'"
              :effect="currentMindmapTags.includes(tagId) ? 'dark' : 'plain'"
              @click="toggleMindmapTag(tagId)"
              class="clickable-tag"
            >
              {{ tag.name }}
            </el-tag>
          </div>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmTagUpdate">确定</el-button>
      </div>
    </el-dialog>

    <!-- 保存确认对话框 -->
    <el-dialog
      title="温馨提示"
      :visible.sync="saveConfirmVisible"
      width="500px"
      :modal-append-to-body="false"
      :close-on-click-modal="false"
      :before-close="handleSaveConfirmClose"
      custom-class="draggable-save-confirm-dialog saveConfirmDialog"
      :class="{ isDark: isDark }"
      v-draggable="saveConfirmVisible ? saveConfirmDraggableOptions : null"
      @opened="handleSaveConfirmOpened"
    >
      <div class="confirm-content">
        <p class="confirm-text">
          检测到当前思维导图"<strong>{{ currentMindMapTitle }}</strong>"已发生变化，是否需要保存？
        </p>
      </div>
      
      <div slot="footer" class="dialog-footer">
        <el-button 
          size="small" 
          @click="handleCancelSwitch"
          icon="el-icon-close"
        >
          取消
        </el-button>
        <el-button 
          size="small" 
          type="warning" 
          @click="handleOverwriteSwitch"
          icon="el-icon-warning"
        >
          不保存
        </el-button>
        <el-button 
          size="small" 
          type="primary" 
          @click="handleSaveAndSwitch"
          icon="el-icon-check"
        >
          保存并切换
        </el-button>
      </div>
    </el-dialog>

    <!-- 右键菜单 -->
    <div
      v-show="contextMenuVisible"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click.stop
      @mouseleave="handleMenuMouseLeave"
    >
      <div class="context-menu-item" @click="handleDeleteMindmap">
        <i class="el-icon-delete"></i>
        <span>删除思维导图</span>
      </div>
      <div 
        class="context-menu-item submenu-parent" 
        @mouseenter="handleRemoveTagsHover"
        @mouseleave="handleRemoveTagsLeave"
      >
        <i class="el-icon-price-tag"></i>
        <span>移除标签</span>
        <i class="el-icon-arrow-right submenu-arrow"></i>
        
        <!-- 移除标签子菜单 -->
        <div
          v-show="subMenuVisible"
          class="context-submenu"
          :style="{ left: subMenuX + 'px', top: subMenuY + 'px' }"
          @click.stop
          @mouseenter="keepSubMenuOpen"
        >
          <!-- 标签列表 -->
          <div 
            v-if="contextMenuMindmapTags.length > 0"
            class="submenu-content"
          >
            <div
              v-for="tag in contextMenuMindmapTags"
              :key="tag.id"
              class="context-menu-item tag-item"
              @click="handleRemoveSpecificTag(tag)"
            >
              <div 
                class="tag-color-indicator"
                :style="{ backgroundColor: tag.color }"
              ></div>
              <span class="tag-name">{{ tag.name }}</span>
            </div>
          </div>
          
          <!-- 无标签提示 -->
          <div 
            v-else
            class="context-menu-item disabled"
          >
            <i class="el-icon-info"></i>
            <span>暂无标签</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右键菜单遮罩层 -->
    <div
      v-show="contextMenuVisible"
      class="context-menu-overlay"
      @click="hideContextMenu"
    ></div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { getCurrentMindMapIdFromVueInstance } from '@/utils/vue-instance-helpers'
import draggableDirective from 'vue-draggable-directive'

export default {
  name: 'MindmapCards',
  directives: {
    draggable: draggableDirective
  },
  props: {
    mindmaps: {
      type: Array,
      default: () => []
    },
    userTags: {
      type: Object,
      default: () => ({})
    },
    mindmapTagMapping: {
      type: Object,
      default: () => ({})
    },
    selectedMindmapIds: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    searchKeyword: {
      type: String,
      default: ''
    }
  },
  watch: {
    mindmaps: {
      handler(newMindmaps) {
        if (newMindmaps?.length > 0) {
        }
      },
      immediate: true
    }
  },
  data() {
    return {
      sortField: 'updated_at',
      sortOrder: 'desc',
      
      // 拖拽相关
      dragActive: false,
      dragMindmapId: null,
      
      // 重命名对话框
      renameDialogVisible: false,
      renamingMindmap: null,
      newTitle: '',
      
      // 标签管理对话框
      tagDialogVisible: false,
      managingMindmap: null,
      currentMindmapTags: [],
      
      // 保存确认对话框相关
      saveConfirmVisible: false,
      targetMindMapForSwitch: null,  // 目标切换的思维导图
      currentMindMapTitle: '',       // 当前思维导图标题
      
      // mindMap实例
      localMindMap: null,
      
      // 拖拽配置选项 - 使用函数返回新对象强制重新初始化
      draggableOptionsKey: 0,
      
      // 右键菜单相关
      contextMenuVisible: false,
      contextMenuX: 0,
      contextMenuY: 0,
      contextMenuMindmap: null,
      
      // 子菜单相关
      subMenuVisible: false,
      subMenuX: 0,
      subMenuY: 0,
      contextMenuMindmapTags: [],
      subMenuHoverTimer: null,
      subMenuLeaveTimer: null
    }
  },
  computed: {
    isDark() {
      return this.$store?.state?.localConfig?.isDark || false
    },
    
    // 保存确认对话框拖拽配置选项
    saveConfirmDraggableOptions() {
      return {
        handle: '.el-dialog__header',
        boundary: 'viewport',
        resetOnEscape: true,
        preventDefault: false,
        stopPropagation: false,
        key: this.draggableOptionsKey // 强制重新渲染
      }
    },
    
    // 使用本地mindMap（优先）或传入的mindMap
    currentMindMap() {
      return this.localMindMap || this.mindMap;
    },
    
    filteredMindmaps() {
      return this.mindmaps || []
    },
    
    // 排序后的思维导图
    sortedMindmaps() {
      const filtered = this.filteredMindmaps
      
      if (!filtered || filtered.length === 0) {
        return []
      }
      
      const sorted = [...filtered]
      
      return sorted.sort((a, b) => {
        let aValue = a[this.sortField]
        let bValue = b[this.sortField]
        
        if (this.sortField.includes('_at')) {
          aValue = new Date(aValue)
          bValue = new Date(bValue)
        }
        
        if (this.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    }
  },
  
  created() {
    // 监听数据更新事件
    this.$bus.$on('mindmap-tag-data-updated', this.handleTagDataUpdated)
    this.$bus.$on('force-refresh-mindmap-cards', this.forceRefreshCards)
    // 监听标签更新事件
    this.$bus.$on('tag-updated', this.handleTagUpdated)
    // 监听标签移除事件
    this.$bus.$on('mindmap-tag-removed', this.handleTagRemoved)
    // 监听思维导图初始化事件
    this.$bus.$on('mind_map_inited', this.handleMindMapInited);
  },
  
  beforeDestroy() {
    // 清理事件监听器
    this.$bus.$off('mindmap-tag-data-updated', this.handleTagDataUpdated)
    this.$bus.$off('force-refresh-mindmap-cards', this.forceRefreshCards)
    this.$bus.$off('tag-updated', this.handleTagUpdated)
    this.$bus.$off('mindmap-tag-removed', this.handleTagRemoved)
    // 取消订阅思维导图初始化事件
    this.$bus.$off('mind_map_inited', this.handleMindMapInited);
    // 清理右键菜单的全局事件监听
    document.removeEventListener('click', this.hideContextMenu);
    // 清理子菜单定时器
    this.clearSubMenuTimers();
  },
  
  methods: {
    
    // 处理排序命令
    handleSortCommand(command) {
      this.sortField = command.field
      this.sortOrder = command.order
    },
    
    // 处理卡片点击 - 已屏蔽选择功能
    handleCardClick(event, mindmap) {
      // 屏蔽选择功能，卡片点击不再进行选择操作
      // 可以在这里添加其他点击逻辑，比如显示详细信息等
    },
    
    // 处理卡片双击 - 加载思维导图（带变化检测）
    async handleMindmapDoubleClick(event, mindmap) {
      event.preventDefault(); // 阻止可能的默认行为
      event.stopPropagation(); // 阻止事件冒泡
      
      // 首先检查当前思维导图是否需要保存
      try {
        const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
        
        if (!this.currentMindMap) {
          throw new Error('思维导图实例未找到，无法进行切换操作');
        }
        
        const currentData = this.currentMindMap.getData(true);
        
        const needsSave = await this.$store.dispatch('needsSave', {
          currentMindMap: {
            id: currentMindMapId,
            data: currentData
          }
        });
        
        if (needsSave) {
          // 需要保存，显示保存确认对话框
          this.showSaveConfirmDialogForSwitch(mindmap);
        } else {
          // 不需要保存，直接开始切换
          this.loadMindmap(mindmap);
        }
      } catch (error) {
        console.error('❌ MindmapCards - 检查思维导图是否需要保存时出错:', error);
        // 出错时按需要保存处理
        this.showSaveConfirmDialogForSwitch(mindmap);
      }
    },
    
    // 选择单个思维导图（已屏蔽）
    selectSingleMindmap(mindmapId) {
      // 批量操作功能已屏蔽
      // const index = this.selectedMindmapIds.indexOf(mindmapId)
      // 
      // if (index > -1) {
      //   // 如果已经选中，取消选中
      //   this.$emit('mindmap-select', [])
      // } else {
      //   // 如果未选中，只选中当前卡片
      //   this.$emit('mindmap-select', [mindmapId])
      // }
    },
    
    // 切换思维导图选择（已屏蔽）
    toggleMindmapSelection(mindmapId) {
      // 批量操作功能已屏蔽
      // const selected = [...this.selectedMindmapIds]
      // const index = selected.indexOf(mindmapId)
      // 
      // if (index > -1) {
      //   selected.splice(index, 1)
      // } else {
      //   selected.push(mindmapId)
      // }
      // 
      // this.$emit('mindmap-select', selected)
    },
    
    // 处理批量命令（已屏蔽）
    handleBatchCommand(command) {
      // 批量操作功能已屏蔽
      // if (this.selectedMindmapIds.length === 0) {
      //   this.$message.warning('请先选择思维导图')
      //   return
      // }
      // 
      // this.$emit('batch-operation', command, this.selectedMindmapIds)
    },
    
    // 加载思维导图
    loadMindmap(mindmap) {
      this.$emit('mindmap-load', mindmap.id)
    },
    
    // 显示右键菜单
    showContextMenu(event, mindmap) {
      event.preventDefault();
      event.stopPropagation();
      
      // 设置菜单位置和数据
      this.contextMenuX = event.clientX;
      this.contextMenuY = event.clientY;
      this.contextMenuMindmap = mindmap;
      this.contextMenuVisible = true;
      
      // 监听全局点击事件，用于关闭菜单
      document.addEventListener('click', this.hideContextMenu);
    },
    
    // 隐藏右键菜单
    hideContextMenu() {
      this.contextMenuVisible = false;
      this.subMenuVisible = false;
      this.contextMenuMindmap = null;
      this.contextMenuMindmapTags = [];
      
      // 清理定时器
      this.clearSubMenuTimers();
      
      // 移除全局点击监听
      document.removeEventListener('click', this.hideContextMenu);
    },
    
    // 清理子菜单定时器
    clearSubMenuTimers() {
      if (this.subMenuHoverTimer) {
        clearTimeout(this.subMenuHoverTimer);
        this.subMenuHoverTimer = null;
      }
      if (this.subMenuLeaveTimer) {
        clearTimeout(this.subMenuLeaveTimer);
        this.subMenuLeaveTimer = null;
      }
    },
    
    // 处理移除标签项的悬停
    handleRemoveTagsHover(event) {
      // 清理之前的定时器
      this.clearSubMenuTimers();
      
      // 获取当前思维导图的标签列表
      if (this.contextMenuMindmap) {
        const tags = this.getMindmapTags(this.contextMenuMindmap.id);
        this.contextMenuMindmapTags = tags;
      } else {
        this.contextMenuMindmapTags = [];
      }
      
      // 保存当前元素引用，因为setTimeout中event会失效
      const currentElement = event.currentTarget;
      
      // 延迟显示子菜单，避免意外触发
      this.subMenuHoverTimer = setTimeout(() => {
        this.showSubMenu(currentElement);
      }, 200);
    },
    
    // 处理移除标签项的离开
    handleRemoveTagsLeave(event) {
      // 清理悬停定时器
      if (this.subMenuHoverTimer) {
        clearTimeout(this.subMenuHoverTimer);
        this.subMenuHoverTimer = null;
      }
      
      // 延迟隐藏子菜单，给用户移动到子菜单的时间
      this.subMenuLeaveTimer = setTimeout(() => {
        this.subMenuVisible = false;
      }, 300);
    },
    
    // 显示子菜单
    showSubMenu(element) {
      if (!element) {
        return;
      }
      
      const parentRect = element.getBoundingClientRect();
      const menuWidth = 180; // 子菜单预计宽度
      
      // 计算子菜单位置
      let subMenuX = parentRect.right + 5; // 默认显示在右侧
      let subMenuY = parentRect.top;
      
      // 检查右侧是否有足够空间，如果没有则显示在左侧
      if (subMenuX + menuWidth > window.innerWidth) {
        subMenuX = parentRect.left - menuWidth - 5;
      }
      
      // 检查底部是否有足够空间
      const maxSubMenuHeight = this.contextMenuMindmapTags.length * 36 + 8;
      if (subMenuY + maxSubMenuHeight > window.innerHeight) {
        subMenuY = Math.max(0, window.innerHeight - maxSubMenuHeight - 10);
      }
      
      this.subMenuX = subMenuX;
      this.subMenuY = subMenuY;
      this.subMenuVisible = true;
    },
    
    // 保持子菜单打开（鼠标进入子菜单时）
    keepSubMenuOpen() {
      // 清理离开定时器
      if (this.subMenuLeaveTimer) {
        clearTimeout(this.subMenuLeaveTimer);
        this.subMenuLeaveTimer = null;
      }
    },
    
    // 处理整个菜单的鼠标离开
    handleMenuMouseLeave() {
      // 延迟隐藏整个菜单
      setTimeout(() => {
        if (!this.subMenuVisible) {
          this.hideContextMenu();
        }
      }, 100);
    },
    
    // 处理移除特定标签
    async handleRemoveSpecificTag(tag) {
      if (!this.contextMenuMindmap || !tag) {
        return;
      }
      
      const mindmap = this.contextMenuMindmap;
      this.hideContextMenu(); // 关闭菜单
      
      try {
        await this.$confirm(`确定要从思维导图 "${this.getMindmapTitle(mindmap)}" 中移除标签 "${tag.name}" 吗？`, '移除标签确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        
        // 获取当前用户信息
        const currentUser = this.$store.state.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
          this.$message.error('请先登录');
          return;
        }
        
        // 调用API移除标签关联
        await this.removeTagFromMindMap(mindmap.id, tag.id, currentUser.id);
        
        // 显示成功提示
        this.$message.success(`标签 "${tag.name}" 移除成功`);
        
        // 触发数据同步更新事件
        this.triggerTagUpdateEvents(mindmap.id, tag.id, tag.name);
        
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('移除标签失败: ' + error.message);
        }
      }
    },
    
    // 处理删除思维导图
    async handleDeleteMindmap() {
      if (!this.contextMenuMindmap) {
        return;
      }
      
      const mindmap = this.contextMenuMindmap;
      this.hideContextMenu(); // 先关闭右键菜单
      
      try {
        await this.$confirm(`确定要删除思维导图 "${this.getMindmapTitle(mindmap)}" 吗？`, '删除确认', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        });
        
        // 获取当前用户信息
        const currentUser = this.$store.state.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
        if (!currentUser) {
          this.$message.error('请先登录');
          return;
        }
        
        // 执行删除操作
        await this.$store.dispatch('deleteMindMap', {
          mindMapId: mindmap.id,
          userId: currentUser.id
        });
        
        this.$message.success('思维导图删除成功');
        
        // 清理被删除思维导图的本地缓存
        this.removeMindMapCache(mindmap.id);
        
        // 清理该思维导图的标签关联缓存
        this.cleanupMindMapTagCache(mindmap.id);
        
        // 通知父组件刷新数据
        this.$emit('mindmap-deleted', mindmap.id);
        
      } catch (error) {
        if (error !== 'cancel') {
          this.$message.error('删除思维导图失败: ' + error.message);
        }
      }
    },
    
    // 调用API移除标签关联
    async removeTagFromMindMap(mindMapId, tagId, userId) {
      try {
        // 导入tagApi（如果尚未导入）
        const { tagApi } = await import('@/api/supabase-api.js');
        
        // 调用API移除标签关联
        const result = await tagApi.removeTagFromMindMapOptimized(userId, mindMapId, tagId);
        
        return result;
      } catch (error) {
        console.error('移除标签关联失败:', error);
        throw error;
      }
    },
    
    // 触发数据同步更新事件
    triggerTagUpdateEvents(mindMapId, tagId, tagName) {
      try {
        // 1. 更新本地缓存 - 清理标签关联缓存
        this.cleanupSpecificTagCache(mindMapId, tagId);
        
        // 2. 触发全局事件通知所有相关组件更新
        this.$bus.$emit('mindmap-tag-removed', {
          mindmapId: mindMapId,
          tagId: tagId,
          tagName: tagName
        });
        
        // 3. 触发标签数据更新事件（用于刷新标签统计）
        this.$bus.$emit('mindmap-tag-data-updated', {
          mindmapId: mindMapId
        });
        
        // 4. 强制刷新当前组件
        this.$nextTick(() => {
          this.$forceUpdate();
        });
        
        // 5. 通知父组件数据变更（如果需要）
        this.$emit('tag-removed', {
          mindmapId: mindMapId,
          tagId: tagId,
          tagName: tagName
        });
        
      } catch (error) {
        console.error('触发数据同步更新事件失败:', error);
        // 非关键错误，不影响主要功能
      }
    },
    
    // 清理特定标签的关联缓存
    cleanupSpecificTagCache(mindMapId, tagId) {
      try {
        // 导入TagCacheManager进行缓存管理
        const TagCacheManager = require('@/utils/tagCacheManager.js').default;
        
        // 使用TagCacheManager移除特定标签关联
        TagCacheManager.removeTagFromMindMap(mindMapId, tagId);
        
      } catch (error) {
        console.warn('清理特定标签关联缓存失败:', error);
        
        // 备用的简单缓存清理逻辑
        try {
          const tagCacheKey = 'mindmap_tag_mapping';
          const tagCache = JSON.parse(localStorage.getItem(tagCacheKey) || '{}');
          if (tagCache[mindMapId]) {
            const tagIds = tagCache[mindMapId];
            const index = tagIds.indexOf(tagId);
            if (index > -1) {
              tagIds.splice(index, 1);
              tagCache[mindMapId] = tagIds;
              localStorage.setItem(tagCacheKey, JSON.stringify(tagCache));
            }
          }
        } catch (fallbackError) {
          console.warn('备用缓存清理也失败了:', fallbackError);
        }
      }
    },
    
    // 拖拽开始
    handleDragStart(event, mindmap) {
      this.dragActive = true
      this.dragMindmapId = mindmap.id
      
      // 设置拖拽数据
      event.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'mindmap',
        mindmapId: mindmap.id,
        mindmapTitle: this.getMindmapTitle(mindmap)
      }))
      
      // 设置拖拽效果
      event.dataTransfer.effectAllowed = 'copy'
      
      // 通知父组件拖拽开始
      this.$emit('drag-start', mindmap.id)
      
      // 向全局事件总线发送拖拽开始事件
      this.$bus.$emit('mindmap-drag-start', {
        mindmapId: mindmap.id,
        mindmapTitle: this.getMindmapTitle(mindmap)
      })
    },
    
    // 拖拽结束
    handleDragEnd(event) {
      this.dragActive = false
      this.dragMindmapId = null
      
      // 通知父组件拖拽结束
      this.$emit('drag-end')
      
      // 向全局事件总线发送拖拽结束事件
      this.$bus.$emit('mindmap-drag-end')
    },
    
    // 处理标签更新事件
    handleTagUpdated(data) {
      const { tagId } = data
      
      // 检查是否有思维导图使用了这个标签
      const hasMatchingMindmap = this.sortedMindmaps.some(mindmap => {
        const tagIds = this.mindmapTagMapping[mindmap.id] || []
        return tagIds.includes(tagId)
      })
      
      // 如果有思维导图使用了该标签，强制更新组件
      if (hasMatchingMindmap) {
        this.$forceUpdate()
      }
    },
    
    // 处理标签数据更新
    handleTagDataUpdated(data) {
      const { mindmapId } = data
      
      // 强制更新显示该思维导图的标签
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },
    
    // 强制刷新卡片
    forceRefreshCards() {
      this.$nextTick(() => {
        this.$forceUpdate()
      })
    },
    
    // 处理标签移除事件
    handleTagRemoved(data) {
      const { mindmapId, tagId, tagName } = data;
      
      // 立即进行乐观更新（无需等待）
      this.optimisticUpdateTagRemoval(mindmapId, tagId);
      
      // 异步通知父组件进行轻量级更新
      this.$nextTick(() => {
        this.$emit('tag-data-changed', {
          type: 'remove',
          mindmapId: mindmapId,
          tagId: tagId
        });
        
        // 触发轻量级的标签统计更新
        this.$bus.$emit('tag-statistics-update-needed', {
          type: 'remove',
          mindmapId: mindmapId,
          tagId: tagId
        });
      });
    },
    
    // 乐观更新：立即移除标签的UI显示
    optimisticUpdateTagRemoval(mindmapId, tagId) {
      // 1. 立即更新本地显示数据（不等待数据库）
      if (this.mindmapTagMapping[mindmapId]) {
        const tagIds = this.mindmapTagMapping[mindmapId];
        const index = tagIds.indexOf(tagId);
        if (index > -1) {
          // 创建新的数组引用，触发Vue响应式更新
          const newTagIds = [...tagIds];
          newTagIds.splice(index, 1);
          
          // 直接更新props数据的引用（触发重新渲染）
          this.$set(this.mindmapTagMapping, mindmapId, newTagIds);
        }
      }
      
      // 2. 立即强制更新当前组件显示
      this.$forceUpdate();
    },
    

    
    // 创建新思维导图
    createNewMindmap() {
      this.$emit('create-new-mindmap')
    },
    
    // 获取思维导图标题
    getMindmapTitle(mindmap) {
      // 确保标题字段存在且有值
      if (mindmap && mindmap.title) {
        const title = this.cleanTitle(String(mindmap.title))
        return title || '未命名思维导图'
      }
      
      // 备用字段
      if (mindmap && mindmap.name) {
        const name = this.cleanTitle(String(mindmap.name))
        return name || '未命名思维导图'
      }
      
      return '未命名思维导图'
    },
    
    // 清理标题，移除HTML标签和多余字符
    cleanTitle(title) {
      if (!title || typeof title !== 'string') {
        return '未命名思维导图'
      }
      
      let cleaned = title.trim()
      // 移除HTML标签
      cleaned = cleaned.replace(/<[^>]+>/g, '')
      // 移除多余的空白字符
      cleaned = cleaned.replace(/\s+/g, ' ').trim()
      
      return cleaned.length > 0 ? cleaned : '未命名思维导图'
    },
    
    // 获取思维导图标签
    getMindmapTags(mindmapId) {
      const tagIds = this.mindmapTagMapping[mindmapId] || []
      return tagIds.map(tagId => ({
        id: tagId,
        ...this.userTags[tagId]
      })).filter(tag => tag.name)
    },
    
    // 格式化日期
    formatDate(dateString) {
      const date = new Date(dateString)
      const now = new Date()
      const diff = now - date
      
      if (diff < 60000) {
        return '刚刚'
      } else if (diff < 3600000) {
        return Math.floor(diff / 60000) + '分钟前'
      } else if (diff < 86400000) {
        return Math.floor(diff / 3600000) + '小时前'
      } else if (diff < 604800000) {
        return Math.floor(diff / 86400000) + '天前'
      } else {
        return date.toLocaleDateString()
      }
    },
    
    // 获取对比色
    getContrastColor(hexColor) {
      if (!hexColor) return '#333'
      
      // 移除 # 号
      const hex = hexColor.replace('#', '')
      
      // 计算亮度
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      
      return brightness > 128 ? '#333' : '#fff'
    },
    
    // 确认重命名
    confirmRename() {
      if (!this.newTitle.trim()) {
        this.$message.error('标题不能为空')
        return
      }
      
      if (this.renamingMindmap) {
        this.$emit('mindmap-rename', this.renamingMindmap.id, this.newTitle)
        this.renameDialogVisible = false
        this.newTitle = ''
      }
    },
    
    // 确认标签更新
    confirmTagUpdate() {
      if (this.managingMindmap) {
        this.$emit('mindmap-tag-update', this.managingMindmap.id, this.currentMindmapTags)
        this.tagDialogVisible = false
      }
    },
    
    // 切换思维导图标签
    toggleMindmapTag(tagId) {
      const index = this.currentMindmapTags.indexOf(tagId)
      if (index > -1) {
        this.currentMindmapTags.splice(index, 1)
      } else {
        this.currentMindmapTags.push(tagId)
      }
    },

    // 处理思维导图初始化事件
    handleMindMapInited(mindMap) {
      this.localMindMap = mindMap;
    },

    // 处理保存确认对话框打开完成事件
    handleSaveConfirmOpened() {
      // 保存确认对话框完全打开后，重置拖拽插件状态
      this.draggableOptionsKey++;
    },

    // 显示保存确认对话框（用于切换）
    showSaveConfirmDialogForSwitch(targetMindMap) {
      // 保存目标思维导图信息
      this.targetMindMapForSwitch = targetMindMap;
      
      // 获取当前思维导图的标题
      this.getCurrentMindMapTitle();
      
      // 显示确认对话框
      this.saveConfirmVisible = true;
    },

    // 获取当前思维导图标题
    getCurrentMindMapTitle() {
      try {
        if (this.currentMindMap && this.currentMindMap.renderer && this.currentMindMap.renderer.root) {
          const rootData = this.currentMindMap.renderer.root.getData();
          if (rootData && rootData.text) {
            // 移除HTML标签，获取纯文本
            this.currentMindMapTitle = rootData.text.replace(/<[^>]*>/g, '').trim();
          } else {
            this.currentMindMapTitle = '未命名思维导图';
          }
        } else {
          this.currentMindMapTitle = '未命名思维导图';
        }
      } catch (error) {
        console.error('❌ MindmapCards - 获取当前标题失败:', error);
        this.currentMindMapTitle = '未命名思维导图';
      }
    },

    // 处理保存并切换
    async handleSaveAndSwitch() {
      // 1. 关闭确认对话框
      this.saveConfirmVisible = false;
      
      // 2. 在开始任何操作前，先复制当前思维导图的数据和ID
      const currentMindMapId = this.$store.state.currentMindMapId || getCurrentMindMapIdFromVueInstance();
      const currentUser = this.$store.state.currentUser;
      const originalData = JSON.parse(JSON.stringify(this.currentMindMap.getData(true))); // 深拷贝原始数据
      const originalTitle = this.currentMindMapTitle;
      const targetMindMap = this.targetMindMapForSwitch;
      
      // 3. 开始切换（与保存同时进行）
      const switchingPromise = this.loadMindmap(targetMindMap);
      
      // 4. 在后台异步保存原始数据（与切换同时进行）
      if (currentUser && originalData) {
        // 显示保存状态
        
        this.saveMindMapData(originalData, originalTitle, currentMindMapId, currentUser.id)
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
      }
      
      // 等待切换完成
      await switchingPromise;
    },

    // 处理不保存直接切换
    async handleOverwriteSwitch() {
      // 1. 关闭确认对话框
      this.saveConfirmVisible = false;
      
      // 2. 直接开始切换
      const targetMindMap = this.targetMindMapForSwitch;
      this.loadMindmap(targetMindMap);
    },

    // 处理取消切换
    handleCancelSwitch() {
      // 关闭确认对话框
      this.saveConfirmVisible = false;
      this.targetMindMapForSwitch = null;
      this.$message.info('已取消切换思维导图');
    },

    // 处理保存确认对话框关闭
    handleSaveConfirmClose() {
      // 用户直接关闭对话框，相当于取消操作
      this.saveConfirmVisible = false;
      this.targetMindMapForSwitch = null;
      this.$message.info('已取消切换思维导图');
    },

    // 保存思维导图数据的辅助方法
    async saveMindMapData(content, title, mindMapId, userId) {
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

    // 移除思维导图缓存的辅助方法
    removeMindMapCache(mindMapId) {
      try {
        // 导入缓存管理器（如果需要的话）
        // 这里使用简单的localStorage清理逻辑
        const cacheKey = 'mindmap_cache';
        const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
        if (cache[mindMapId]) {
          delete cache[mindMapId];
          localStorage.setItem(cacheKey, JSON.stringify(cache));
        }
      } catch (error) {
        console.warn('清理思维导图缓存失败:', error);
      }
    },

    // 清理思维导图的标签关联缓存
    cleanupMindMapTagCache(mindMapId) {
      try {
        // 简单的标签关联缓存清理逻辑
        // 实际项目中可能需要调用TagCacheManager等专用工具
        const tagCacheKey = 'mindmap_tag_mapping';
        const tagCache = JSON.parse(localStorage.getItem(tagCacheKey) || '{}');
        if (tagCache[mindMapId]) {
          delete tagCache[mindMapId];
          localStorage.setItem(tagCacheKey, JSON.stringify(tagCache));
        }
      } catch (error) {
        console.warn('清理标签关联缓存失败:', error);
        // 非关键错误，不影响主要功能
      }
    }
  }
}
</script>

<style scoped>
.mindmapCards {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

/* 工具栏 */
.cards-toolbar {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-color-1);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.result-count {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.selected-info {
  font-size: 12px;
  color: var(--primary-color);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}



/* 卡片容器 */
.cards-container {
  flex: 1;
  overflow: hidden;
}

.cards-content {
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  align-content: start;
  background: var(--bg-color);
}


/* 思维导图卡片 */
.mindmap-card {
  background: #FFFFFF;
  border: 2px solid #E4E7ED;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  height: auto;
  min-height: 120px;
}

.mindmap-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
  border-color: #409EFF;
}

.mindmap-card.selected {
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.mindmap-card.drag-active {
  opacity: 0.6;
  border-style: dashed;
  border-color: #409EFF;
  background: rgba(64, 158, 255, 0.1);
  transform: scale(0.95);
}

/* 卡片内容 */
.card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-title {
  font-size: 16px !important;
  font-weight: 600 !important;
  color: #303133 !important;
  margin-bottom: 8px !important;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4 !important;
  z-index: 100 !important;
  position: relative !important;
  display: block !important;
  min-height: 22px !important;
  text-align: left !important;
  opacity: 1 !important;
  visibility: visible !important;
  background: transparent !important;
  width: 100% !important;
}

.card-tags {
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

.meta-item i {
  font-size: 12px;
}

/* 卡片操作 */
.card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mindmap-card:hover .card-actions {
  opacity: 1;
}

.card-actions .el-button {
  background: rgba(255, 255, 255, 0.9);
  border: none;
  color: var(--text-color-2);
}

.card-actions .el-button:hover {
  color: var(--primary-color);
  background: white;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: var(--text-color-2);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  margin-bottom: 20px;
}

/* 标签管理对话框 */
.tag-management {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 12px;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.clickable-tag {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable-tag:hover {
  transform: scale(1.05);
}

/* 深色主题适配 */
.isDark .cards-toolbar {
  background: #1E1E1E;
  border-color: #4C4D4F;
}

.isDark .cards-content {
  background: #121212;
}

.isDark .mindmap-card {
  background: #1E1E1E !important; /* 使用 !important 确保深色背景生效 */
  border: 2px solid #3A3A3A !important;
  color: #E4E7ED !important;
}

.isDark .mindmap-card:hover {
  background: #2A2A2A !important;
  border-color: #4A9EFF !important;
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.2) !important;
}

.isDark .mindmap-card.selected {
  border-color: #4A9EFF !important;
  background: #252525 !important;
}

.isDark .card-title {
  color: #53a240 !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.isDark .result-count {
  color: #C0C4CC !important;
  font-weight: 500;
}

.isDark .selected-info {
  color: #A0CFFF !important;
}

.isDark .meta-item {
  color: #909399 !important;
}

/* 空状态的深色主题适配 */
.isDark .empty-state {
  color: #909399 !important;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .cards-content {
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .cards-toolbar {
    padding: 12px 16px;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .toolbar-left,
  .toolbar-right {
    justify-content: space-between;
  }
  
  .cards-content {
    grid-template-columns: repeat(2, 1fr);
    padding: 16px;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .mindmap-card {
    border-radius: 8px;
  }
  
  .card-content {
    padding: 12px;
  }
  
  .card-title {
    font-size: 14px !important;
    opacity: 1 !important;
    visibility: visible !important;
  }
  
  .card-actions {
    position: static;
    opacity: 1;
    margin-top: 8px;
    text-align: center;
  }
}

/* 保存确认对话框样式 */
.saveConfirmDialog .el-dialog__header {
  cursor: move;
  user-select: none;
  
  &:hover {
    background-color: #f5f7fa;
  }
}

.confirm-content {
  padding: 20px 0;
}

.confirm-text {
  font-size: 16px;
  line-height: 1.6;
  color: #303133;
  margin: 0;
  text-align: center;
}

/* 深色主题下的保存确认对话框样式 */
.isDark .saveConfirmDialog .el-dialog__header {
  &:hover {
    background-color: #1a1a1a;
  }
}

.isDark .confirm-text {
  color: #E4E7ED;
}

/* 拖拽对话框的z-index调整 */
/deep/ .draggable-save-confirm-dialog {
  z-index: 10000 !important;
  
  .el-dialog {
    z-index: 10000 !important;
  }
  
  .el-dialog__wrapper {
    z-index: 10000 !important;
  }
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 10001;
  min-width: 150px;
  padding: 4px 0;
  user-select: none;
}

.context-menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  color: #606266;
  position: relative;
}

.context-menu-item:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.context-menu-item.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background-color: transparent;
  color: #c0c4cc;
}

.context-menu-item i {
  margin-right: 8px;
  width: 16px;
  text-align: center;
}

/* 子菜单父项样式 */
.submenu-parent {
  position: relative;
}

.submenu-arrow {
  margin-left: auto !important;
  margin-right: 0 !important;
  width: 12px !important;
  font-size: 12px;
}

/* 子菜单样式 */
.context-submenu {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 10002;
  min-width: 160px;
  padding: 4px 0;
  user-select: none;
}

.submenu-content {
  max-height: 300px;
  overflow-y: auto;
}

/* 标签项样式 */
.tag-item {
  padding: 8px 12px;
}

.tag-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 8px;
  flex-shrink: 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.tag-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  background: transparent;
}

/* 深色主题下的右键菜单样式 */
.isDark .context-menu {
  background: #1e1e1e;
  border-color: #3a3a3a;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.isDark .context-menu-item {
  color: #e4e7ed;
}

.isDark .context-menu-item:hover {
  background-color: #2a2a2a;
  color: #409eff;
}

.isDark .context-menu-item.disabled {
  color: #606266;
}

.isDark .context-menu-item.disabled:hover {
  background-color: transparent;
  color: #606266;
}

/* 深色主题下的子菜单样式 */
.isDark .context-submenu {
  background: #1e1e1e;
  border-color: #3a3a3a;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.isDark .tag-color-indicator {
  border-color: rgba(255, 255, 255, 0.1);
}
</style>