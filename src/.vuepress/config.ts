import { defineUserConfig } from "vuepress";

import theme from "./theme.js";

export default defineUserConfig({
  base: "/vanblog/",

  lang: "zh-CN",
  title: "ArchitectRoad",
  description: "Java 架构师之路",

  theme,

  // 和 PWA 一起启用
  // shouldPrefetch: false,
});
