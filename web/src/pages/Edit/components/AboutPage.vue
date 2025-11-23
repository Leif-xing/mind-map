<template>
    <div class="aboutPage" :class="{ isDark: isDark }">
        <!-- 左侧导航树 -->
        <div class="sidebar">
            <div class="sidebar-header">
                <h2>📖 思维导图介绍</h2>
            </div>
            <div class="nav-tree">
                <template v-for="item in navItems">
                    <div :key="item.id" class="nav-item"
                        :class="{ active: currentSection === item.id && !currentSubSection }"
                        @click="item.children ? toggleSection(item.id) : selectSection(item.id)">
                        <span class="nav-icon">{{ item.icon }}</span>
                        <span class="nav-text">{{ item.title }}</span>
                        <span v-if="item.children" class="expand-icon" :class="{ expanded: expandedSections[item.id] }">
                            ▼
                        </span>
                    </div>
                    <div v-if="item.children && expandedSections[item.id]" :key="item.id + '-children'" class="sub-nav">
                        <div v-for="child in item.children" :key="child.id" class="nav-item sub-nav-item"
                            :class="{ active: currentSubSection === child.id }" @click="selectSubSection(child.id)">
                            <span class="nav-text">{{ child.title }}</span>
                        </div>
                    </div>
                </template>
            </div>
            <div class="sidebar-footer">
                <div class="shortcut-tip">
                    <kbd>Alt</kbd> + <kbd>C</kbd> 返回编辑器
                </div>
            </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="content-area" ref="contentArea">
            <!-- 概要介绍 -->
            <section v-if="currentSection === 'overview'" class="content-section">
                <h1 class="section-title">📝 概要介绍</h1>

                <div class="content-card">
                    <h3>什么是思维导图</h3>
                    <p>思维导图是一种可视化的思维工具，就像整理衣柜一样，帮助你把复杂的想法、知识点有条理地组织起来。通过树状结构，让思维更清晰、记忆更深刻。</p>
                </div>

                <div class="content-card">
                    <h3>项目能做什么</h3>
                    <div class="feature-grid">
                        <div class="feature-item">
                            <div class="feature-icon">📚</div>
                            <div class="feature-content">
                                <h4>读书笔记</h4>
                                <p>章节梳理、重点摘录、心得体会</p>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">🧠</div>
                            <div class="feature-content">
                                <h4>概念理解</h4>
                                <p>复杂概念分解、知识点关联</p>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">✅</div>
                            <div class="feature-content">
                                <h4>待办管理</h4>
                                <p>任务状态管理、优先级排序、进度跟踪</p>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">🎯</div>
                            <div class="feature-content">
                                <h4>主题学习</h4>
                                <p>学科知识体系、技能学习路径</p>
                            </div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">📖</div>
                            <div class="feature-content">
                                <h4>学习笔记</h4>
                                <p>课程整理、知识分类及归档</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="content-card">
                    <h3>🤖 AI智能助手</h3>
                    <ul>
                        <li>AI根据主题帮你创建思维导图框架</li>
                        <li>根据节点内容使用AI拓展思维导图</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>🔒 数据安全保障</h3>
                    <ul>
                        <li>本地缓存 + 云端数据库存储</li>
                        <li>支持数据导入导出</li>
                    </ul>
                </div>
            </section>

            <!-- 界面功能导览 -->
            <section v-if="currentSection === 'interface' && !currentSubSection" class="content-section">
                <h1 class="section-title">🎛️ 界面功能导览</h1>

                <div class="content-card">
                    <h3>界面总览</h3>
                    <p>思维导图编辑器采用经典的工具栏+编辑区布局，提供丰富的编辑和美化功能。点击左侧导航查看各部分详细介绍。</p>
                </div>
            </section>

            <!-- 编辑区域 -->
            <section v-if="currentSubSection === 'interface-edit'" class="content-section">
                <h1 class="section-title">📝 编辑区域</h1>

                <div class="content-card">
                    <h3>核心编辑区</h3>
                    <p>中央的思维导图画布，支持无限缩放和拖动，提供流畅的编辑体验。</p>
                    <ul>
                        <li><strong>节点编辑</strong> - 双击节点或按 F2 进入编辑模式</li>
                        <li><strong>节点创建</strong> - Tab 创建子节点，Enter 创建同级节点</li>
                        <li><strong>节点选择</strong> - 单击选择，Ctrl+A 全选</li>
                        <li><strong>拖拽移动</strong> - 拖动节点调整位置和层级关系</li>
                        <li><strong>缩放平移</strong> - 鼠标滚轮缩放，拖动画布平移</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>右键菜单</h3>
                    <p>在节点或画布上右键，可快速访问常用功能：</p>
                    <ul>
                        <li>插入节点、删除节点</li>
                        <li>复制、剪切、粘贴</li>
                        <li>节点样式设置</li>
                        <li>添加图标、图片、链接</li>
                    </ul>
                </div>
            </section>

            <!-- 顶部工具栏 -->
            <section v-if="currentSubSection === 'interface-top-toolbar'" class="content-section">
                <h1 class="section-title">🔧 顶部工具栏</h1>

                <div class="content-card">
                    <h3>主工具栏</h3>
                    <p>提供核心操作功能：</p>
                    <ul>
                        <li><strong>新建</strong> - 创建新的思维导图</li>
                        <li><strong>保存</strong> - 保存当前思维导图 (Ctrl+S)</li>
                        <li><strong>导出</strong> - 导出为图片、PDF、JSON等格式</li>
                        <li><strong>撤销/重做</strong> - Ctrl+Z / Ctrl+Y</li>
                        <li><strong>放大/缩小</strong> - 调整画布缩放比例</li>
                        <li><strong>适应画布</strong> - 自动调整视图以显示完整导图</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>样式工具栏</h3>
                    <p>美化思维导图的工具：</p>
                    <ul>
                        <li><strong>主题</strong> - 快速切换预设主题</li>
                        <li><strong>结构</strong> - 切换思维导图布局结构</li>
                        <li><strong>字体</strong> - 设置文字字体、大小、颜色</li>
                        <li><strong>背景</strong> - 设置节点背景色</li>
                        <li><strong>边框</strong> - 设置节点边框样式</li>
                        <li><strong>连线</strong> - 设置连线样式和颜色</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>快捷操作</h3>
                    <ul>
                        <li>按 <kbd>Alt</kbd> + <kbd>H</kbd> 可以隐藏/显示工具栏</li>
                        <li>工具栏支持自定义显示项目</li>
                    </ul>
                </div>
            </section>

            <!-- 左侧功能面板 -->
            <section v-if="currentSubSection === 'interface-left-sidebar'" class="content-section">
                <h1 class="section-title">📂 左侧功能面板</h1>

                <div class="content-card">
                    <h3>快速访问</h3>
                    <p>按 <kbd>Shift</kbd> + <kbd>Z</kbd> 打开左侧功能面板，提供以下功能：</p>
                </div>

                <div class="content-card">
                    <h3>📑 思维导图管理</h3>
                    <p>管理所有思维导图文件：</p>
                    <ul>
                        <li><strong>标签分类</strong> - 通过标签组织思维导图</li>
                        <li><strong>快速搜索</strong> - 搜索思维导图标题</li>
                        <li><strong>批量操作</strong> - 删除、导出多个思维导图</li>
                        <li><strong>已分类/未分类</strong> - 查看有无标签的思维导图</li>
                    </ul>
                    <p class="tip">💡 使用 <kbd>Alt</kbd> + <kbd>G</kbd> 可直接打开思维导图管理</p>
                </div>

                <div class="content-card">
                    <h3>ℹ️ 关于</h3>
                    <p>查看使用说明、快捷键列表和功能介绍。</p>
                </div>

                <div class="content-card">
                    <h3>👤 用户</h3>
                    <p>用户相关操作：</p>
                    <ul>
                        <li>修改密码</li>
                        <li>退出登录</li>
                    </ul>
                </div>
            </section>

            <!-- 右侧辅助面板 -->
            <section v-if="currentSubSection === 'interface-right-sidebar'" class="content-section">
                <h1 class="section-title">🎨 右侧辅助面板</h1>

                <div class="content-card">
                    <h3>面板概览</h3>
                    <p>右侧提供多个辅助面板，点击右侧边缘的触发器可展开相应面板。</p>
                </div>

                <div class="content-card">
                    <h3>🎯 节点样式</h3>
                    <p>自定义选中节点的样式：</p>
                    <ul>
                        <li><strong>文字样式</strong> - 字体、大小、颜色、粗细、斜体</li>
                        <li><strong>背景</strong> - 背景颜色、渐变</li>
                        <li><strong>边框</strong> - 边框颜色、宽度、样式</li>
                        <li><strong>形状</strong> - 矩形、圆角矩形、圆形等</li>
                        <li><strong>图标</strong> - 添加表情、图标</li>
                        <li><strong>图片</strong> - 添加节点图片</li>
                        <li><strong>链接</strong> - 添加超链接</li>
                        <li><strong>备注</strong> - 添加详细备注</li>
                        <li><strong>标签</strong> - 添加节点标签</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>⚙️ 基础样式</h3>
                    <p>设置全局默认样式：</p>
                    <ul>
                        <li><strong>根节点样式</strong> - 设置根节点的默认样式</li>
                        <li><strong>二级节点样式</strong> - 设置二级节点的默认样式</li>
                        <li><strong>三级及以下节点</strong> - 设置其他层级节点样式</li>
                        <li><strong>连线样式</strong> - 设置连线的默认样式</li>
                        <li><strong>概要样式</strong> - 设置概要的样式</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>🎨 主题</h3>
                    <p>选择和自定义主题：</p>
                    <ul>
                        <li><strong>预设主题</strong> - 20+ 精美预设主题</li>
                        <li><strong>自定义主题</strong> - 创建专属主题配色</li>
                        <li><strong>主题配置</strong> - 调整主题细节参数</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>🌳 结构</h3>
                    <p>切换思维导图布局结构：</p>
                    <ul>
                        <li><strong>逻辑结构图</strong> - 经典思维导图布局</li>
                        <li><strong>思维导图</strong> - 左右分布</li>
                        <li><strong>组织结构图</strong> - 上下层级</li>
                        <li><strong>目录组织图</strong> - 树形结构</li>
                        <li><strong>时间轴</strong> - 时间线布局</li>
                        <li><strong>鱼骨图</strong> - 因果分析</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>📋 大纲</h3>
                    <p>以大纲形式查看和编辑思维导图：</p>
                    <ul>
                        <li><strong>树形视图</strong> - 清晰的层级结构</li>
                        <li><strong>快速编辑</strong> - 直接编辑节点文本</li>
                        <li><strong>拖拽调整</strong> - 拖动调整节点顺序</li>
                        <li><strong>展开/折叠</strong> - 控制显示层级</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>⚙️ 设置</h3>
                    <p>应用设置和配置：</p>
                    <ul>
                        <li><strong>画布设置</strong> - 背景色、网格等</li>
                        <li><strong>编辑设置</strong> - 自动保存、快捷键等</li>
                        <li><strong>导出设置</strong> - 导出格式、质量等</li>
                        <li><strong>AI设置</strong> - AI功能配置</li>
                    </ul>
                </div>
            </section>

            <!-- 底部状态栏 -->
            <section v-if="currentSubSection === 'interface-bottom-bar'" class="content-section">
                <h1 class="section-title">📊 底部状态栏</h1>

                <div class="content-card">
                    <h3>状态信息</h3>
                    <p>底部状态栏显示当前思维导图的状态信息：</p>
                    <ul>
                        <li><strong>缩放比例</strong> - 当前画布缩放百分比</li>
                        <li><strong>节点统计</strong> - 总节点数、选中节点数</li>
                        <li><strong>保存状态</strong> - 显示是否有未保存的更改</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>快捷操作</h3>
                    <ul>
                        <li><strong>缩放控制</strong> - 点击 +/- 按钮调整缩放</li>
                        <li><strong>全屏模式</strong> - 进入全屏编辑模式</li>
                        <li><strong>小地图</strong> - 显示思维导图缩略图，方便导航</li>
                    </ul>
                </div>
            </section>

            <!-- 快捷键大全 -->
            <section v-if="currentSection === 'shortcuts'" class="content-section">
                <h1 class="section-title">⌨️ 快捷键大全</h1>

                <div class="content-card">
                    <h3>系统核心快捷键</h3>
                    <table class="shortcut-table">
                        <thead>
                            <tr>
                                <th>快捷键</th>
                                <th>功能说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td>
                                <td>撤销操作</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>Y</kbd></td>
                                <td>重做操作</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>A</kbd></td>
                                <td>全选节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>C</kbd></td>
                                <td>复制节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>X</kbd></td>
                                <td>剪切节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>V</kbd></td>
                                <td>粘贴节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Del</kbd> / <kbd>Backspace</kbd></td>
                                <td>删除节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Shift</kbd> + <kbd>Backspace</kbd></td>
                                <td>仅删除当前节点</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="content-card">
                    <h3>节点操作快捷键</h3>
                    <table class="shortcut-table">
                        <thead>
                            <tr>
                                <th>快捷键</th>
                                <th>功能说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><kbd>Tab</kbd></td>
                                <td>插入子节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Shift</kbd> + <kbd>Tab</kbd></td>
                                <td>插入父节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Enter</kbd></td>
                                <td>插入同级节点</td>
                            </tr>
                            <tr>
                                <td><kbd>F2</kbd></td>
                                <td>编辑节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>↑</kbd></td>
                                <td>上移节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>↓</kbd></td>
                                <td>下移节点</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="content-card">
                    <h3>视图操作快捷键</h3>
                    <table class="shortcut-table">
                        <thead>
                            <tr>
                                <th>快捷键</th>
                                <th>功能说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>=</kbd></td>
                                <td>放大视图</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>-</kbd></td>
                                <td>缩小视图</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>I</kbd></td>
                                <td>适应画布</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>Enter</kbd></td>
                                <td>重置视图</td>
                            </tr>
                            <tr>
                                <td><kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd></td>
                                <td>方向键导航节点</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="content-card">
                    <h3>应用功能快捷键</h3>
                    <table class="shortcut-table">
                        <thead>
                            <tr>
                                <th>快捷键</th>
                                <th>功能说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
                                <td>保存思维导图</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>F</kbd></td>
                                <td>搜索节点</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>G</kbd></td>
                                <td>打开AI创建 / 添加概要</td>
                            </tr>
                            <tr>
                                <td><kbd>Ctrl</kbd> + <kbd>L</kbd></td>
                                <td>打开历史记录 / 一键整理</td>
                            </tr>
                            <tr>
                                <td><kbd>Alt</kbd> + <kbd>H</kbd></td>
                                <td>切换工具栏显示/隐藏</td>
                            </tr>
                            <tr>
                                <td><kbd>Alt</kbd> + <kbd>T</kbd></td>
                                <td>打开标签管理器</td>
                            </tr>
                            <tr>
                                <td><kbd>Alt</kbd> + <kbd>G</kbd></td>
                                <td>打开思维导图管理</td>
                            </tr>
                            <tr>
                                <td><kbd>Shift</kbd> + <kbd>Z</kbd></td>
                                <td>切换左侧边栏</td>
                            </tr>
                            <tr>
                                <td><kbd>Shift</kbd> + <kbd>A</kbd></td>
                                <td>切换节点编号</td>
                            </tr>
                            <tr>
                                <td><kbd>Shift</kbd> + <kbd>W</kbd></td>
                                <td>切换待办复选框</td>
                            </tr>
                            <tr>
                                <td><kbd>Shift</kbd> + <kbd>S</kbd></td>
                                <td>切换待办状态</td>
                            </tr>
                            <tr>
                                <td><kbd>Shift</kbd> + <kbd>C</kbd></td>
                                <td>打开备注对话框</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="content-card">
                    <h3>导航管理快捷键</h3>
                    <table class="shortcut-table">
                        <thead>
                            <tr>
                                <th>快捷键</th>
                                <th>功能说明</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><kbd>Alt</kbd> + <kbd>C</kbd></td>
                                <td>从管理页面返回编辑器</td>
                            </tr>
                            <tr>
                                <td><kbd>ESC</kbd></td>
                                <td>关闭对话框/搜索/返回</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- 标签化管理 -->
            <section v-if="currentSection === 'tags'" class="content-section">
                <h1 class="section-title">🏷️ 标签化管理</h1>

                <div class="content-card">
                    <h3>为什么需要标签</h3>
                    <p>当你的思维导图越来越多时，通过标签可以快速分类和查找。就像给文件夹贴上标签，让管理更轻松。</p>
                </div>

                <div class="content-card">
                    <h3>标签系统功能</h3>
                    <ul>
                        <li><strong>创建标签</strong> - 支持颜色分类和图标标识</li>
                        <li><strong>标签管理</strong> - 添加、删除、编辑标签</li>
                        <li><strong>多标签支持</strong> - 一个思维导图可以关联多个标签</li>
                        <li><strong>智能筛选</strong> - 按标签快速筛选思维导图</li>
                        <li><strong>统计分析</strong> - 查看每个标签下的思维导图数量</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>使用技巧</h3>
                    <ul>
                        <li>使用 <kbd>Alt</kbd> + <kbd>T</kbd> 快速打开标签管理器</li>
                        <li>为不同类型的思维导图设置不同颜色的标签</li>
                        <li>利用标签组织项目、学习、工作等不同场景的思维导图</li>
                    </ul>
                </div>
            </section>

            <!-- 进阶技巧 -->
            <section v-if="currentSection === 'advanced'" class="content-section">
                <h1 class="section-title">💡 进阶技巧</h1>

                <div class="content-card">
                    <h3>主题定制</h3>
                    <p>通过右侧面板的"主题"选项，可以选择预设主题或自定义主题配色，打造个性化的思维导图风格。</p>
                </div>

                <div class="content-card">
                    <h3>数据导入导出</h3>
                    <ul>
                        <li><strong>支持格式</strong> - .smm、.json、.xmind、.md、.xlsx</li>
                        <li><strong>导出选项</strong> - 支持导出为图片、PDF、Markdown等多种格式</li>
                        <li><strong>数据互通</strong> - 与其他思维导图工具的数据互通</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>协作与分享</h3>
                    <ul>
                        <li>导出为图片或PDF分享给他人</li>
                        <li>通过云端数据库实现多设备同步</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>效率提升技巧</h3>
                    <ul>
                        <li>熟练使用快捷键，提高编辑效率</li>
                        <li>利用AI助手快速生成思维导图框架</li>
                        <li>使用大纲视图进行快速编辑</li>
                        <li>善用待办功能进行任务管理</li>
                        <li>使用节点编号组织复杂内容</li>
                    </ul>
                </div>

                <div class="content-card">
                    <h3>性能优化建议</h3>
                    <ul>
                        <li>单个思维导图节点数量建议控制在500个以内</li>
                        <li>大型思维导图可以拆分为多个子图，通过标签关联</li>
                        <li>定期导出备份重要数据</li>
                    </ul>
                </div>
            </section>
        </div>
    </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
    name: 'AboutPage',
    data() {
        return {
            currentSection: 'overview',
            currentSubSection: null, // 当前选中的子级选项
            expandedSections: {}, // 记录哪些导航项是展开的
            navItems: [
                { id: 'overview', icon: '📝', title: '概要介绍' },
                {
                    id: 'interface',
                    icon: '🎛️',
                    title: '界面功能导览',
                    children: [
                        { id: 'interface-edit', title: '编辑区域' },
                        { id: 'interface-top-toolbar', title: '顶部工具栏' },
                        { id: 'interface-left-sidebar', title: '左侧功能面板' },
                        { id: 'interface-right-sidebar', title: '右侧辅助面板' },
                        { id: 'interface-bottom-bar', title: '底部状态栏' }
                    ]
                },
                { id: 'shortcuts', icon: '⌨️', title: '快捷键大全' },
                { id: 'tags', icon: '🏷️', title: '标签化管理' },
                { id: 'advanced', icon: '💡', title: '进阶技巧' }
            ]
        }
    },
    computed: {
        ...mapState(['localConfig']),
        isDark() {
            return this.localConfig.isDark
        }
    },
    mounted() {
        // 监听键盘事件
        window.addEventListener('keydown', this.handleKeyDown)
    },
    beforeDestroy() {
        // 移除键盘事件监听
        window.removeEventListener('keydown', this.handleKeyDown)
    },
    methods: {
        selectSection(sectionId) {
            this.currentSection = sectionId
            this.currentSubSection = null
            // 滚动到顶部
            if (this.$refs.contentArea) {
                this.$refs.contentArea.scrollTop = 0
            }
        },
        toggleSection(sectionId) {
            // 切换展开/折叠状态
            this.$set(this.expandedSections, sectionId, !this.expandedSections[sectionId])
            // 同时选中该section
            this.currentSection = sectionId
            this.currentSubSection = null
        },
        selectSubSection(subSectionId) {
            this.currentSubSection = subSectionId
            // 滚动到顶部
            if (this.$refs.contentArea) {
                this.$refs.contentArea.scrollTop = 0
            }
        },
        handleKeyDown(event) {
            // Alt+C 或 ESC 返回编辑器
            if (event.altKey && event.key.toLowerCase() === 'c') {
                event.preventDefault()
                this.$bus.$emit('backToEditor')
            }
        }
    }
}
</script>

