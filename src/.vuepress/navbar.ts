import { navbar } from "vuepress-theme-hope";

export default navbar([
  "/",
  "/java-core/",
  "/ssm/",
  "/distribute-system/",
  "/tools/",
  {
    text: "资源链接",
    icon:"link",
    children:[
      {
        text: "V2 文档",
        icon: "book",
        link: "https://theme-hope.vuejs.press/zh/",
      },
      {
        text:"图标库",
        icon:"file-image",
        link:"https://fontawesome.com/search?o=r&m=free"
      }
    ]
  },
]);
