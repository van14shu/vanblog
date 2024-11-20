---
title: 属性绑定-@EnableConfigurationProperties
order: 60
category:
  - SpringBoot
tag:
  - SpringBoot
---



## 关于@EnableConfigurationProperties 的常见使用场景

`@EnableConfigurationProperties` 注解是配合 `@ConfigurationProperties` 使用的，但是我们知道，在属性类上使用`@ConfigurationProperties仅仅只是进行属性绑定的第一步，此时配置文件中的值还没有和属性类绑定生效，而生效的条件是需要将`@ConfigurationProperties`标注的属性类加入到 Spring 的容器中

- 其中一种用法就是在`@ConfigurationProperties`注解的属性类上加上`@Component` 注解就能将其注册为 Bean
- 那么为什么还要提供另一种用法： 在`@EnableConfigurationProperties`中添加被`@ConfigurationProperties`标注的属性类，将其注入到 Spring 容器中？
- **场景：SpringBoot 默认只扫描自己主程序所在的包。如果导入第三方包，即使组件上标注了 @Component、@ConfigurationProperties 注解，也没用。因为组件都扫描不进来，此时使用这个注解就可以快速进行属性绑定并把组件注册进容器**

所以，使用`@EnableConfigurationProperties` 常用于集成第三方库或者自定义 starter 开发，并且不依赖于主程序的组件扫描机制



~~~mermaid
flowchart TB
    subgraph Component["@Component 使用场景"]
        C1[应用内部配置]
        C2[简单配置管理]
        C3[依赖组件扫描]
        C4[与其他Spring注解配合]
    end
    
    subgraph Enable["@EnableConfigurationProperties 使用场景"]
        E1[自定义starter开发]
        E2[第三方库集成]
        E3[条件化配置]
        E4[模块化配置]
        E5[不依赖组件扫描]
    end
    
    UseCase[配置类使用] --> Choice{选择注册方式}
    Choice -->|应用内部| Component
    Choice -->|外部模块| Enable
    
    style UseCase fill:#f9f,stroke:#333
    style Choice fill:#ff9,stroke:#333
    style Component fill:#9f9,stroke:#333
    style Enable fill:#99f,stroke:#333
~~~



## 使用案例：

### 1. appplication.yml 配置

~~~yaml
app:
  email:
    host: smtp.qq.com
    port: 587
    from: 1223@qq.com
    retry-config:
      max-attempts: 3
      retry-interval: 2000
~~~



### 2. 定义配置属性类

~~~java
@ConfigurationProperties(prefix = "app.email")
@Validated  // 可以添加校验
public class EmailProperties {
    
    /**
     * SMTP服务器地址
     */
    @NotEmpty
    private String host;
    
    /**
     * SMTP服务器端口
     */
    @Range(min = 1, max = 65535)
    private int port = 25; // 提供默认值
    
    /**
     * 发件人邮箱
     */
    @Email
    private String from;
    
    /**
     * 重试配置
     */
    private RetryConfig retryConfig = new RetryConfig();
    
    // getter/setter 省略
    
    /**
     * 内部静态类，用于嵌套配置
     */
    public static class RetryConfig {
        private int maxAttempts = 3;
        private long retryInterval = 1000;
        // getter/setter 省略
    }
}
~~~



### 3. 配置类：创建配置类来启用属性绑定

~~~java
@Configuration
@EnableConfigurationProperties(EmailProperties.class)
@RequiredArgsConstructor //使用构造函数的方式注入
public class EmailConfiguration {
    
    private final EmailProperties emailProperties;
    
    @Bean
    public EmailService emailService() {
        return new EmailService(emailProperties);
    }
}
~~~



### 4. 使用配置的服务类

~~~java
@Service
@Slf4j
public class EmailService {
    
    private final EmailProperties properties;
    
    public EmailService(EmailProperties properties) {
        this.properties = properties;
    }
    
    public void sendEmail(String to, String subject, String content) {
        log.info("Sending email using configuration: host={}, port={}", 
                properties.getHost(), properties.getPort());
        // 实现发送邮件逻辑
    }
}
~~~





## @EnableConfigurationProperties 注解的原理





~~~mermaid
flowchart TB
    %% 主流程节点
    Start([SpringBoot 启动]) --> ParseConfig[处理 @Configuration 类]
    ParseConfig --> FindEnable{发现 @EnableConfigurationProperties?}
    FindEnable -->|Yes| CallRegistrar[调用 EnableConfigurationPropertiesRegistrar]
    
    %% Registrar 处理流程
    subgraph Registrar [EnableConfigurationPropertiesRegistrar 处理流程]
        CallRegistrar --> RegInfra[注册基础设施组件]
        
        %% 基础设施注册子流程
        subgraph Infrastructure [基础设施注册]
            RegInfra --> RegProcessor[注册 ConfigurationPropertiesBindingPostProcessor]
            RegInfra --> RegBound[注册 BoundConfigurationProperties]
        end
        
        RegInfra --> RegFilter[注册方法校验过滤器<br>MethodValidationExcludeFilter]
        RegFilter --> GetTypes[获取配置类<br>解析 @EnableConfigurationProperties 的 value]
        GetTypes --> RegBean[注册配置属性 Bean]
    end
    
    %% Bean 初始化和属性绑定流程
    subgraph Binding [属性绑定流程]
        RegBean --> InitBean[Bean 初始化]
        InitBean --> BindProps[属性绑定]
        BindProps --> Validate{需要验证?}
        Validate -->|Yes| DoValidate[执行属性验证]
        Validate -->|No| Complete
        DoValidate --> Complete[绑定完成]
    end
    
    %% 处理器工作流程
    subgraph Processor [ConfigurationPropertiesBindingPostProcessor 工作流程]
        BindProps --> FindAnnotation{查找 @ConfigurationProperties}
        FindAnnotation -->|Found| CreateBinder[创建 Binder]
        CreateBinder --> ExecuteBind[执行绑定操作]
        ExecuteBind --> HandleResult{处理结果}
        HandleResult -->|Success| BindSuccess[绑定成功]
        HandleResult -->|Error| HandleError[处理异常]
    end
    
    %% 样式设置
    classDef processNode fill:#e1f5fe,stroke:#01579b
    classDef decisionNode fill:#fff3e0,stroke:#e65100
    classDef infrastructureNode fill:#e8f5e9,stroke:#1b5e20
    classDef bindingNode fill:#f3e5f5,stroke:#4a148c
    classDef startEndNode fill:#ee6e73,stroke:#7f0000,color:#fff
    
    %% 应用样式
    class Start startEndNode
    class FindEnable,Validate,HandleResult,FindAnnotation decisionNode
    class RegInfra,RegProcessor,RegBound,RegFilter,RegBean infrastructureNode
    class BindProps,CreateBinder,ExecuteBind,BindSuccess bindingNode
    class ParseConfig,CallRegistrar,GetTypes processNode
~~~



