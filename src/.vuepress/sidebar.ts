import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    // "",
    // "portfolio",
    {
      text: "JAVA",
      icon: "laptop-code",
      prefix: "java-core/",
      link: "java-core/",
      children: "structure",
    },
    {
      text: "分布式",
      icon: "server",
      prefix: "distribute-system/",
      link: "distribute-system/",
      children: "structure",
    },
    {
      text: "开发工具",
      icon: "tools",
      prefix: "tools/",
      link: "tools/",
      children: "structure",
    },
    // {
    //   text: "案例",
    //   icon: "laptop-code",
    //   prefix: "demo/",
    //   link: "demo/",
    //   children: "structure",
    // },
    // {
    //   text: "文档",
    //   icon: "book",
    //   prefix: "guide/",
    //   children: "structure",
    // },
    {
      text: "幻灯片",
      icon: "person-chalkboard",
      link: "https://ecosystem.vuejs.press/zh/plugins/markdown/revealjs/demo.html",
    },
  ],
});
