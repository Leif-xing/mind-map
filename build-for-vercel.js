const fs = require('fs');
const path = require('path');

// 复制文件的辅助函数
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

// 复制目录的辅助函数
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`警告: 源目录不存在: ${src}`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

console.log('开始为Vercel准备构建文件...');

// 检查必要文件是否存在
if (!fs.existsSync('index.html')) {
  console.error('错误: index.html 文件不存在');
  process.exit(1);
}

if (!fs.existsSync('dist')) {
  console.error('错误: dist 目录不存在');
  console.log('请先运行构建命令:');
  console.log('  cd web && npm run build');
  process.exit(1);
}

// 创建构建输出目录
const buildDir = 'vercel-build';
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir);

// 复制主要的index.html文件
copyFile('index.html', path.join(buildDir, 'index.html'));

// 复制dist目录
copyDirectory('dist', path.join(buildDir, 'dist'));

console.log('Vercel构建文件准备完成！');
console.log('输出目录:', buildDir);
console.log('文件列表:');
const files = fs.readdirSync(buildDir);
files.forEach(file => {
  const filePath = path.join(buildDir, file);
  const stats = fs.statSync(filePath);
  console.log(`  ${stats.isDirectory() ? '[DIR]' : '[FILE]'} ${file}`);
});