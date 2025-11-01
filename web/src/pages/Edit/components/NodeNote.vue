<template>
  <el-dialog
    class="nodeNoteDialog"
    :title="$t('nodeNote.title')"
    :visible.sync="dialogVisible"
    :width="isMobile ? '90%' : '50%'"
    :top="isMobile ? '20px' : '15vh'"
    :modal="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    @keyup.native.esc="cancel"
  >
    <!-- <el-input
      type="textarea"
      :autosize="{ minRows: 3, maxRows: 5 }"
      placeholder="请输入内容"
      v-model="note"
    >
    </el-input> -->
    <div class="noteEditor" ref="noteEditor" @keyup.stop @keydown.stop></div>
    <!-- <div class="tip">换行请使用：Enter+Shift</div> -->
    <span slot="footer" class="dialog-footer">
      <el-button @click="cancel">{{ $t('dialog.cancel') }}</el-button>
      <el-button type="primary" @click="confirm">{{
        $t('dialog.confirm')
      }}</el-button>
    </span>
  </el-dialog>
</template>

<script>
import Editor from '@toast-ui/editor'
import '@toast-ui/editor/dist/toastui-editor.css' // Editor's Style
import { isMobile } from 'simple-mind-map/src/utils/index'

// 节点备注内容设置
export default {
  name: 'NodeNote',
  data() {
    return {
      dialogVisible: false,
      note: '',
      activeNodes: [],
      editor: null,
      isMobile: isMobile(),
      appointNode: null
    }
  },
  watch: {
    dialogVisible(val, oldVal) {
      if (!val && oldVal) {
        this.$bus.$emit('endTextEdit')
        // 对话框关闭时移除监听器
        this.removeDialogKeydownListener()
      } else if (val && !oldVal) {
        // 对话框打开时设置监听器
        this.$nextTick(() => {
          this.setupESCListener()
        })
      }
    }
  },
  created() {
    this.$bus.$on('node_active', this.handleNodeActive)
    this.$bus.$on('showNodeNote', this.handleShowNodeNote)
    // 监听快捷键事件
    this.$bus.$on('open_note_dialog', this.openNoteDialogWithShortcut)
  },
  mounted() {
    // 添加全局键盘事件监听
    document.addEventListener('keydown', this.handleGlobalKeydown)
    // 初始化拖拽功能
    this.initDrag()
    // 等待DOM渲染完后设置焦点并监听对话框的键盘事件
    this.$nextTick(() => {
      this.setupESCListener()
    })
  },
  beforeDestroy() {
    this.$bus.$off('node_active', this.handleNodeActive)
    this.$bus.$off('showNodeNote', this.handleShowNodeNote)
    this.$bus.$off('open_note_dialog', this.openNoteDialogWithShortcut)
    // 移除全局键盘事件监听
    document.removeEventListener('keydown', this.handleGlobalKeydown)
    // 移除对话框键盘事件监听
    this.removeDialogKeydownListener()
  },
  methods: {
    handleGlobalKeydown(event) {
      // 监听 Shift+C 快捷键
      if (event.shiftKey && event.key.toLowerCase() === 'c' && this.activeNodes.length > 0) {
        event.preventDefault() // 阻止默认行为
        this.openNoteDialogWithShortcut()
      }
    },

    openNoteDialogWithShortcut() {
      if (this.activeNodes.length > 0) {
        this.handleShowNodeNote(this.activeNodes[0])
      }
    },

    handleNodeActive(...args) {
      this.activeNodes = [...args[1]]
      this.updateNoteInfo()
    },

    updateNoteInfo() {
      if (this.activeNodes.length > 0) {
        let firstNode = this.activeNodes[0]
        this.note = firstNode.getData('note') || ''
      } else {
        this.note = ''
      }
    },

    handleShowNodeNote(node) {
      this.$bus.$emit('startTextEdit')
      if (node) {
        this.appointNode = node
        this.note = node.getData('note') || ''
      }
      this.dialogVisible = true
      this.$nextTick(() => {
        this.initEditor()
      })
    },

    initEditor() {
      const theme = this.isDarkMode() ? 'dark' : 'light';
      if (!this.editor) {
        this.editor = new Editor({
          el: this.$refs.noteEditor,
          height: '500px',
          initialEditType: 'markdown',
          previewStyle: 'vertical',
          // 设置编辑器主题
          theme: theme
        })
      } else {
        // 如果编辑器已存在，更新主题
        this.updateEditorTheme()
      }
      this.editor.setMarkdown(this.note)
    },

    isDarkMode() {
      return document.body.classList.contains('dark') || 
             (this.$store && this.$store.state.localConfig.isDark)
    },

    updateEditorTheme() {
      // 重新初始化编辑器以应用主题
      if (this.editor) {
        const currentValue = this.editor.getMarkdown()
        this.$refs.noteEditor.innerHTML = '' // 清空容器
        this.editor = new Editor({
          el: this.$refs.noteEditor,
          height: '500px',
          initialEditType: 'markdown',
          previewStyle: 'vertical',
          theme: this.isDarkMode() ? 'dark' : 'light'
        })
        this.editor.setMarkdown(currentValue)
      }
    },

    initDrag() {
      this.$nextTick(() => {
        const dialogHeaderEl = document.querySelector('.nodeNoteDialog .el-dialog__header');
        const dragDom = document.querySelector('.nodeNoteDialog .el-dialog');
        
        if (!dialogHeaderEl || !dragDom) {
          return;
        }

        dialogHeaderEl.style.cursor = 'move';

        let startX = 0;
        let startY = 0;
        let lastX = 0;
        let lastY = 0;

        const handleMouseDown = (e) => {
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

          const handleMouseMove = (e) => {
            const offsetX = e.clientX - startX;
            const offsetY = e.clientY - startY;
            dragDom.style.transform = `translate(${lastX + offsetX}px, ${lastY + offsetY}px)`;
            dragDom.style.willChange = 'transform'; // 优化性能
          };

          const handleMouseUp = () => {
            dragDom.style.willChange = 'auto';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);

          e.preventDefault();
        };

        dialogHeaderEl.addEventListener('mousedown', handleMouseDown);
      });
    },

    setupESCListener() {
      // 等待对话框完全渲染
      this.$nextTick(() => {
        // 获取el-dialog的DOM元素
        const dialogWrapper = document.querySelector('.nodeNoteDialog .el-dialog__wrapper');
        const dialog = document.querySelector('.nodeNoteDialog .el-dialog');
        
        if (dialogWrapper) {
          // 监听对话框包装器的keydown事件
          dialogWrapper.addEventListener('keydown', this.handleDialogKeydown);
        } else if (dialog) {
          // 如果找不到包装器，直接监听对话框元素
          dialog.addEventListener('keydown', this.handleDialogKeydown);
        }
      });
    },
    
    handleDialogKeydown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation();  // 阻止事件冒泡
        event.preventDefault();    // 阻止默认行为
        this.cancel();            // 调用取消方法
      }
    },
    
    removeDialogKeydownListener() {
      const dialogWrapper = document.querySelector('.nodeNoteDialog .el-dialog__wrapper');
      const dialog = document.querySelector('.nodeNoteDialog .el-dialog');
      
      if (dialogWrapper) {
        dialogWrapper.removeEventListener('keydown', this.handleDialogKeydown);
      } else if (dialog) {
        dialog.removeEventListener('keydown', this.handleDialogKeydown);
      }
    },

    cancel() {
      this.dialogVisible = false
      if (this.appointNode) {
        this.appointNode = null
        this.updateNoteInfo()
      }
    },

    confirm() {
      this.note = this.editor.getMarkdown()
      if (this.appointNode) {
        this.appointNode.setNote(this.note)
      } else {
        this.activeNodes.forEach(node => {
          node.setNote(this.note)
        })
      }

      this.cancel()
    }
  }
}
</script>

