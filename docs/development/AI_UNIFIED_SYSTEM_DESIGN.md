# 🤖 统一AI系统设计方案

## 🎯 最终需求确认

### 按钮布局
```
工具栏: [...] [AI配置] [AI创建] [...]
```

### 功能分工
- **AI配置按钮**: 配置和选择AI接口，测试连接
- **AI创建按钮**: 根据主题生成新的思维导图
- **续写功能**: 使用当前配置的模型续写思维导图

### 支持的AI提供商和模型

#### 1. 火山方舟 (现有)
- **接口**: `https://ark.cn-beijing.volces.com/api/v3/chat/completions`
- **模型**: 用户自定义输入 (如 `ep-xxxxx`)

#### 2. Navy API (新增)
- **接口**: `https://api.navy/v1/chat/completions`
- **模型列表**:
  - `deepseek-v3.2`
  - `gpt-5`
  - `gemini-2.5-pro`
  - `qwen3-235b-a22b-thinking-2507`

## 🔧 技术实现方案

### 数据结构
```javascript
aiSystem: {
  currentProvider: 'navy', // 当前选择的提供商
  providers: {
    huoshan: {
      name: '火山方舟',
      api: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      config: {
        key: '',
        model: '',
        port: 3456 // 向后兼容
      }
    },
    navy: {
      name: 'Navy API',
      api: 'https://api.navy/v1/chat/completions',
      models: [
        'deepseek-v3.2',
        'gpt-5', 
        'gemini-2.5-pro',
        'qwen3-235b-a22b-thinking-2507'
      ],
      config: {
        key: '',
        model: 'deepseek-v3.2'
      }
    }
  }
}
```

### 组件结构
- `AiConfigDialog.vue` - AI配置弹窗 (重新设计)
- `AiCreateDialog.vue` - AI创建弹窗
- 统一的AI工具类支持多提供商

### 实现步骤
1. 修改工具栏按钮配置
2. 重新设计AI配置系统
3. 创建统一的AI创建组件
4. 实现配置迁移逻辑
5. 扩展AI工具类支持多提供商

## 🎨 界面设计

### AI配置弹窗
```
┌─ AI配置 ─────────────────────────┐
│ 选择AI提供商                      │
│ ○ 火山方舟    ● Navy API         │
│                                  │
│ Navy API 配置                    │
│ ┌─────────────────────────────┐  │
│ │ API密钥: [sk-navy-xxxxxxxx] │  │
│ │ 选择模型: [deepseek-v3.2 ▼] │  │
│ │   • deepseek-v3.2           │  │
│ │   • gpt-5                   │  │
│ │   • gemini-2.5-pro          │  │
│ │   • qwen3-235b-a22b-...     │  │
│ └─────────────────────────────┘  │
│                                  │
│ [测试连接] [取消] [保存配置]      │
└──────────────────────────────────┘
```

### AI创建弹窗
```
┌─ AI创建思维导图 ─────────────────┐
│ 当前使用: Navy API - deepseek-v3.2│
│                                  │
│ 请输入主题:                      │
│ ┌─────────────────────────────┐  │
│ │ 人工智能的发展历程           │  │  
│ │                             │  │
│ │                             │  │
│ └─────────────────────────────┘  │
│                                  │
│ [取消] [开始生成]                │
└──────────────────────────────────┘
```

---

**准备开始实现，请确认方案无误后我将开始编码！**