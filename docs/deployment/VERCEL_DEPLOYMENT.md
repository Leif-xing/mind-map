# 🚀 Vercel 部署指南

## 📋 Vercel 部署配置

### 方法1：GitHub 自动部署（推荐）

#### 1. 推送代码到GitHub
```bash
git add .
git commit -m "添加Vercel部署配置"
git push origin main
```

#### 2. 在Vercel中导入项目
1. 访问 [Vercel Dashboard](https://vercel.com/)
2. 点击 **"Add New..."** → **"Project"**
3. 选择 **"Import Git Repository"**
4. 找到并选择 `Leif-xing/mind-map` 仓库
5. 点击 **"Import"**

#### 3. 项目配置（Vercel会自动检测）
- **Framework Preset**: `Other`
- **Root Directory**: `./` (默认)
- **Build Command**: 自动检测（使用vercel.json配置）
- **Output Directory**: `vercel-build`
- **Install Command**: `cd web && npm install`

#### 4. 环境变量（可选）
```
NODE_VERSION=18
```

#### 5. 部署
- 点击 **"Deploy"**
- 等待构建完成（约2-3分钟）
- 获得部署URL：`https://your-project-name.vercel.app`

### 方法2：Vercel CLI 部署

#### 1. 安装Vercel CLI
```bash
npm install -g vercel
```

#### 2. 登录Vercel
```bash
vercel login
```

#### 3. 初始化项目
```bash
vercel
```
按提示配置项目设置

#### 4. 部署
```bash
# 自动化部署脚本
node deploy-vercel.js

# 或手动部署
cd web && npm run vercel-build && cd .. && vercel --prod
```

## ⚙️ 配置文件说明

### vercel.json
```json
{
  "version": 2,
  "name": "mind-map",
  "builds": [
    {
      "src": "web/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "../vercel-build"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### 构建流程
1. `web/npm install` - 安装依赖
2. `web/npm run vercel-build` - 执行构建
3. `vue-cli-service build` - Vue应用构建
4. `copy.js` - 复制文件
5. `build-for-vercel.js` - 准备Vercel部署文件
6. 输出到 `vercel-build/` 目录

## 🎯 项目结构

### 构建后的目录结构：
```
vercel-build/
├── index.html          # 主页面
└── dist/              # 静态资源
    ├── css/           # 样式文件
    ├── js/            # JavaScript文件
    ├── fonts/         # 字体文件
    ├── img/           # 图片资源
    └── logo.ico       # 网站图标
```

## 🔧 高级配置

### 1. 自定义域名
1. 在Vercel项目设置中点击 **"Domains"**
2. 添加你的自定义域名
3. 配置DNS记录指向Vercel

### 2. 环境变量
在Vercel项目设置中的 **"Environment Variables"** 部分添加：
- `NODE_VERSION`: `18`
- 其他需要的环境变量

### 3. 构建优化
```json
{
  "builds": [
    {
      "src": "web/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "../vercel-build",
        "zeroConfig": true
      }
    }
  ]
}
```

## 🚀 自动化部署

### GitHub集成
- 每次推送到 `main` 分支时自动部署
- Pull Request 预览部署
- 部署状态检查

### 部署钩子
```bash
# 本地测试构建
npm run vercel-build

# 预览部署
vercel

# 生产部署
vercel --prod
```

## 🔍 故障排除

### 常见问题

#### 1. 构建失败
**错误**: Build failed
**解决方案**:
- 检查 `web/package.json` 中的 `vercel-build` 脚本
- 确保 Node.js 版本兼容（推荐18+）
- 查看Vercel构建日志

#### 2. 路由404错误
**错误**: Page not found
**解决方案**:
- 确保 `vercel.json` 中配置了正确的路由规则
- 检查SPA路由配置

#### 3. 静态资源加载失败
**错误**: CSS/JS files not loading
**解决方案**:
- 检查 `index.html` 中的资源路径
- 确保构建输出目录正确

## 📊 性能优化

### 1. 缓存策略
```json
{
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

### 2. 压缩优化
Vercel自动提供：
- Gzip/Brotli压缩
- 图片优化
- CDN加速

## 🎉 部署后验证

部署成功后，检查以下项目：
- ✅ 应用正常加载
- ✅ 思维导图功能正常
- ✅ 路由跳转正常
- ✅ 静态资源加载
- ✅ 移动端响应式
- ✅ 性能指标良好

## 🔄 更新部署

### 自动更新
每次推送代码到GitHub时，Vercel会自动：
1. 检测到新提交
2. 运行构建
3. 部署新版本
4. 发送部署通知

### 手动更新
```bash
git add .
git commit -m "更新内容"
git push origin main
# Vercel会自动检测并部署
```

## 💡 提示

1. **域名**: Vercel提供免费的 `.vercel.app` 子域名
2. **HTTPS**: 自动提供SSL证书
3. **全球CDN**: 自动全球分发
4. **分析**: 内置Web Vitals和访问分析
5. **预览**: 每个分支和PR都有预览URL