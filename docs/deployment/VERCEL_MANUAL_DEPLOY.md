# 🚀 Vercel 手动部署配置指南

## 📋 Vercel 手动部署设置

Vercel支持像Cloudflare Pages一样的手动配置，你可以在项目导入时或项目设置中手动指定构建命令和输出目录。

### 方法1：项目导入时配置

#### 1. 导入GitHub仓库
1. 访问 https://vercel.com/
2. 点击 **"Add New..." → "Project"**
3. 选择 `Leif-xing/mind-map` 仓库
4. 点击 **"Import"**

#### 2. 手动配置构建设置
在导入页面的 **"Configure Project"** 部分：

**Framework Preset**: `Other` (选择其他)

**Root Directory**: `./` (保持默认)

**Build and Output Settings** (展开):
- **Build Command**: 
  ```bash
  cd web && npm install && npm run build && cd .. && node build-for-vercel.js
  ```
- **Output Directory**: 
  ```
  vercel-build
  ```
- **Install Command**: (留空或使用默认)

**Environment Variables** (可选):
- Name: `NODE_VERSION`, Value: `18`

#### 3. 部署
点击 **"Deploy"** 开始部署

### 方法2：项目设置中配置

如果你已经创建了项目但部署失败，可以在设置中修改：

#### 1. 进入项目设置
1. 在Vercel Dashboard中找到你的项目
2. 点击项目名称进入项目页面
3. 点击 **"Settings"** 标签

#### 2. 修改构建配置
在 **"General"** 部分找到 **"Build & Development Settings"**：

- **Framework Preset**: `Other`
- **Build Command**: 
  ```bash
  cd web && npm install && npm run build && cd .. && node build-for-vercel.js
  ```
- **Output Directory**: 
  ```
  vercel-build
  ```
- **Install Command**: (留空)
- **Development Command**: (留空)

#### 3. 保存并重新部署
1. 点击 **"Save"**
2. 回到 **"Deployments"** 标签
3. 点击 **"Redeploy"** 重新部署

## 🔧 详细配置说明

### 构建命令解析
```bash
cd web && npm install && npm run build && cd .. && node build-for-vercel.js
```

1. `cd web` - 进入Vue应用目录
2. `npm install` - 安装依赖
3. `npm run build` - 构建Vue应用
4. `cd ..` - 返回根目录
5. `node build-for-vercel.js` - 准备Vercel部署文件

### 输出目录结构
```
vercel-build/
├── index.html
└── dist/
    ├── css/
    ├── js/
    ├── fonts/
    ├── img/
    └── logo.ico
```

## 🎯 推荐配置

### 基础配置（最简单）
- **Build Command**: `cd web && npm install && npm run build && cd .. && node build-for-vercel.js`
- **Output Directory**: `vercel-build`
- **Node.js Version**: `18.x`

### 高级配置（可选）
- **Install Command**: `echo "Skipping root install"`
- **Environment Variables**: 
  - `NODE_VERSION`: `18`
  - `NPM_VERSION`: `8`

## 🔍 验证配置

### 1. 本地测试
在推送前，先本地测试构建：
```bash
cd D:\workspace\github\mind-map
cd web && npm install && npm run build && cd .. && node build-for-vercel.js
```

### 2. 检查输出
确保 `vercel-build` 目录包含：
- `index.html` 文件
- `dist/` 目录及其内容

## 🚀 部署流程

### 完整部署步骤
1. **本地测试构建** (可选但推荐)
2. **推送代码到GitHub**
3. **在Vercel中导入项目**
4. **手动配置构建设置**
5. **部署并验证**

### 自动重新部署
配置完成后，每次推送代码到GitHub的main分支，Vercel都会：
1. 自动检测到代码更改
2. 运行你配置的构建命令
3. 部署到生产环境

## ⚠️ 常见问题

### 问题1: 构建超时
**解决**: 在项目设置中增加构建超时时间，或优化构建脚本

### 问题2: 依赖安装失败
**解决**: 确保`web/package.json`和`web/package-lock.json`都存在

### 问题3: 输出目录为空
**解决**: 检查`build-for-vercel.js`脚本是否正常运行

## 🎉 优势对比

### Vercel vs Cloudflare Pages

| 功能 | Vercel | Cloudflare Pages |
|------|--------|------------------|
| 手动配置构建命令 | ✅ | ✅ |
| 自定义输出目录 | ✅ | ✅ |
| 环境变量配置 | ✅ | ✅ |
| 自动部署 | ✅ | ✅ |
| 预览部署 | ✅ | ✅ |
| 免费套餐 | 慷慨 | 慷慨 |
| 全球CDN | ✅ | ✅ |
| 自定义域名 | ✅ | ✅ |

### Vercel 独有优势
- 更好的GitHub集成
- 内置Web Vitals监控
- 更详细的部署日志
- 更快的构建速度
- 更友好的用户界面

## 💡 最佳实践

1. **本地测试**: 总是先在本地测试构建命令
2. **简化配置**: 使用最简单的有效配置
3. **环境变量**: 合理使用环境变量控制构建行为
4. **监控部署**: 关注部署日志和性能指标
5. **缓存优化**: 利用Vercel的自动缓存优化

---

**🎯 推荐操作**: 删除现有的失败项目，重新导入仓库，并使用上述手动配置方法。这样更简单可靠！