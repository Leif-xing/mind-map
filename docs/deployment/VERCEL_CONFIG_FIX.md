# 🔧 Vercel 配置错误修复指南

## ❌ 错误信息解析

```
If `rewrites`, `redirects`, `headers`, `cleanUrls` or `trailingSlash` are used, 
then `routes` cannot be present.
```

### 🔍 问题原因
这个错误表示 Vercel 配置文件中使用了旧的 `routes` 配置格式，但 Vercel 现在推荐使用新的配置格式。两种格式不能混用。

### 📝 新旧格式对比

#### 旧格式 (❌ 不推荐)
```json
{
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

#### 新格式 (✅ 推荐)
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 🚀 修复方案

### 方案1：使用简化的 vercel.json (推荐)

创建最简单的配置：
```json
{
  "version": 2,
  "buildCommand": "cd web && npm install && npm run build && cd .. && node build-for-vercel.js",
  "outputDirectory": "vercel-build",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 方案2：完全删除 vercel.json

删除 `vercel.json` 文件，完全依赖 Vercel Dashboard 的手动配置：

**在 Vercel Dashboard 中配置：**
- **Build Command**: `cd web && npm install && npm run build && cd .. && node build-for-vercel.js`
- **Output Directory**: `vercel-build`
- **SPA 设置**: Vercel 会自动检测这是 SPA 应用并配置路由

### 方案3：使用完整的新格式配置

```json
{
  "version": 2,
  "buildCommand": "cd web && npm install && npm run build && cd .. && node build-for-vercel.js",
  "outputDirectory": "vercel-build",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/dist/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

## 🎯 立即修复步骤

### 步骤1：更新配置文件
我已经为你修复了 `vercel.json`，使用新的 `rewrites` 格式。

### 步骤2：提交并推送更改
```bash
git add vercel.json
git commit -m "fix: 修复Vercel配置格式，使用rewrites替代routes"
git push origin main
```

### 步骤3：重新部署
1. 推送后 Vercel 会自动重新部署
2. 或在 Vercel Dashboard 中手动点击 "Redeploy"

## 🔍 其他配置选项说明

### rewrites vs redirects vs routes

#### `rewrites` (URL 重写)
- 用于 SPA 应用路由
- 不改变浏览器 URL
- 适用于客户端路由

```json
"rewrites": [
  {
    "source": "/api/(.*)",
    "destination": "https://api.example.com/$1"
  }
]
```

#### `redirects` (重定向)
- 返回 HTTP 重定向状态码
- 浏览器 URL 会改变
- 适用于永久或临时重定向

```json
"redirects": [
  {
    "source": "/old-page",
    "destination": "/new-page",
    "permanent": true
  }
]
```

#### `routes` (旧格式，已弃用)
- Vercel v1 的配置格式
- 现在不推荐使用
- 与新格式不兼容

## 🛠️ 最佳实践

### 1. 简单优先
对于大多数 SPA 应用，只需要：
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. 避免过度配置
- 不必要的配置可能导致问题
- Vercel 的默认设置已经很好
- 只添加确实需要的配置

### 3. 使用 Dashboard 配置
- 对于简单项目，直接在 Dashboard 配置更可靠
- 避免配置文件语法错误
- 更直观的配置界面

## ⚠️ 注意事项

1. **不要混用格式**：一个项目只使用一种配置格式
2. **测试配置**：每次更改后都要测试部署
3. **查看文档**：Vercel 文档会更新配置格式
4. **保持简单**：除非必要，不要使用复杂配置

---

**🎯 现在你的配置已经修复，推送代码后 Vercel 应该能正常部署了！**