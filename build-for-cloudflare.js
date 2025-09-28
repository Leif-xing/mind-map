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

console.log('开始为Cloudflare Pages准备构建文件...');

// 创建构建输出目录
const buildDir = 'cloudflare-build';
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true });
}
fs.mkdirSync(buildDir);

// 复制主要的index.html文件
copyFile('index.html', path.join(buildDir, 'index.html'));

// 复制dist目录
copyDirectory('dist', path.join(buildDir, 'dist'));

// 复制Cloudflare特定的文件
if (fs.existsSync('_headers')) {
  copyFile('_headers', path.join(buildDir, '_headers'));
}
if (fs.existsSync('_redirects')) {
  copyFile('_redirects', path.join(buildDir, '_redirects'));
}

console.log('构建文件准备完成！');
console.log('请上传 cloudflare-build 目录中的所有文件到Cloudflare Pages');