<style scoped>
.aboutPage {
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    display: flex;
    background: #f5f7fa;
    z-index: 1999;
}

/* 深色主题 */
.aboutPage.isDark {
    background: #1a1d23;
}

/* 左侧边栏 */
.sidebar {
    width: 280px;
    background: #fff;
    border-right: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
}

.aboutPage.isDark .sidebar {
    background: #262a2e;
    border-right-color: #3a3f47;
}

.sidebar-header {
    padding: 24px 20px;
    border-bottom: 1px solid #e4e7ed;
}

.aboutPage.isDark .sidebar-header {
    border-bottom-color: #3a3f47;
}

.sidebar-header h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #303133;
}

.aboutPage.isDark .sidebar-header h2 {
    color: #e4e7ed;
}

.nav-tree {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;
}

.nav-item {
    display: flex;
    align-items: center;
    padding: 12px 20px;
    cursor: pointer;
    transition: all 0.3s;
    color: #606266;
    user-select: none;
}

.aboutPage.isDark .nav-item {
    color: #c0c4cc;
}

.nav-item:hover {
    background: #f5f7fa;
    color: #409eff;
}

.aboutPage.isDark .nav-item:hover {
    background: #2c3035;
    color: #409eff;
}

.nav-item.active {
    background: linear-gradient(90deg, #409eff15 0%, transparent 100%);
    color: #409eff;
    border-right: 3px solid #409eff;
    font-weight: 500;
}

.nav-icon {
    font-size: 20px;
    margin-right: 12px;
    min-width: 24px;
    text-align: center;
}

.nav-text {
    font-size: 15px;
}

.expand-icon {
    margin-left: auto;
    font-size: 10px;
    transition: transform 0.3s;
    color: #909399;
}

.expand-icon.expanded {
    transform: rotate(180deg);
}

.sub-nav {
    background: rgba(0, 0, 0, 0.02);
}

.aboutPage.isDark .sub-nav {
    background: rgba(0, 0, 0, 0.2);
}

.sub-nav-item {
    padding-left: 56px !important;
    font-size: 14px;
}

.sub-nav-item .nav-text {
    font-size: 14px;
}

.sub-nav-item.active {
    background: linear-gradient(90deg, #409eff20 0%, transparent 100%);
    border-right: 3px solid #409eff;
}

.content-card .tip {
    background: #ecf5ff;
    border-left: 3px solid #409eff;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 4px;
    font-size: 14px;
    color: #606266;
}

.aboutPage.isDark .content-card .tip {
    background: #2c3e50;
    color: #c0c4cc;
}

.sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid #e4e7ed;
    background: #fafafa;
}

.aboutPage.isDark .sidebar-footer {
    border-top-color: #3a3f47;
    background: #1f2226;
}

.shortcut-tip {
    font-size: 13px;
    color: #909399;
    text-align: center;
    line-height: 1.6;
}

.aboutPage.isDark .shortcut-tip {
    color: #909399;
}

/* 右侧内容区 */
.content-area {
    flex: 1;
    overflow-y: auto;
    padding: 40px 60px;
}

.content-section {
    max-width: 900px;
    margin: 0 auto;
}

.section-title {
    font-size: 32px;
    font-weight: 700;
    color: #303133;
    margin: 0 0 32px 0;
    padding-bottom: 16px;
    border-bottom: 2px solid #409eff;
}

.aboutPage.isDark .section-title {
    color: #e4e7ed;
}

.content-card {
    background: #fff;
    border-radius: 12px;
    padding: 24px 28px;
    margin-bottom: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    transition: transform 0.3s, box-shadow 0.3s;
}

.aboutPage.isDark .content-card {
    background: #262a2e;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.content-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.aboutPage.isDark .content-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.content-card h3 {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 16px 0;
}

.aboutPage.isDark .content-card h3 {
    color: #e4e7ed;
}

.content-card h4 {
    font-size: 16px;
    font-weight: 500;
    color: #303133;
    margin: 0 0 8px 0;
}

.aboutPage.isDark .content-card h4 {
    color: #e4e7ed;
}

.content-card p {
    font-size: 15px;
    line-height: 1.8;
    color: #606266;
    margin: 0;
}

.aboutPage.isDark .content-card p {
    color: #c0c4cc;
}

.content-card ul {
    margin: 0;
    padding-left: 24px;
}

.content-card li {
    font-size: 15px;
    line-height: 1.8;
    color: #606266;
    margin-bottom: 8px;
}

.aboutPage.isDark .content-card li {
    color: #c0c4cc;
}

/* 功能网格 */
.feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;
}

