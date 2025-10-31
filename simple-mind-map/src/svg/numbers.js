// 配置数据
const IconConfig = {
  color: {
    "1": "#FF0000",
    "2": "#FF4000",
    "3": "#FF8000",
    "4": "#FFA500",
    "5": "#FFC857",
    "6": "#FAD02C",
    "7": "#FFFF00",
    "8": "#DAE83F",
    "9": "#B6D718",
    "10": "#00FF00",
    "11": "#38B44A",
    "12": "#3AA675",
    "13": "#00FFFF",
    "14": "#26C6DA",
    "15": "#268BD2",
    "16": "#0000FF",
    "17": "#6600CC",
    "18": "#9900CC",
    "19": "#800080"
  },
  "一级": {
    "1": "一", "2": "二", "3": "三", "4": "四", "5": "五",
    "6": "六", "7": "七", "8": "八", "9": "九", "10": "十",
    "11": "十一", "12": "十二", "13": "十三", "14": "十四", "15": "十五",
    "16": "十六", "17": "十七", "18": "十八", "19": "十九", "20": "二十"
  },
  "二级": {
    "1": "1", "2": "2", "3": "3", "4": "4", "5": "5",
    "6": "6", "7": "7", "8": "8", "9": "9", "10": "10",
    "11": "11", "12": "12", "13": "13", "14": "14", "15": "15",
    "16": "16", "17": "17", "18": "18", "19": "19", "20": "20",
    "21": "21", "22": "22", "23": "23", "24": "24", "25": "25",
    "26": "26", "27": "27", "28": "28", "29": "29", "30": "30"
  },
  "三级": {
    "1": "A", "2": "B", "3": "C", "4": "D", "5": "E",
    "6": "F", "7": "G", "8": "H", "9": "I", "10": "J",
    "11": "K", "12": "L", "13": "M", "14": "N", "15": "O",
    "16": "P", "17": "Q", "18": "R", "19": "S", "20": "T",
    "21": "U", "22": "V", "23": "W", "24": "X", "25": "Y",
    "26": "Z", "27": "AA", "28": "AB", "29": "AC", "30": "AD"
  },
  "四级": {
    "1": "a", "2": "b", "3": "c", "4": "d", "5": "e",
    "6": "f", "7": "g", "8": "h", "9": "i", "10": "j",
    "11": "k", "12": "l", "13": "m", "14": "n", "15": "o",
    "16": "p", "17": "q", "18": "r", "19": "s", "20": "t",
    "21": "u", "22": "v", "23": "w", "24": "x", "25": "y",
    "26": "z", "27": "aa", "28": "ab", "29": "ac", "30": "ad"
  }
};

// 图标生成器类
class NumberingIconGenerator {
  private colors: string[];
  
  constructor() {
    this.colors = Object.values(IconConfig.color);
  }

  /**
   * 根据索引获取颜色（取余循环）
   */
  private getColor(index: number): string {
    const colorIndex = (index - 1) % this.colors.length;
    return this.colors[colorIndex];
  }

  /**
   * 根据文字长度计算字体大小和偏移
   */
  private getFontConfig(text: string): { fontSize: number; yOffset: number } {
    const len = text.length;
    if (len === 1) return { fontSize: 16, yOffset: 19 };
    if (len === 2) return { fontSize: 12, yOffset: 18 };
    if (len === 3) return { fontSize: 10, yOffset: 17 };
    return { fontSize: 8, yOffset: 16 };
  }

  /**
   * 创建单个 SVG 图标
   */
  private createIcon(text: string, color: string, size: number = 28): string {
    const { fontSize, yOffset } = this.getFontConfig(text);
    
    return `<svg width="${size}" height="${size}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg"><circle cx="14" cy="14" r="14" fill="${color}"/><text x="14" y="${yOffset}" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="bold" font-family="Arial, 'Microsoft YaHei', sans-serif">${text}</text></svg>`;
  }

  /**
   * 生成指定层级的所有图标（格式完全匹配原有结构）
   */
  private generateLevelIcons(level: '一级' | '二级' | '三级' | '四级'): Array<{ name: string; icon: string }> {
    const levelData = IconConfig[level];
    const result: Array<{ name: string; icon: string }> = [];
    
    Object.entries(levelData).forEach(([index, text]) => {
      const numIndex = parseInt(index);
      const color = this.getColor(numIndex);
      
      result.push({
        name: text,  // 只保留 name 和 icon，格式与原有数据一致
        icon: this.createIcon(text, color)
      });
    });
    
    return result;
  }

  /**
   * 根据层级和序号直接获取图标（用于动态使用）
   */
  getIcon(level: '一级' | '二级' | '三级' | '四级', index: number): string {
    const levelData = IconConfig[level];
    const text = levelData[String(index)];
    if (!text) return '';
    
    const color = this.getColor(index);
    return this.createIcon(text, color);
  }

  /**
   * 根据文本获取图标
   */
  getIconByText(text: string, level: '一级' | '二级' | '三级' | '四级'): string {
    const levelData = IconConfig[level];
    const entry = Object.entries(levelData).find(([_, value]) => value === text);
    if (!entry) return '';
    
    const index = parseInt(entry[0]);
    const color = this.getColor(index);
    return this.createIcon(text, color);
  }

  /**
   * 获取指定索引的颜色（用于外部调用）
   */
  getColorByIndex(index: number): string {
    return this.getColor(index);
  }
}

// 创建生成器实例
const generator = new NumberingIconGenerator();

// 导出符合原有格式的 nodeIconList
export const nodeIconList = [
  {
    name: '一级序号',
    type: 'number-1',
    list: generator.generateLevelIcons('一级')  // 自动生成，格式完全匹配
  },
  {
    name: '二级序号',
    type: 'number-2',
    list: generator.generateLevelIcons('二级')
  },
  {
    name: '三级序号',
    type: 'number-3',
    list: generator.generateLevelIcons('三级')
  },
  {
    name: '四级序号',
    type: 'number-4',
    list: generator.generateLevelIcons('四级')
  }
];

// 导出生成器实例供其他地方动态使用
export const iconGenerator = generator;

// 导出配置供外部使用
export { IconConfig };