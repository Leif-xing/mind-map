import { Message } from 'element-ui';

// 拖拽指令
const dragDirective = {
  bind(el, binding, vnode) {
    const dialogHeaderEl = el.querySelector('.el-dialog__header');
    const dragDom = el.querySelector('.el-dialog');
    
    if (!dialogHeaderEl || !dragDom) {
      return;
    }
    
    dialogHeaderEl.style.cursor = 'move';
    
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let isDragging = false;
    
    const handleMousedown = (e) => {
      // 只有点击标题栏才触发拖拽
      if (e.target !== dialogHeaderEl && !dialogHeaderEl.contains(e.target)) {
        return;
      }
      
      // 计算鼠标按下时的偏移量
      startX = e.clientX;
      startY = e.clientY;
      isDragging = true;
      
      // 获取当前dialog的位置
      const style = window.getComputedStyle(dragDom);
      // 解析transform属性获取当前位置
      const transform = style.transform || style.webkitTransform || style.mozTransform;
      if (transform && transform !== 'none') {
        const matrix = new DOMMatrixReadOnly(transform);
        lastX = matrix.m41 || 0;
        lastY = matrix.m42 || 0;
      } else {
        lastX = 0;
        lastY = 0;
      }
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseup);
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const offsetX = currentX - startX;
      const offsetY = currentY - startY;
      
      dragDom.style.transform = `translate(${lastX + offsetX}px, ${lastY + offsetY}px)`;
      dragDom.style.willChange = 'transform'; // 优化性能
    };
    
    const handleMouseup = () => {
      isDragging = false;
      dragDom.style.willChange = 'auto';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseup);
    };
    
    dialogHeaderEl.addEventListener('mousedown', handleMousedown);
    
    // 保存事件处理函数，以便后续清理
    if (!el._dragHandlers) {
      el._dragHandlers = {};
    }
    el._dragHandlers.mousedown = handleMousedown;
  },
  unbind(el) {
    // 移除事件监听器
    if (el._dragHandlers && el._dragHandlers.mousedown) {
      const dialogHeaderEl = el.querySelector('.el-dialog__header');
      if (dialogHeaderEl) {
        dialogHeaderEl.removeEventListener('mousedown', el._dragHandlers.mousedown);
      }
      el._dragHandlers = null;
    }
  }
};

export { dragDirective };

// 动态创建CSS样式来设置消息提示的位置和对齐方式

// 动态创建CSS样式来设置消息提示的位置和对齐方式
const addCustomMessageStyles = () => {
  const styleId = 'custom-message-styles';
  if (document.getElementById(styleId)) return; // 避免重复添加

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    .custom-message {
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
      margin-left: 0 !important;
      top: 100px !important; /* 距离顶部一定距离，但居中显示 */
    }
    
    .el-message {
      z-index: 2000 !important;
    }
  `;
  document.head.appendChild(style);
};

// 添加自定义样式
addCustomMessageStyles();

// 创建自定义的消息处理函数，只允许特定的消息通过
const createCustomMessageHandler = (originalMethod) => {
  return (options) => {
    const messageText = typeof options === 'string' ? options : (options && options.message) || '';
    
    // 只有包含"思维导图保存成功"的消息才显示
    if (messageText.includes('思维导图保存成功')) {
      // 添加自定义类和位置参数
      if (typeof options === 'string') {
        options = {
          message: options,
          customClass: 'custom-message',
          offset: 100, // 设置偏移量到页面上方一定距离
          showClose: false,
          duration: 3000
        };
      } else {
        options = {
          ...options,
          customClass: 'custom-message',
          offset: 100, // 设置偏移量到页面上方一定距离
        };
      }
      
      // 调用原始方法显示消息
      return originalMethod(options);
    } else {
      // 对于其他消息，不显示也不记录到控制台
      return null;
    }
  };
};

// 保存原始方法
const originalSuccess = Message.success;
const originalError = Message.error;
const originalWarning = Message.warning;
const originalInfo = Message.info;

// 重写 Message 方法以只显示特定消息
Message.success = createCustomMessageHandler(originalSuccess);
Message.error = createCustomMessageHandler(originalError);
Message.warning = createCustomMessageHandler(originalWarning);
Message.info = createCustomMessageHandler(originalInfo);

export default Message;