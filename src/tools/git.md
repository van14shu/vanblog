---
title: Git 分支管理策略和工作流程
---
我来修改一下看看
我来修改一下再看看
我来解释一下分支管理策略和工作流程：

::: danger 请你扮演一名阿里云的 ACP 资深专家，并且也精通 Java 开发，下面我会通过图片来给你阿里云 ACP 的教学大纲和具体内容，请根据教学大纲来为我制定学习详细内容以及辅助
:::

::: tip 这是一则或许对你有用的小广告
- 面试专版：准备 Java 面试的小伙伴可以考虑面试专版：《Java面试指北》(质量非常高，专为面试打造，配合 JavaGuide 食用效果最佳)。
- 知识星球：技术专栏/一对一提问/简历修改/求职指南/面试打卡/不定时福利，欢迎加入 JavaGuide 官方知识星球。
:::

::: tip 测试一下这个容器
- 这是目标 1
- 这是目标 2
:::


测试一下 Java 代码：

~~~java
@Configuration(proxyBeanMethods = false)

// spring.aop.auto=true时开启AOP，或者没有配置spring.aop.auto时默认也是开启
@ConditionalOnProperty(prefix = "spring.aop", name = "auto", havingValue = "true", matchIfMissing = true)
public class AopAutoConfiguration {

    @Configuration(proxyBeanMethods = false)
    @ConditionalOnClass(Advice.class)
    static class AspectJAutoProxyingConfiguration {

        @Configuration(proxyBeanMethods = false)
        // 开启AOP的注解，使用JDK动态代理
        @EnableAspectJAutoProxy(proxyTargetClass = false)
        // spring.aop.proxy-target-class=false时才生效
        @ConditionalOnProperty(prefix = "spring.aop", name = "proxy-target-class", havingValue = "false")
        static class JdkDynamicAutoProxyConfiguration {

        }

        
        @Configuration(proxyBeanMethods = false)
        // 开启AOP的注解，使用CGLIB动态代理
        @EnableAspectJAutoProxy(proxyTargetClass = true)
        // spring.aop.proxy-target-class=true时生效，或者没有配置spring.aop.proxy-target-class时默认也生效
        @ConditionalOnProperty(prefix = "spring.aop", name = "proxy-target-class", havingValue = "true",
                matchIfMissing = true)
        static class CglibAutoProxyConfiguration {

        }

    }

    @Configuration(proxyBeanMethods = false)
    // 没有aspectj的依赖，但是又要使用cglib动态代理
    @ConditionalOnMissingClass("org.aspectj.weaver.Advice")
    @ConditionalOnProperty(prefix = "spring.aop", name = "proxy-target-class", havingValue = "true",
            matchIfMissing = true)
    static class ClassProxyingConfiguration {

        @Bean
        static BeanFactoryPostProcessor forceAutoProxyCreatorToUseClassProxying() {
            return (beanFactory) -> {
                if (beanFactory instanceof BeanDefinitionRegistry) {
                    BeanDefinitionRegistry registry = (BeanDefinitionRegistry) beanFactory;
                    // 注册InfrastructureAdvisorAutoProxyCreator从而开启Spring AOP
                    // @EnableAspectJAutoProxy会注册AnnotationAwareAspectJAutoProxyCreator，也会开启Spring AOP但是同时有用解析AspectJ注解的功能
                    AopConfigUtils.registerAutoProxyCreatorIfNecessary(registry);
                    AopConfigUtils.forceAutoProxyCreatorToUseClassProxying(registry);
                }
            };
        }

    }

}

~~~



1. **同步到 main 分支**

```bash
# 切换到 main 分支
git checkout main

# 合并 gh-pages 分支的更改到 main
git merge gh-pages

# 推送到远程 main 分支
git push origin main
```

2. **日常开发流程建议**

建议采用以下工作流程：

A. **在 main 分支进行开发**

```bash
# 确保在 main 分支
git checkout main

# 拉取最新代码
git pull origin main

# 进行开发，然后提交
git add .
git commit -m "你的提交信息"

# 推送到远程 main
git push origin main
```

B. **更新部署（gh-pages）分支**

```bash
# 切换到 gh-pages 分支
git checkout gh-pages

# 合并 main 的更改
git merge main

# 推送到远程 gh-pages
git push origin gh-pages
```

3. **分支管理策略**

```plaintext
main 分支（主分支）
  ├── 日常开发
  ├── 存放最新代码
  └── 保持与 gh-pages 同步

gh-pages 分支（部署分支）
  ├── 用于网站部署
  ├── 从 main 分支合并更新
  └── 保持与线上部署版本一致
```

4. **建议的工作流程**

- 所有新功能开发和修改都在 `main` 分支进行
- 完成开发并测试无误后，将更改合并到 `gh-pages` 分支
- `gh-pages` 分支专门用于部署，不直接在上面开发
- 定期将 `main` 分支的更改同步到 `gh-pages`

5. **一些有用的命令**

```bash
# 查看当前分支
git branch

# 查看所有分支（包括远程）
git branch -a

# 切换分支
git checkout <分支名>

# 创建并切换到新分支
git checkout -b <新分支名>

# 查看分支状态
git status
```

6. **注意事项**

- 每次开发前先拉取最新代码
- 确保在正确的分支上工作
- 定期将 `main` 的更改同步到 `gh-pages`
- 保持良好的提交信息习惯
- 如果有配置文件的改动，注意是否需要同步到两个分支

这样的工作流程可以帮助你：

- 保持代码版本的清晰性
- 方便管理开发和部署版本
- 降低出错的风险
- 便于回滚和维护

