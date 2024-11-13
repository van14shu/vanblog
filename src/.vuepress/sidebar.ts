import { sidebar } from "vuepress-theme-hope";

export default sidebar({
  "/": [
    // "",
    // "portfolio",
    {
      text: "JAVA",
      icon: "/java.svg",
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

  ],
});
