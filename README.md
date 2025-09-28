# 思绪思维导图 (Simple Mind Map)

> 一个简单&强大的 Web 思维导图库和在线思维导图应用

[![npm-version](https://img.shields.io/npm/v/simple-mind-map)](https://www.npmjs.com/package/simple-mind-map)
![npm download](https://img.shields.io/npm/dm/simple-mind-map)
[![GitHub issues](https://img.shields.io/github/issues/wanglin2/mind-map)](https://github.com/wanglin2/mind-map/issues)
![license](https://img.shields.io/npm/l/express.svg)

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn

### 本地开发

```bash
# 克隆项目
git clone https://github.com/your-username/mind-map.git
cd mind-map

# 安装依赖
cd web
npm install

# 启动开发服务器
npm run serve

# 访问 http://localhost:8080
```

### 构建部署

```bash
# 构建生产版本
cd web
npm run build

# 自动化 Cloudflare 部署
node deploy.js
```

## ✨ 功能特性

- 🎨 **多种布局** - 支持逻辑结构图、思维导图、组织结构图、鱼骨图等
- 🌈 **丰富主题** - 内置多种主题，支持高度自定义
- 📝 **富文本编辑** - 支持文本、图片、图标、超链接、备注等
- 💾 **导入导出** - 支持多种格式导入导出（JSON、PNG、SVG、PDF、XMind等）
- 📱 **响应式** - 支持桌面端和移动端
- 🌐 **国际化** - 多语言支持
- ⚡ **高性能** - 插件化架构，按需加载

## 📦 项目结构

```
mind-map/
├── web/                    # Vue.js 主应用
│   ├── src/               # 源代码
│   ├── public/            # 公共资源
│   └── package.json       # 依赖配置
├── simple-mind-map/       # 核心思维导图库
├── index.html            # 主页面
├── build-for-cloudflare.js # Cloudflare 部署脚本
└── deploy.js             # 自动化部署脚本
```

## 🌐 部署指南

支持多种部署方式：

- **Cloudflare Pages** (推荐) - 详见 [部署文档](./CLOUDFLARE_DEPLOYMENT.md)
- **Vercel**
- **Netlify** 
- **GitHub Pages**

## 🛠️ 开发命令

```bash
# 开发服务器
npm run serve

# 生产构建
npm run build

# 库文件构建
npm run buildLibrary

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 📖 文档

- [开发文档](https://wanglin2.github.io/mind-map-docs/)
- [API 文档](https://wanglin2.github.io/mind-map-docs/zh/)
- [部署指南](./CLOUDFLARE_DEPLOYMENT.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 📄 许可证

本项目基于 [MIT](./LICENSE) 许可证开源。

## 🔗 相关链接

- [原项目地址](https://github.com/wanglin2/mind-map)
- [在线演示](https://wanglin2.github.io/mind-map/)
- [npm 包](https://www.npmjs.com/package/simple-mind-map)