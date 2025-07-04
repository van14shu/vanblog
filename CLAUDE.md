# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指导。

## 项目概述

这是一个基于 VuePress 的技术博客，名为"ArchitectRoad"（van_blog），专注于 Java 架构和开发。该网站作为 Java 开发者向架构师角色发展的综合学习资源。

## 开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 清理缓存并重启开发服务器
npm run docs:clean-dev

# 更新 VuePress 包
npm run docs:update-package
```

## 架构

### 技术栈
- **框架**: VuePress 2.0 与 Vue 3 + TypeScript
- **主题**: vuepress-theme-hope (v2.0.0-rc.59)
- **打包器**: Vite
- **样式**: Sass，自定义 SCSS 在 `src/.vuepress/styles/`
- **图标**: FontAwesome 支持品牌图标

### 项目结构
```
src/
├── .vuepress/
│   ├── config.ts         # 主要 VuePress 配置
│   ├── theme.ts          # Theme Hope 配置
│   ├── navbar.ts         # 导航菜单设置
│   ├── sidebar.ts        # 侧边栏配置
│   ├── styles/           # 自定义 SCSS 样式
│   └── public/           # 静态资源
├── java-core/            # Java 基础（JVM、并发）
├── ssm/                  # Spring/SpringBoot 生态系统
├── distribute-system/    # 分布式系统概念
├── cs-basics/           # 计算机科学基础
├── tools/               # 开发工具文档
└── knowledge-system/    # 学习方法论
```

### 内容约定
- 每个部分都有带 frontmatter 元数据的 `README.md`
- 使用 `<Catalog />` 组件自动生成内容列表
- Markdown 文件通常使用中文文件名表示技术主题
- Frontmatter 包含：标题、图标、类别、标签、索引设置

### 已启用的主要功能
- 搜索功能 (searchPro)
- Mermaid 图表支持
- 图片优化与懒加载
- Markdown 增强功能（对齐、属性、组件、演示）
- 深色模式切换

### 可用的已禁用功能
- PWA 支持（配置中已注释）
- 评论系统（Giscus 已注释）
- 数学渲染（KaTeX/MathJax）
- Chart.js 集成
- 演示模式（reveal.js）

## 构建与部署

- **CI/CD**: GitHub Actions 在推送到 main 分支时触发
- **内存**: 8GB 分配（NODE_OPTIONS: --max_old_space_size=8192）
- **输出**: 构建到 `src/.vuepress/dist` 并部署到 `gh-pages` 分支
- **平台**: GitHub Pages

## 配置文件

- **主配置**: `src/.vuepress/config.ts`
- **主题配置**: `src/.vuepress/theme.ts`
- **导航配置**: `src/.vuepress/navbar.ts` 和 `src/.vuepress/sidebar.ts`
- **TypeScript**: `tsconfig.json`（目标 ES2022，包含 VuePress 配置）

## 内容指南

- 目标受众：向架构师角色发展的 Java 开发者
- 专注于技术深度和实际实现
- 从基础到高级主题的渐进复杂性
- 使用 Mermaid 集成图表和可视化辅助

## 使用指南：添加新目录和文章

### 添加新目录的完整流程

#### 1. 创建目录结构
```bash
# 创建新的主目录
mkdir -p src/新目录名/

# 创建子目录（如果需要）
mkdir -p src/新目录名/子目录名/
```

#### 2. 创建目录首页
在新目录下创建 `README.md` 文件：
```markdown
---
title: 目录中文名称
icon: 图标名称或路径
index: false
category:
  - 分类名称
dir:
  order: 1  # 目录排序（可选）
---

<Catalog />
```

**图标说明：**
- 可使用 FontAwesome 图标名称，如 `computer`、`chart-diagram`
- 可使用自定义图标路径，如 `/java.svg`

#### 3. 更新导航栏配置
编辑 `src/.vuepress/navbar.ts`，添加新目录：
```typescript
export default navbar([
  "/",
  "/java-core/",
  "/ssm/",
  "/distribute-system/",
  "/cs-basics/",
  "/tools/",
  "/knowledge-system/",
  "/新目录名/",  // 添加新目录
]);
```

#### 4. 更新侧边栏配置
编辑 `src/.vuepress/sidebar.ts`，添加新目录：
```typescript
export default sidebar({
  "/java-core/": "structure",
  "/distribute-system/": "structure",
  "/cs-basics/": "structure",
  "/tools/": "structure",
  "/ssm/": "structure",
  "/knowledge-system/": "structure",
  "/新目录名/": "structure",  // 添加新目录
});
```

### 添加新文章的流程

#### 1. 创建文章文件
在相应目录下创建 `.md` 文件：
```markdown
---
title: 文章标题
order: 91  # 排序号（可选，数字越小越靠前）
category:
  - SpringBoot
  - MyBatis
tag:
  - 分布式  # 可选标签
---

# 文章标题