.feature-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: #f5f7fa;
    border-radius: 8px;
    transition: all 0.3s;
}

.aboutPage.isDark .feature-item {
    background: #2c3035;
}

.feature-item:hover {
    background: #ecf5ff;
    transform: translateY(-2px);
}

.aboutPage.isDark .feature-item:hover {
    background: #363b3f;
}

.feature-icon {
    font-size: 28px;
    min-width: 32px;
}

.feature-content h4 {
    margin: 0 0 4px 0;
    font-size: 15px;
}

.feature-content p {
    margin: 0;
    font-size: 13px;
    color: #909399;
}

/* 快捷键表格 */
.shortcut-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
}

.shortcut-table th,
.shortcut-table td {
    padding: 12px 16px;
    text-align: left;
    border-bottom: 1px solid #e4e7ed;
}

.aboutPage.isDark .shortcut-table th,
.aboutPage.isDark .shortcut-table td {
    border-bottom-color: #3a3f47;
}

.shortcut-table th {
    background: #f5f7fa;
    font-weight: 600;
    color: #303133;
    font-size: 14px;
}

.aboutPage.isDark .shortcut-table th {
    background: #2c3035;
    color: #e4e7ed;
}

.shortcut-table td {
    font-size: 14px;
    color: #606266;
}

.aboutPage.isDark .shortcut-table td {
    color: #c0c4cc;
}

