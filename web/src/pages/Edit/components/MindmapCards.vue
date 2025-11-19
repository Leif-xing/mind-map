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
          :data-mindmap-id="mindmap.id"
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
                v-for="(tag, index) in getMindmapTags(mindmap.id)"
                :key="tag.id"
                size="mini"
                :data-tag-id="tag.id"
                :style="{ 
                  backgroundColor: tag.color, 
                  borderColor: tag.color,
                  color: getContrastColor(tag.color),
                  display: getTagDisplayStyle(mindmap.id, tag.id, index)
                }"
              >
                {{ tag.name }}
              </el-tag>
              <el-tag 
                v-if="getMindmapTags(mindmap.id).length > 3"
                size="mini"
                type="info"
                class="more-tags"
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
import TagCacheManager from '@/utils/tagCacheManager.js'

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
      subMenuLeaveTimer: null,
      // 方案二：维护组件级别的标签显示状态覆盖
      tagDisplayOverrides: {
        // mindmapId: { tagId: { visible: boolean, reason: string } }
      }
    }
  },
  computed: {
    isDark() {
      return this.$store?.state?.localConfig?.isDark || false
    },
    
    // 方案二：获取标签的显示样式（优先检查自定义状态，回退到默认逻辑）
    getTagDisplayStyle() {
      return (mindmapId, tagId, index) => {
        const override = this.tagDisplayOverrides[mindmapId]?.[tagId];
        if (override && override.hasOwnProperty('visible')) {
          return override.visible ? '' : 'none';
        }
        // 回退到原始逻辑
        return index >= 3 ? 'none' : '';
      };
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
      
      // 获取当前思维导图的标签列表 - 优先从DOM获取实际存在的标签
      if (this.contextMenuMindmap) {
        // 找到对应的思维导图卡片DOM
        const cardElement = document.querySelector(`[data-mindmap-id="${this.contextMenuMindmap.id}"]`);
        
        if (cardElement) {
          // 延迟获取DOM标签，确保在任何可能的删除操作完成后
          setTimeout(() => {
            // 从DOM获取实际存在的标签（包括隐藏的）
            const tagElements = cardElement.querySelectorAll('.card-tags .el-tag:not(.more-tags)');
            const domTags = Array.from(tagElements).map(el => {
              const tagId = el.getAttribute('data-tag-id');
              const tagName = el.textContent.trim();
              const tagColor = el.style.backgroundColor || '#409EFF';
              return { id: tagId, name: tagName, color: tagColor };
            });
            
            this.contextMenuMindmapTags = domTags;
          }, 50);
        } else {
          // 回退方案：从缓存获取
          const tags = TagCacheManager.getMindMapTags(this.contextMenuMindmap.id);
          this.contextMenuMindmapTags = tags;
        }
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
        
        // 方案二：清理该标签的显示状态覆盖（因为标签已被删除）
        this.clearTagDisplayOverride(mindmap.id, tag.id);
        
        // 1. 先更新缓存
        this.cleanupSpecificTagCache(mindmap.id, tag.id);
        
        // 2. 直接DOM操作：更新思维导图卡片上的标签显示
        const cardElement = this.findMindmapCardElement(mindmap.id);
        if (cardElement) {
          const tagsContainer = cardElement.querySelector('.card-tags');
          if (tagsContainer) {
            // 直接移除标签DOM元素，不调用updateMoreTagsCount
            const tagElement = tagsContainer.querySelector(`[data-tag-id="${tag.id}"]`);
            if (tagElement) {
              tagElement.remove();
              // 调用标签显示调整逻辑
              this.adjustTagDisplayAfterRemoval(tagsContainer, mindmap.id);
            }
          }
        }
        
        // 3. 直接DOM操作：更新左侧栏标签计数
        this.updateSidebarTagCountDOM(tag.id, tag.name);
        
        // 4. 触发数据同步更新事件（但不再触发DOM操作）
        this.triggerTagUpdateEventsWithoutDom(mindmap.id, tag.id, tag.name);
        
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
    
    // 触发数据同步更新事件（不触发DOM操作，避免重复）
    triggerTagUpdateEventsWithoutDom(mindMapId, tagId, tagName) {
      try {
        // 1. 触发全局事件通知所有相关组件更新（但不触发DOM操作）
        this.$bus.$emit('mindmap-tag-removed', {
          mindmapId: mindMapId,
          tagId: tagId,
          tagName: tagName,
          skipDomUpdate: true  // 标记跳过DOM更新
        });
        
        // 2. 通知父组件数据变更（如果需要）
        this.$emit('tag-removed', {
          mindmapId: mindMapId,
          tagId: tagId,
          tagName: tagName
        });
        
      } catch (error) {
        console.error('触发数据同步更新事件失败:', error);
      }
    },
    
    // 触发数据同步更新事件（包含DOM操作，保留用于其他场景）
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
        
        // 4. 通知父组件数据变更（如果需要）
        this.$emit('tag-removed', {
          mindmapId: mindMapId,
          tagId: tagId,
          tagName: tagName
        });
        
      } catch (error) {
        console.error('触发数据同步更新事件失败:', error);
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
      
      // 标签信息更新（如名称、颜色）时，Vue的响应式系统会自动更新显示
      // 移除 $forceUpdate() 以避免不必要的时间重新计算
      if (hasMatchingMindmap) {
        // 标签数据的变化会自动触发相关组件的重新渲染
      }
    },
    
    // 处理标签数据更新
    handleTagDataUpdated(data) {
      const { mindmapId, tagId, action } = data
      
      // 方案一：直接DOM操作更新标签显示，不触发Vue响应式系统
      this.updateMindmapTagsDirectly(mindmapId, tagId, action)
    },
    
    // 直接DOM操作更新思维导图标签显示
    updateMindmapTagsDirectly(mindmapId, tagId, action) {
      // 1. 找到对应的思维导图卡片DOM元素
      const cardElement = this.findMindmapCardElement(mindmapId)
      if (!cardElement) {
        console.warn('⚠️ 未找到思维导图卡片DOM元素:', mindmapId)
        return
      }
      
      // 2. 根据操作类型进行相应的DOM更新
      if (action === 'add') {
        this.addTagToCardDOM(cardElement, tagId)
      } else if (action === 'remove') {
        this.removeTagFromCardDOM(cardElement, tagId)
      }
    },
    
    // 查找指定思维导图的卡片DOM元素
    findMindmapCardElement(mindmapId) {
      // 直接通过 data-mindmap-id 属性找到对应的卡片元素
      const cardElement = document.querySelector(`.mindmap-card[data-mindmap-id="${mindmapId}"]`)
      
      if (cardElement) {
        return cardElement
      } else {
        console.warn('⚠️ 未找到对应的卡片DOM元素:', mindmapId)
        return null
      }
    },
    
    // 从卡片DOM元素获取对应的思维导图数据
    getMindmapFromCardElement(cardElement) {
      // 直接从data-mindmap-id属性获取ID，然后查找对应的数据
      const mindmapId = cardElement.getAttribute('data-mindmap-id')
      if (mindmapId) {
        return this.sortedMindmaps.find(mindmap => mindmap.id === mindmapId)
      }
      return null
    },
    
    // 添加标签到卡片DOM
    addTagToCardDOM(cardElement, tagId) {
      // 获取标签信息
      const tag = this.userTags[tagId]
      if (!tag) {
        console.warn('⚠️ 标签信息未找到:', tagId)
        return
      }
      
      // 找到或创建标签容器
      let tagsContainer = cardElement.querySelector('.card-tags')
      if (!tagsContainer) {
        // 创建标签容器
        tagsContainer = document.createElement('div')
        tagsContainer.className = 'card-tags'
        
        // 找到卡片内容容器，将标签容器插入到标题后面
        const cardContent = cardElement.querySelector('.card-content')
        const cardTitle = cardContent.querySelector('.card-title')
        const cardMeta = cardContent.querySelector('.card-meta')
        
        if (cardMeta) {
          // 插入到标题和元信息之间
          cardContent.insertBefore(tagsContainer, cardMeta)
        } else {
          // 如果没有元信息，直接追加
          cardContent.appendChild(tagsContainer)
        }
      }
      
      // 检查是否已存在该标签
      const existingTag = tagsContainer.querySelector(`[data-tag-id="${tagId}"]`)
      if (existingTag) {
        return
      }
      
      // 创建新的标签元素
      const tagElement = this.createTagElement(tag, tagId)
      
      // 检查是否需要显示更多标签的提示
      const visibleTags = tagsContainer.querySelectorAll('.el-tag:not(.more-tags)')
      if (visibleTags.length >= 3) {
        // 处理超过3个标签的情况
        this.handleMoreTagsDisplay(tagsContainer, tagElement)
      } else {
        tagsContainer.appendChild(tagElement)
      }
    },
    
    // 创建标签DOM元素
    createTagElement(tag, tagId = null) {
      const tagEl = document.createElement('span')
      tagEl.className = 'el-tag el-tag--mini'
      // 确保正确设置data-tag-id属性，修复undefined问题
      const actualTagId = tag.id || tagId
      if (actualTagId) {
        tagEl.setAttribute('data-tag-id', actualTagId)
      } else {
        console.warn('⚠️ 标签ID未定义:', { tag, tagId })
      }
      tagEl.style.backgroundColor = tag.color
      tagEl.style.borderColor = tag.color
      tagEl.style.color = this.getContrastColor(tag.color)
      tagEl.textContent = tag.name
      return tagEl
    },
    
    // 处理超过3个标签的显示
    handleMoreTagsDisplay(tagsContainer, newTagElement) {
      // 检查是否已有"更多"标签提示
      let moreTagEl = tagsContainer.querySelector('.more-tags')
      let currentMoreCount = 0;
      
      if (moreTagEl) {
        // 从现有的"+N"标签中获取当前计数
        const currentText = moreTagEl.textContent.trim();
        const match = currentText.match(/\+(\d+)/);
        currentMoreCount = match ? parseInt(match[1]) : 0;
        
        // 移除现有的"+N"标签，稍后重新创建
        moreTagEl.remove();
      }
      
      // 隐藏新添加的标签（因为超过了显示限制）
      newTagElement.style.display = 'none';
      tagsContainer.appendChild(newTagElement);
      
      // 计算新的隐藏标签数量：原有隐藏数量 + 1
      const newMoreCount = currentMoreCount + 1;
      
      // 创建新的"更多"标签提示
      const newMoreTagEl = document.createElement('span');
      newMoreTagEl.className = 'el-tag el-tag--mini el-tag--info el-tag--light more-tags';
      newMoreTagEl.textContent = `+${newMoreCount}`;
      
      // 确保"+N"标签添加到容器的最后
      tagsContainer.appendChild(newMoreTagEl);
    },
    
    // 从卡片DOM移除标签
    removeTagFromCardDOM(cardElement, tagId) {
      const tagsContainer = cardElement.querySelector('.card-tags')
      if (!tagsContainer) {
        return
      }
      
      // 获取思维导图ID
      const mindMapId = cardElement.getAttribute('data-mindmap-id') || 
                       cardElement.closest('[data-mindmap-id]')?.getAttribute('data-mindmap-id')
      
      const tagElement = tagsContainer.querySelector(`[data-tag-id="${tagId}"]`)
      if (tagElement) {
        tagElement.remove()
        
        // 更新"更多"标签计数，传入思维导图ID
        this.updateMoreTagsCount(tagsContainer, mindMapId)
      }
    },
    
    // 更新"更多"标签的计数（改为从缓存获取真实标签数量）
    updateMoreTagsCount(tagsContainer, mindMapId) {
      const moreTagEl = tagsContainer.querySelector('.more-tags')
      if (moreTagEl && mindMapId) {
        // 从缓存获取实际标签总数
        const actualTagsCount = TagCacheManager.getMindMapTags(mindMapId).length
        const moreCount = Math.max(0, actualTagsCount - 3)
        
        if (moreCount > 0) {
          moreTagEl.textContent = `+${moreCount}`
        } else {
          moreTagEl.remove()
          // 显示一个之前隐藏的标签
          const firstHidden = tagsContainer.querySelector('.el-tag[style*="display: none"]')
          if (firstHidden) {
            firstHidden.style.display = ''
          }
        }
      }
    },
    
    // 强制刷新卡片
    forceRefreshCards() {
      // 移除强制刷新，改为依赖Vue的响应式数据更新
      // 只有在确实需要强制更新的特殊情况下才调用此方法
      // 一般情况下Vue的响应式系统会自动处理数据更新
    },
    
    // 处理标签移除事件
    handleTagRemoved(data) {
      const { mindmapId, tagId, tagName, skipDomUpdate } = data;
      
      // 只有当没有skipDomUpdate标记时才进行DOM更新
      if (!skipDomUpdate) {
        // 立即进行乐观更新（无需等待）
        this.optimisticUpdateTagRemoval(mindmapId, tagId);
      }
      
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
    
    // 乐观更新：立即移除标签的UI显示（使用DOM直接操作）
    optimisticUpdateTagRemoval(mindmapId, tagId) {
      // 直接DOM操作移除标签显示，不触发Vue响应式系统
      this.updateMindmapTagsDirectly(mindmapId, tagId, 'remove')
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
    
    // 优化的标签显示调整方法 - 方案二实现
    adjustTagDisplayAfterRemoval(tagsContainer, mindMapId) {
      try {
        if (!mindMapId) {
          // 获取思维导图ID（从容器找到对应的思维导图卡片）
          const mindMapCard = tagsContainer.closest('.mindmap-card');
          mindMapId = mindMapCard ? mindMapCard.getAttribute('data-mindmap-id') : null;
        }
        
        if (!mindMapId) {
          console.warn('⚠️ 未找到思维导图ID，无法调整显示');
          return;
        }
      
      // 获取可见标签元素（排除"+N"标签且display不为none）
      const visibleTags = tagsContainer.querySelectorAll('.el-tag:not(.more-tags):not([style*="display: none"])');
      const visibleTagsCount = visibleTags.length; // a
      
      // 获取隐藏标签元素（display为none的标签）
      const hiddenTags = tagsContainer.querySelectorAll('.el-tag:not(.more-tags)[style*="display: none"]');
      const hiddenTagsCount = hiddenTags.length; // b
      
      // 获取DOM中所有标签元素的data-tag-id总数量
      const allTagElements = tagsContainer.querySelectorAll('.el-tag:not(.more-tags)[data-tag-id]');
      const domTagsCount = allTagElements.length; // c
      
      // 从缓存中获取标签数据
      let cacheTagsCount = 0; // d
      try {
        cacheTagsCount = TagCacheManager.getMindMapTags(mindMapId).length;
      } catch (error) {
        console.warn('⚠️ 从缓存获取标签数量失败:', error);
        cacheTagsCount = domTagsCount; // 使用DOM计算作为备用
      }
      
      // 数据一致性校验
      if (domTagsCount !== cacheTagsCount) {
        console.warn('⚠️ DOM元素数量与缓存数量不一致', {
          DOM数量: domTagsCount,
          缓存数量: cacheTagsCount
        });
      }
      
      // 简化的处理逻辑
      if (visibleTagsCount === 3) {
        // 删除的是隐藏标签，只需要更新+N标签的数量
      } else if (visibleTagsCount === 2) {
        // 删除的是可见标签，需要将隐藏标签中的第一个设为可见
        if (hiddenTagsCount > 0) {
          const firstHiddenTag = hiddenTags[0];
          if (firstHiddenTag) {
            // 修复data-tag-id为undefined的问题
            const tagId = firstHiddenTag.getAttribute('data-tag-id');
            
            // 方案二：同时更新DOM和Vue数据状态
            // 1. DOM操作
            firstHiddenTag.style.display = '';
            
            // 2. 同步更新Vue数据状态
            this.setTagDisplayOverride(mindMapId, tagId, true, '标签移除后补充显示');
          }
        }
      }
      
        // 统一处理+N标签的显示
        this.updateMoreTagsDisplayOptimized(tagsContainer, cacheTagsCount);
      } catch (error) {
        console.error('❌ 标签显示调整失败:', error);
      }
    },
    
    // 方案二：设置标签显示状态覆盖
    setTagDisplayOverride(mindmapId, tagId, visible, reason) {
      if (!this.tagDisplayOverrides[mindmapId]) {
        this.$set(this.tagDisplayOverrides, mindmapId, {});
      }
      this.$set(this.tagDisplayOverrides[mindmapId], tagId, {
        visible: visible,
        reason: reason,
        timestamp: Date.now()
      });
    },
    
    // 方案二：清理标签显示状态覆盖
    clearTagDisplayOverride(mindmapId, tagId) {
      if (this.tagDisplayOverrides[mindmapId] && this.tagDisplayOverrides[mindmapId][tagId]) {
        this.$delete(this.tagDisplayOverrides[mindmapId], tagId);
        
        // 如果该思维导图没有其他覆盖状态，清理整个对象
        if (Object.keys(this.tagDisplayOverrides[mindmapId]).length === 0) {
          this.$delete(this.tagDisplayOverrides, mindmapId);
        }
      }
    },
    
    // 方案二：清理特定思维导图的所有标签显示状态覆盖
    clearMindmapTagDisplayOverrides(mindmapId) {
      if (this.tagDisplayOverrides[mindmapId]) {
        this.$delete(this.tagDisplayOverrides, mindmapId);
      }
    },
    
    // 优化的"+N"标签显示更新
    updateMoreTagsDisplayOptimized(tagsContainer, totalTagsCount) {
      if (!tagsContainer || typeof totalTagsCount !== 'number') {
        console.warn('⚠️ 无效的参数:', { tagsContainer, totalTagsCount });
        return;
      }
      
      const moreTagEl = tagsContainer.querySelector('.more-tags');
      const moreCount = Math.max(0, totalTagsCount - 3);
      
      if (moreCount > 0) {
        // 需要显示"+N"标签
        if (moreTagEl) {
          // 更新现有的"+N"标签
          moreTagEl.textContent = `+${moreCount}`;
        } else {
          // 创建新的"+N"标签
          const newMoreTagEl = document.createElement('span');
          newMoreTagEl.className = 'el-tag el-tag--mini el-tag--info el-tag--light more-tags';
          newMoreTagEl.textContent = `+${moreCount}`;
          tagsContainer.appendChild(newMoreTagEl);
        }
      } else {
        // 不需要"+N"标签，移除它
        if (moreTagEl) {
          moreTagEl.remove();
        }
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
    },
    
    // 直接DOM操作：更新思维导图卡片上的标签显示
    updateCardTagsDOM(mindmapId, tagId, tagName) {
      try {
        // 1. 尝试多种方式找到思维导图卡片DOM元素
        let cardElement = document.querySelector(`[data-mindmap-id="${mindmapId}"]`);
        
        if (!cardElement) {
          // 备用方案：通过其他属性查找
          cardElement = document.querySelector(`.mindmap-card[data-id="${mindmapId}"]`);
        }
        
        if (!cardElement) {
          console.warn('⚠️ 尝试查找所有卡片元素进行调试');
          const allCards = document.querySelectorAll('.mindmap-card, [class*="mindmap"], [class*="card"]');
          return;
        }
        
        // 2. 尝试多种方式找到标签容器
        let tagsContainer = cardElement.querySelector('.card-tags');
        if (!tagsContainer) {
          tagsContainer = cardElement.querySelector('.tags, .tag-list, [class*="tag"]');
        }
        
        if (!tagsContainer) {
          console.warn('⚠️ 未找到标签容器，查看卡片内部结构');
          return;
        }
        
        // 从handleRemoveSpecificTag传递过来的tag对象中获取标签名称
        let tagElement = null;
        
        // 首先尝试通过ID查找
        tagElement = tagsContainer.querySelector(`[data-tag-id="${tagId}"]`);
        if (!tagElement) {
          tagElement = tagsContainer.querySelector(`[data-id="${tagId}"]`);
        }
        if (!tagElement) {
          tagElement = tagsContainer.querySelector(`[data-tag="${tagId}"]`);
        }
        
        // 如果通过ID找不到，通过标签名称查找（备用方案）
        if (!tagElement && tagName) {
          const allTagElements = tagsContainer.querySelectorAll('.el-tag, .tag, [class*="tag"]');
          
          // 通过文本内容匹配标签名称
          for (const element of allTagElements) {
            const elementText = element.textContent.trim();
            if (elementText === tagName) {
              tagElement = element;
              break;
            }
          }
          
          if (!tagElement) {
            console.warn('⚠️ 通过标签名称也未找到元素:', tagName);
          }
        } else if (!tagElement) {
          console.warn('⚠️ 没有提供标签名称，无法进行名称匹配');
        }
        
        if (tagElement) {
          tagElement.remove();
          
          // 4. 处理超过3个标签的情况：检查是否需要调整显示
          this.adjustTagDisplayAfterRemoval(tagsContainer, mindmap.id);
        } else {
          console.warn('⚠️ 未找到要删除的标签元素:', tagId);
        }
        
      } catch (error) {
        console.error('❌ 更新卡片标签DOM失败:', error);
      }
    },
    
    // 重新调整标签显示的辅助方法
    adjustTagsDisplay(tagsContainer) {
      try {
        // 获取思维导图ID和缓存中的标签总数（更可靠的数据源）
        const mindMapId = tagsContainer.closest('[data-mindmap-id]')?.getAttribute('data-mindmap-id');
        const actualTagsCount = mindMapId ? TagCacheManager.getMindMapTags(mindMapId).length : 0;
        
        // 获取DOM中的标签元素（用于显示操作）
        const allTags = Array.from(tagsContainer.querySelectorAll('.el-tag:not(.more-tags)'));
        let moreTagEl = tagsContainer.querySelector('.more-tags');
        
        // 先移除现有的"更多"标签
        if (moreTagEl) {
          moreTagEl.remove();
        }
        
        // 使用缓存中的标签总数来判断逻辑
        if (actualTagsCount <= 3) {
          // 如果缓存中标签总数<=3，显示所有DOM标签，不需要+N
          allTags.forEach(tag => {
            tag.style.display = '';
          });
        } else {
          // 如果缓存中标签总数>3，需要显示3个标签，其余隐藏，并创建+N标签
          
          // 检查当前可见标签数量
          const currentVisibleTags = allTags.filter(tag => tag.style.display !== 'none');
          const currentHiddenTags = allTags.filter(tag => tag.style.display === 'none');
          
          // 如果可见标签不足3个，从隐藏标签中补充
          if (currentVisibleTags.length < 3 && currentHiddenTags.length > 0) {
            const needToShow = Math.min(3 - currentVisibleTags.length, currentHiddenTags.length);
            for (let i = 0; i < needToShow; i++) {
              currentHiddenTags[i].style.display = '';
            }
          }
          
          // 如果可见标签超过3个，隐藏多余的
          const nowVisibleTags = allTags.filter(tag => tag.style.display !== 'none');
          if (nowVisibleTags.length > 3) {
            for (let i = 3; i < nowVisibleTags.length; i++) {
              nowVisibleTags[i].style.display = 'none';
            }
          }
          
          // 基于缓存数据创建+N标签（这里使用移除后的缓存数据）
          const moreCount = Math.max(0, actualTagsCount - 3);
          if (moreCount > 0) {
            const newMoreTagEl = document.createElement('span');
            newMoreTagEl.className = 'el-tag el-tag--mini el-tag--info more-tags';
            newMoreTagEl.textContent = `+${moreCount}`;
            tagsContainer.appendChild(newMoreTagEl);
          }
        }
        
      } catch (error) {
        console.error('❌ 调整标签显示失败:', error);
      }
    },
    
    // 直接DOM操作：更新左侧栏标签计数
    updateSidebarTagCountDOM(tagId, tagName) {
      try {
        // 使用精确的标签ID查找（现在有了data-tag-id属性）
        const tagNode = document.querySelector(`[data-tag-id="${tagId}"]`);
        
        if (tagNode) {
          // 在标签节点中查找计数元素
          const countElement = tagNode.querySelector('.tag-count');
          
          if (countElement) {
            // 获取当前计数值并减1
            const currentCountText = countElement.textContent.trim();
            const countMatch = currentCountText.match(/(\d+)/);
            const currentCount = countMatch ? parseInt(countMatch[1]) : 0;
            const newCount = Math.max(0, currentCount - 1);
            
            // 更新计数显示
            if (newCount > 0) {
              countElement.textContent = `${newCount} 个导图`;
            } else {
              countElement.textContent = '0 个导图';
            }
          } else {
            console.warn('⚠️ 在标签节点中未找到.tag-count元素');
          }
          
        } else {
          console.warn('⚠️ 未找到标签节点，data-tag-id可能未正确设置:', tagId);
          
          // 调试：查看是否有其他带data-tag-id的元素
          const allTagElements = document.querySelectorAll('[data-tag-id]');
        }
        
      } catch (error) {
        console.error('❌ 更新左侧栏标签计数失败:', error);
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

/* 标签隐藏样式 - 使用CSS类控制，允许DOM内联样式覆盖 */
.card-tags .el-tag.hidden-tag {
  display: none !important;
}
</style>
