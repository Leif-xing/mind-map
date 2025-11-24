# 🔧 Mixed Content 问题解决方案

## 🚨 发现的问题

### 主要错误：Mixed Content

```
Mixed Content: The page at 'https://mmap.zdcy.eu.org/#/' was loaded over HTTPS,
but requested an insecure resource 'http://ark.cn-beijing.volces.com/api/v3/chat/completions'.
This request has been blocked; the content must be served over HTTPS.
```

**原因**: HTTPS网站无法直接请求HTTP的API接口

## 🛠️ 解决方案

### 方案1：修改API地址为HTTPS (推荐)

将AI配置中的API地址从：

```
http://ark.cn-beijing.volces.com/api/v3/chat/completions
```

改为：

```
https://ark.cn-beijing.volces.com/api/v3/chat/completions
```

### 方案2：使用修复后的Vercel代理

我已经修复了代理服务器的问题：

- 自动将HTTP转换为HTTPS
- 增强了错误处理和日志
- 改进了流式响应处理

## 🎯 用户操作指南

### 立即修复步骤：

1. **点击AI配置按钮**
2. **修改API地址**，将 `http://` 改为 `https://`
3. **保存配置**
4. **重新测试AI功能**

### 正确的配置示例：

```
API地址: https://ark.cn-beijing.volces.com/api/v3/chat/completions
API密钥: 你的密钥
模型: ep-xxxxx
```

## 🔍 验证方法

修改后应该看到：

```
部署环境 - 尝试直接调用AI API...
直接AI API响应状态: 200
开始读取流式响应...
```

而不是：

```
Mixed Content: ... This request has been blocked
直接API调用失败，尝试使用代理
```
