# 🔧 AI功能部署问题分析与解决方案

## ❌ 问题原因

### 🔍 技术分析

AI功能在本地和Vercel部署环境下的区别：

#### 本地环境：
- ✅ 有本地服务器运行在 `http://localhost:${port}/ai/chat`
- ✅ 可以访问 AI 代理服务
- ✅ 能够处理 AI 请求并返回流式响应

#### Vercel部署环境：
- ❌ **没有本地服务器**
- ❌ `localhost` 不存在或不可访问
- ❌ AI 请求无法发送到代理服务器
- ❌ 请求会一直等待或超时

### 📝 关键代码位置

**问题代码** (`web/src/utils/ai.js` 第101行)：
```javascript
const res = await fetch(`http://localhost:${this.options.port}/ai/chat`, {
  signal: this.controller.signal,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ...this.baseData,
    data: {
      ...this.baseData.data,
      ...data
    }
  })
})
```

**连接测试代码** (`web/src/pages/Edit/components/AiCreate.vue` 第178行)：
```javascript
await fetch(`http://localhost:${this.aiConfig.port}/ai/test`, {
  method: 'GET'
})
```

## 🚀 解决方案

### 方案1：禁用 AI 功能（最简单）

#### 1.1 隐藏 AI 相关按钮
修改 `web/src/pages/Edit/components/Toolbar.vue`：
```javascript
// 找到 AI 相关按钮，添加条件渲染
v-if="!isDeployedVersion"
```

#### 1.2 添加部署环境检测
在 `web/src/utils/index.js` 添加：
```javascript
// 检测是否为部署环境
export const isDeployedVersion = () => {
  return window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1'
}
```

### 方案2：修改为直接调用 AI API（推荐）

#### 2.1 修改 AI 请求逻辑
将本地代理服务改为直接调用 AI API：

```javascript
// 修改 web/src/utils/ai.js
async postMsg(data) {
  this.controller = new AbortController()
  
  // 检测是否为部署环境
  const isDeployed = window.location.hostname !== 'localhost'
  
  if (isDeployed) {
    // 部署环境：直接调用AI API
    const res = await fetch(this.baseData.api, {
      signal: this.controller.signal,
      method: this.baseData.method || 'POST',
      headers: this.baseData.headers,
      body: JSON.stringify({
        ...this.baseData.data,
        ...data
      })
    })
  } else {
    // 本地环境：使用代理服务
    const res = await fetch(`http://localhost:${this.options.port}/ai/chat`, {
      signal: this.controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...this.baseData,
        data: {
          ...this.baseData.data,
          ...data
        }
      })
    })
  }
  
  if (res.status && res.status !== 200) {
    throw new Error('请求失败')
  }
  return res.body.getReader()
}
```

#### 2.2 修改连接测试逻辑
```javascript
// 修改 AiCreate.vue 中的 testConnect 方法
async testConnect() {
  const isDeployed = window.location.hostname !== 'localhost'
  
  if (isDeployed) {
    // 部署环境：直接测试AI API
    try {
      await fetch(this.aiConfig.api, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + this.aiConfig.key
        },
        body: JSON.stringify({
          model: this.aiConfig.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        })
      })
      this.$message.success(this.$t('ai.connectSuccessful'))
      this.clientTipDialogVisible = false
      this.createDialogVisible = true
    } catch (error) {
      console.log(error)
      this.$message.error(this.$t('ai.connectFailed'))
    }
  } else {
    // 本地环境：测试代理服务
    try {
      await fetch(`http://localhost:${this.aiConfig.port}/ai/test`, {
        method: 'GET'
      })
      this.$message.success(this.$t('ai.connectSuccessful'))
      this.clientTipDialogVisible = false
      this.createDialogVisible = true
    } catch (error) {
      console.log(error)
      this.$message.error(this.$t('ai.connectFailed'))
    }
  }
}
```

### 方案3：使用 Vercel 函数作为代理（高级）

#### 3.1 创建 Vercel API 函数
创建 `api/ai-proxy.js`：
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { api, headers, data } = req.body

  try {
    const response = await fetch(api, {
      method: 'POST', 
      headers: headers,
      body: JSON.stringify(data)
    })

    // 设置响应头以支持流式传输
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // 转发流式响应
    const reader = response.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
    res.end()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

#### 3.2 修改前端请求地址
```javascript
// 部署环境使用 Vercel 函数
const apiUrl = isDeployed 
  ? '/api/ai-proxy' 
  : `http://localhost:${this.options.port}/ai/chat`
```

## 🎯 推荐实施方案

### 立即执行：方案1（禁用AI功能）

这是最快速的解决方案，适合快速修复部署问题：

1. **隐藏AI按钮**
2. **添加环境检测**
3. **显示提示信息**

### 长期方案：方案2（直接调用API）

这是最彻底的解决方案，但需要：
- 处理CORS问题
- 管理API密钥安全
- 处理流式响应

## ⚠️ 注意事项

### 安全考虑：
1. **API 密钥暴露**：直接在前端调用会暴露API密钥
2. **CORS 限制**：某些AI API可能不支持跨域请求
3. **速率限制**：没有代理层的保护

### 推荐做法：
1. 使用环境变量管理敏感信息
2. 实施适当的错误处理
3. 添加用户提示说明

---

**🎯 建议：先使用方案1快速修复，然后逐步实施方案2或方案3**