<style lang="less" scoped>
.nodeNoteDialog {
  .tip {
    margin-top: 5px;
    color: #dcdfe6;
  }

  /deep/ .toastui-editor-defaultUI {
    // 深色主题适配
    background-color: var(--bg-color, #ffffff);
    border-color: var(--border-color, #dcdfe6);

    &.toastui-editor {
      background-color: var(--bg-color, #ffffff);
    }

    .toastui-editor-toolbar {
      background-color: var(--bg-color-secondary, #f5f5f5);
      border-bottom-color: var(--border-color, #dcdfe6);
    }

    .toastui-editor-md-container,
    .toastui-editor-ww-container {
      background-color: #606266 !important; /* 指定的背景色 */

      .toastui-editor-md-editor,
      .toastui-editor-ww-code-block {
        background-color: #606266 !important; /* 指定的背景色 */
        color: var(--text-color, #000000);
      }

      .toastui-editor-md-preview {
        background-color: #606266 !important; /* 指定的背景色 */
        color: var(--text-color, #000000);
      }
    }
  }

  // 适配深色模式
  body.dark & {
    /deep/ .toastui-editor-defaultUI {
      background-color: #2d2d2d;
      border-color: #555;

      &.toastui-editor {
        background-color: #2d2d2d;
      }

      .toastui-editor-toolbar {
        background-color: #68b87e !important; /* 指定的背景色 */
        border-bottom-color: #555;
      }

      .toastui-editor-md-container,
      .toastui-editor-ww-container {
        background-color: #606266 !important; /* 指定的背景色 */

        .toastui-editor-md-editor,
        .toastui-editor-ww-code-block {
          background-color: #606266 !important; /* 指定的背景色 */
          color: #fff;
        }

        .toastui-editor-md-preview {
          background-color: #606266 !important; /* 指定的背景色 */
          color: #fff;
        }
      }
    }
  }
  
  // 为编辑器添加指定的toolbar背景色
  /deep/ .toastui-editor-defaultUI-toolbar {
    background-color: #68b87e !important; /* 指定的背景色 */
  }
  
  // 修改模式切换区域的背景色
  /deep/ .toastui-editor-mode-switch {
    background-color: #606266 !important; /* 指定的背景色 */
  }
  
  // 修改活动标签项的背景色
  /deep/ .toastui-editor-mode-switch .tab-item.active {
    background-color: #c0c4cc !important; /* 指定的背景色 */
  }
  
  // 修改ProseMirror的文字颜色和字体大小
  /deep/ .ProseMirror {
    color: #fff !important; /* 指定的文字颜色 */
    font-size: 15px !important; /* 指定的字体大小 */
  }
  
  // 修改编辑器内容区域的文字颜色和字体大小
  /deep/ .toastui-editor-contents {
    font-size: 15px !important; /* 指定的字体大小 */
  }
  
  /deep/ .toastui-editor-contents p {
    color: #fff !important; /* 指定的文字颜色 */
  }
}
</style>
