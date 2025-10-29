<template>
  <el-dialog
    :title="isEdit ? '编辑标签' : '创建标签'"
    :visible.sync="dialogVisible"
    width="500px"
    :modal-append-to-body="false"
    :close-on-click-modal="false"
    custom-class="tagCreateEditDialog"
    :class="{ isDark: isDark }"
    @close="handleClose"
  >
    <div class="dialogContent">
      <!-- 标签名称 -->
      <div class="formItem">
        <label class="formLabel">
          <i class="el-icon-price-tag"></i>
          标签名称
        </label>
        <el-input
          v-model="formData.name"
          placeholder="请输入标签名称（最多50个字符）"
          maxlength="50"
          show-word-limit
          clearable
          @input="validateForm"
        />
        <div v-if="errors.name" class="errorMessage">{{ errors.name }}</div>
      </div>

      <!-- 标签颜色 -->
      <div class="formItem">
        <label class="formLabel">
          <i class="el-icon-brush"></i>
          标签颜色
        </label>
        <div class="colorSelector">
          <!-- 预设颜色 -->
          <div class="presetColors">
            <div
              v-for="color in presetColors"
              :key="color"
              class="colorOption"
              :class="{ active: formData.color === color }"
              :style="{ backgroundColor: color }"
              @click="selectColor(color)"
              :title="getColorName(color)"
            ></div>
          </div>
          
          <!-- 自定义颜色 -->
          <div class="customColorRow">
            <el-input
              v-model="formData.color"
              placeholder="#cccccc"
              size="small"
              style="width: 120px;"
              @input="validateColor"
            />
            <div 
              class="colorPreview"
              :style="{ backgroundColor: isValidColor(formData.color) ? formData.color : '#cccccc' }"
            ></div>
            <el-color-picker
              v-model="formData.color"
              size="small"
              @change="handleColorChange"
            />
          </div>
        </div>
        <div v-if="errors.color" class="errorMessage">{{ errors.color }}</div>
      </div>

      <!-- 标签预览 -->
      <div class="formItem">
        <label class="formLabel">
          <i class="el-icon-view"></i>
          预览效果
        </label>
        <div class="tagPreview">
          <div 
            class="previewTag"
            :style="{ backgroundColor: isValidColor(formData.color) ? formData.color : '#cccccc' }"
          >
            <span class="tagText">{{ formData.name || '标签预览' }}</span>
            <i class="el-icon-close"></i>
          </div>
        </div>
      </div>

      <!-- 使用统计（编辑模式） -->
      <div v-if="isEdit && tag" class="formItem">
        <label class="formLabel">
          <i class="el-icon-data-line"></i>
          使用统计
        </label>
        <div class="usageStats">
          <div class="statItem">
            <span class="statLabel">使用次数:</span>
            <span class="statValue">{{ tag.usageCount || 0 }} 次</span>
          </div>
          <div class="statItem">
            <span class="statLabel">创建时间:</span>
            <span class="statValue">{{ formatDate(tag.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div slot="footer" class="dialogFooter">
      <el-button @click="handleClose" size="small">
        <i class="el-icon-close"></i>
        取消
      </el-button>
      <el-button 
        type="primary" 
        @click="handleSubmit"
        :loading="submitting"
        :disabled="!isFormValid"
        size="small"
      >
        <i class="el-icon-check"></i>
        {{ isEdit ? '更新' : '创建' }}
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import { tagApi } from '@/api/supabase-api'
import { mapState } from 'vuex'

export default {
  name: 'TagCreateEditDialog',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    tag: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      dialogVisible: false,
      submitting: false,
      formData: {
        name: '',
        color: '#409eff'
      },
      errors: {},
      presetColors: [
        '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399',
        '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57',
        '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43',
        '#a55eea', '#26de81', '#fd79a8', '#fdcb6e', '#6c5ce7',
        '#74b9ff', '#81ecec', '#fab1a0', '#e17055', '#636e72'
      ]
    }
  },
  computed: {
    ...mapState({
      isDark: state => state.localConfig.isDark,
      currentUser: state => state.currentUser
    }),
    
    isEdit() {
      return !!this.tag
    },
    
    isFormValid() {
      return this.formData.name.trim() && 
             this.isValidColor(this.formData.color) && 
             Object.keys(this.errors).length === 0
    }
  },
  watch: {
    visible(val) {
      this.dialogVisible = val
      if (val) {
        this.initForm()
      }
    },
    
    dialogVisible(val) {
      if (!val) {
        this.$emit('close')
      }
    }
  },
  methods: {
    // 初始化表单
    initForm() {
      if (this.isEdit && this.tag) {
        this.formData = {
          name: this.tag.name,
          color: this.tag.color || '#409eff'
        }
      } else {
        this.formData = {
          name: '',
          color: '#409eff'
        }
      }
      this.errors = {}
    },

    // 验证表单
    validateForm() {
      this.errors = {}
      
      // 验证标签名称
      if (!this.formData.name.trim()) {
        this.errors.name = '标签名称不能为空'
      } else if (this.formData.name.length > 50) {
        this.errors.name = '标签名称不能超过50个字符'
      }

      // 验证颜色
      this.validateColor()
    },

    // 验证颜色
    validateColor() {
      if (!this.isValidColor(this.formData.color)) {
        this.errors.color = '请输入正确的颜色格式，如 #cccccc'
      } else {
        delete this.errors.color
      }
    },

    // 检查颜色格式是否有效
    isValidColor(color) {
      return /^#[0-9A-Fa-f]{6}$/.test(color)
    },

    // 选择预设颜色
    selectColor(color) {
      this.formData.color = color
      this.validateColor()
    },

    // 颜色选择器改变
    handleColorChange(color) {
      if (color) {
        this.formData.color = color
        this.validateColor()
      }
    },

    // 获取颜色名称
    getColorName(color) {
      const colorNames = {
        '#409eff': '经典蓝',
        '#67c23a': '成功绿',
        '#e6a23c': '警告橙',
        '#f56c6c': '危险红',
        '#909399': '信息灰',
        '#ff6b6b': '珊瑚红',
        '#4ecdc4': '薄荷绿',
        '#45b7d1': '天空蓝',
        '#96ceb4': '薄荷青',
        '#feca57': '阳光黄'
      }
      return colorNames[color] || color
    },

    // 格式化日期
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },

    // 处理关闭
    handleClose() {
      this.dialogVisible = false
      this.formData = { name: '', color: '#409eff' }
      this.errors = {}
      this.submitting = false
    },

    // 处理提交
    async handleSubmit() {
      this.validateForm()
      
      if (!this.isFormValid) {
        this.$message.warning('请检查表单输入')
        return
      }

      try {
        this.submitting = true

        if (this.isEdit) {
          // 更新标签
          await tagApi.updateTag(
            this.currentUser.id,
            this.tag.id,
            {
              name: this.formData.name.trim(),
              color: this.formData.color
            }
          )
          this.$message.success('标签更新成功')
        } else {
          // 创建标签
          await tagApi.createTag(
            this.currentUser.id,
            this.formData.name.trim(),
            this.formData.color
          )
          this.$message.success('标签创建成功')
        }

        this.$emit('success')
        this.handleClose()
      } catch (error) {
        this.$message.error((this.isEdit ? '更新' : '创建') + '标签失败: ' + error.message)
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="less" scoped>
.tagCreateEditDialog {
  .dialogContent {
    .formItem {
      margin-bottom: 24px;

      .formLabel {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        font-weight: 500;
        font-size: 14px;

        i {
          color: #409eff;
        }
      }

      .errorMessage {
        color: #f56c6c;
        font-size: 12px;
        margin-top: 4px;
      }
    }

    .colorSelector {
      .presetColors {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 8px;
        margin-bottom: 12px;

        .colorOption {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s;
          position: relative;

          &:hover {
            transform: scale(1.1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }

          &.active {
            border-color: #409eff;
            box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);

            &::after {
              content: '✓';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: #fff;
              font-weight: bold;
              font-size: 12px;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            }
          }
        }
      }

      .customColorRow {
        display: flex;
        align-items: center;
        gap: 12px;

        .colorPreview {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #dcdfe6;
        }
      }
    }

    .tagPreview {
      padding: 16px;
      background-color: #f5f7fa;
      border-radius: 8px;
      border: 1px dashed #dcdfe6;

      .previewTag {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 16px;
        color: #fff;
        font-size: 12px;
        gap: 6px;

        .tagText {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        i {
          font-size: 10px;
          opacity: 0.8;
        }
      }
    }

    .usageStats {
      background-color: #f5f7fa;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #ebeef5;

      .statItem {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;

        &:last-child {
          margin-bottom: 0;
        }

        .statLabel {
          color: #666;
          font-size: 13px;
        }

        .statValue {
          font-weight: 500;
          color: #333;
          font-size: 13px;
        }
      }
    }
  }

  .dialogFooter {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  // 深色主题样式
  &.isDark {
    .dialogContent {
      .formLabel {
        color: #fff;
      }

      .tagPreview {
        background-color: #363a3f;
        border-color: hsla(0, 0%, 100%, 0.1);
      }

      .usageStats {
        background-color: #363a3f;
        border-color: hsla(0, 0%, 100%, 0.1);

        .statLabel {
          color: #999;
        }

        .statValue {
          color: #fff;
        }
      }

      .colorPreview {
        border-color: hsla(0, 0%, 100%, 0.1);
      }
    }
  }
}

// 全局对话框样式
:global(.tagCreateEditDialog) {
  .el-dialog__header {
    border-bottom: 1px solid #ebeef5;
    padding: 20px 20px 15px;

    .el-dialog__title {
      font-weight: 600;
      font-size: 16px;
    }
  }

  .el-dialog__body {
    padding: 20px;
  }

  .el-dialog__footer {
    border-top: 1px solid #ebeef5;
    padding: 15px 20px 20px;
  }

  &.isDark {
    .el-dialog__header {
      border-bottom-color: hsla(0, 0%, 100%, 0.1);
    }

    .el-dialog__footer {
      border-top-color: hsla(0, 0%, 100%, 0.1);
    }
  }
}
</style>