.shortcut-table tbody tr:hover {
    background: #f5f7fa;
}

.aboutPage.isDark .shortcut-table tbody tr:hover {
    background: #2c3035;
}

/* 键盘按键样式 */
kbd {
    display: inline-block;
    padding: 3px 8px;
    font-size: 12px;
    font-family: 'Consolas', 'Monaco', monospace;
    line-height: 1.4;
    color: #303133;
    background: #f5f7fa;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    margin: 0 2px;
}

.aboutPage.isDark kbd {
    color: #e4e7ed;
    background: #363b3f;
    border-color: #4a4f57;
}

/* 滚动条样式 */
.nav-tree::-webkit-scrollbar,
.content-area::-webkit-scrollbar {
    width: 6px;
}

.nav-tree::-webkit-scrollbar-thumb,
.content-area::-webkit-scrollbar-thumb {
    background: #c0c4cc;
    border-radius: 3px;
}

.nav-tree::-webkit-scrollbar-thumb:hover,
.content-area::-webkit-scrollbar-thumb:hover {
    background: #909399;
}

.aboutPage.isDark .nav-tree::-webkit-scrollbar-thumb,
.aboutPage.isDark .content-area::-webkit-scrollbar-thumb {
    background: #4a4f57;
}

.aboutPage.isDark .nav-tree::-webkit-scrollbar-thumb:hover,
.aboutPage.isDark .content-area::-webkit-scrollbar-thumb:hover {
    background: #5a5f67;
}
</style>