文章内容...
```

#### 2. 文件命名约定
- 支持中文文件名，如 `leetcode704.二分查找.md`
- 支持英文文件名，如 `spring-boot-basic.md`
- 文件名会影响 URL 路径

### 自动更新机制

1. **目录自动生成**：`<Catalog />` 组件会自动扫描当前目录下的所有 `.md` 文件，生成目录列表
2. **侧边栏自动生成**：`"structure"` 配置会根据目录结构自动生成侧边栏
3. **排序控制**：通过 `order` 字段控制显示顺序，数字越小越靠前
4. **分类标签**：通过 `category` 和 `tag` 进行内容分类和检索

### 注意事项

1. **必须文件**：每个目录都必须有 `README.md` 文件
2. **配置同步**：新增目录后必须同时更新 `navbar.ts` 和 `sidebar.ts`
3. **索引控制**：目录页面使用 `index: false` 避免被索引为内容页
4. **图标资源**：自定义图标文件放在 `src/.vuepress/public/` 目录下

### 示例：完整添加流程

假设要添加一个名为 "微服务架构" 的新目录：

1. 创建目录：`mkdir -p src/microservices/`
2. 创建 `src/microservices/README.md`：
   ```markdown
   ---
   title: 微服务架构
   icon: network-wired
   index: false
   category:
     - 架构设计
   ---
   
   <Catalog />
   ```
3. 更新 `navbar.ts`：添加 `"/microservices/"`
4. 更新 `sidebar.ts`：添加 `"/microservices/": "structure"`
5. 添加文章：`src/microservices/服务治理.md`
6. 运行 `npm run dev` 查看效果

通过以上流程，新目录和文章将自动集成到网站的导航和目录系统中。

## TOC（目录）深度配置

### 当前配置
- **站点级别**：`config.ts` 中的 `markdown.headers.level: [2, 3, 4, 5, 6]` 提取 2-6 级标题
- **主题级别**：`theme.ts` 中的 `headerDepth: 4` 控制右侧TOC显示深度
- **页面级别**：可在文章 frontmatter 中设置 `headerDepth` 覆盖全局配置

### 自定义TOC深度

#### 1. 全局配置
在 `src/.vuepress/config.ts` 中调整：
```typescript
markdown: {
  headers: {
    level: [2, 3, 4, 5, 6], // 提取的标题级别
  },
},
```

在 `src/.vuepress/theme.ts` 中调整：
```typescript
headerDepth: 6, // 显示的TOC深度
```

#### 2. 页面级别配置
在具体文章的 frontmatter 中：
```markdown
---
title: 文章标题
headerDepth: 6  # 该页面的TOC深度
toc: true       # 是否显示TOC
---
```

### 深度说明
- `level: [2, 3, 4, 5, 6]`：VuePress 从 markdown 中提取这些级别的标题
- `headerDepth: 4`：右侧TOC最多显示到4级标题
- 如果不配置 `level`，VuePress 默认只提取2-3级标题，即使 `headerDepth` 设置更高也不会显示更深的标题

## 搜索功能优化

### 当前搜索配置

项目已配置高级搜索功能，使用 `vuepress-plugin-search-pro` 插件：

#### 主要特性
- **全内容索引**：`indexContent: true` 索引所有文章内容，不仅仅是标题
- **中文优化**：搜索占位符为"搜索文档"
- **分类标签搜索**：支持通过文章的 category 和 tag 进行搜索
- **智能过滤**：自动排除首页、演示页面和标记为不搜索的页面
- **多种快捷键**：支持 `Ctrl+K`、`Ctrl+/`、`Ctrl+S` 快速打开搜索
- **搜索历史**：保存最近5次搜索记录
- **Web Worker**：使用独立工作线程处理搜索，不阻塞主界面

#### 搜索热键
- `Ctrl + K`：打开搜索框
- `Ctrl + /`：打开搜索框  
- `Ctrl + S`：打开搜索框

### 搜索问题排查

如果搜索功能在生产环境不工作，可能的原因和解决方案：

#### 1. 构建问题检查
```bash
# 清理缓存重新构建
npm run docs:clean-dev
npm run build
```

#### 2. 浏览器控制台检查
- 查看是否有 JavaScript 错误
- 检查搜索索引文件是否正确加载
- 确认 Web Worker 是否正常工作

#### 3. 网络资源检查
- 确认所有静态资源正确部署
- 检查搜索索引文件（通常在 `assets/` 目录下）
- 验证 base 路径配置是否正确

#### 4. 页面配置检查
如果某些页面不应被搜索，在 frontmatter 中添加：
```markdown
---
title: 页面标题
search: false  # 排除该页面
---
```

### 备选搜索方案

如果当前搜索仍有问题，可考虑以下替代方案：

#### 1. Algolia DocSearch（推荐）
```typescript
// 在 theme.ts 中替换 searchPro
plugins: {
  // searchPro: {...}, // 注释掉当前配置
  
  // 使用 Algolia DocSearch
  // 需要先申请 Algolia DocSearch 服务
  docsearch: {
    appId: "YOUR_APP_ID",
    apiKey: "YOUR_SEARCH_API_KEY", 
    indexName: "YOUR_INDEX_NAME",
    locales: {
      "/": {
        placeholder: "搜索文档",
        translations: {
          button: {
            buttonText: "搜索文档",
          },
        },
      },
    },
  },
}
```

#### 2. 简化搜索配置
```typescript
// 如果高级配置有问题，使用简化版本
plugins: {
  searchPro: {
    indexContent: true,
    locales: {
      "/": {
        placeholder: "搜索文档",
      },
    },
  },
}
```

### 搜索优化建议

1. **定期重建索引**：内容更新后重新构建确保搜索索引最新
2. **合理使用过滤器**：避免无意义页面被索引影响搜索质量
3. **监控搜索性能**：大型站点考虑使用服务端搜索方案
4. **测试生产环境**：确保搜索在实际部署环境中正常工作