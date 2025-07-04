import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  // base: "/vanblog/",

  lang: "zh-CN",
  title: "ArchitectRoad",
  description: "Java 架构师之路",

  theme,

  // 添加图标
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' ,size: 'any'}],
  ],

  // 配置 markdown 标题提取深度
  markdown: {
    headers: {
      // 提取 2-6 级标题用于生成目录
      level: [2, 3, 4, 5, 6],
    },
  },

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
