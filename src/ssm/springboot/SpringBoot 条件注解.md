---
title: 条件注解：实现 SpringBoot 自动配置的关键
order: 40
category: SpringBoot
tag:
  - SpringBoot
  - 注解
---



## 1. 常见的条件注解



### @ConditionalOnProperty

用于根据配置文件中的属性值来决定是否创建 Bean



~~~java
@Configuration
public class OsConfiguration {

    /**
     * 当配置文件中 app.os.type=macos 时才创建这个 Bean
     * matchIfMissing = true 表示如果属性不存在，则条件为 true
     * havingValue 指定属性必须等于的值
     */
    @Bean
    @ConditionalOnProperty(prefix = "app.os",name="type",havingValue = "macos",matchIfMissing = true)
    public MacOs macOs() {

        return new MacOs();
    }

    /**
     * 根据条件创建LinuxOs bean
     * 该方法仅在配置属性'app.os.type'的值为'linux'时触发
     * @return LinuxOs实例
     */
    @Bean
    @ConditionalOnProperty(prefix = "app.os",name="type",havingValue = "linux")
    public LinuxOs linuxOs() {
        return new LinuxOs();
    }

}
~~~



1. 当 application.yml 配置文件中：

~~~yaml
app:
  os:
    type: linux
~~~

~~~java
        ConfigurableApplicationContext applicationContext = SpringApplication.run(SampleSpringbootApplication.class, args);

        LinuxOs linuxOs = applicationContext.getBean(LinuxOs.class);
        System.out.println("linuxOs = " + linuxOs);
~~~



输出结果：

~~~shell
linuxOs = com.van.boot.condition.LinuxOs@52bf7bf6
~~~



2. 当 application.yml 配置文件中：

~~~yaml
app:
  os:
    type: macos
~~~

~~~java
        MacOs macOs = applicationContext.getBean(MacOs.class);
        System.out.println("macOs = " + macOs);
~~~



输出结果：

~~~shell
macOs = com.van.boot.condition.MacOs@261db982
~~~



3. 当 application.yml 配置文件中不配置 `app.os.type`属性时，那么注解上设置 `matchIfMissing = true` 表示如果属性不存在，则条件为 true

因为macOs 方法上`@ConditionalOnProperty`设置了该属性值为 true，所以该注解生效

~~~java
    @Bean
    @ConditionalOnProperty(prefix = "app.os",name="type",havingValue = "macos",matchIfMissing = true)
    public MacOs macOs() {

        return new MacOs();
    }

~~~



### @ConditonalOnClass

当类路径下存在指定的类时，才会创建 Bean。这在处理可选依赖时特别有用。



::: tip 类路径（Classpath）的概念

类路径指的是 JVM 或 Java 编译器寻找类或其他资源文件的路径。它包括：

1. 当前项目的编译输出目录（例如 target/classes）
2. 项目依赖的所有 JAR 包（包括直接依赖和传递依赖）
3. JDK 的核心类库

:::



~~~java
@Configuration
public class SwaggerConfiguration {
    
    /**
     * 只有当项目中存在 OpenAPI 相关类时才创建 Swagger 配置
     * 这样可以让 Swagger 相关依赖变成可选的
     */
    @Bean
    @ConditionalOnClass(name = "io.swagger.v3.oas.models.OpenAPI")
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("API Documentation")
                        .version("1.0"));
    }
}
~~~



::: tip 使用建议

- 推荐：使用 name 属性（运行时检查） @ConditionalOnClass(name = "com.mysql.cj.jdbc.Driver") 
- 不推荐：直接使用类引用（编译时需要类） @ConditionalOnClass(com.mysql.cj.jdbc.Driver.class)

:::



### @ConditionalOnMissingBean

**当容器中不存在指定的 Bean 时才创建。这对于提供默认实现但允许用户覆盖很有用。**

~~~java
@Configuration
public class ServiceConfiguration {
    
    /**
     * 提供默认的用户服务实现
     * 只有当容器中没有 UserService 类型的 Bean 时才创建
     * 这允许其他模块提供自定义实现来覆盖默认行为
     */
    @Bean
    @ConditionalOnMissingBean
    public UserService defaultUserService() {
        return new DefaultUserService();
    }
    
    /**
     * 提供默认的缓存服务实现
     * 如果用户没有自定义实现，就使用这个默认实现
     */
    @Bean
    @ConditionalOnMissingBean(CacheService.class)
    public CacheService defaultCacheService() {
        return new SimpleCacheService();
    }
}
~~~



### @ConditionalOnExpression

使用 SpEL 表达式来决定是否创建 Bean

~~~java
@Configuration
public class MonitoringConfiguration {
    
    /**
     * 使用 SpEL 表达式组合多个条件
     * 当处于开发环境且启用了监控时才创建监控 Bean
     */
    @Bean
    @ConditionalOnExpression("${spring.profiles.active=='dev' and ${monitoring.enabled:true}}")
    public PerformanceMonitor performanceMonitor() {
        return new PerformanceMonitor();
    }
}
~~~





## 2. 如何实现自定义条件注解

SpringBoot 条件注解的实现是基于以下核心组件：

1. **Condition 接口：所有条件注解都会关联一个实现了Condition 接口的类**

~~~java
public interface Condition {
    boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata);
}
~~~



例如：@ConditionalOnProperty注解关联了OnPropertyCondition类  @ConditionalOnClass 注解关联了OnClassCondition类 等等

~~~java
@Retention(RetentionPolicy.RUNTIME)
@Target({ ElementType.TYPE, ElementType.METHOD })
@Documented
@Conditional(OnPropertyCondition.class)
public @interface ConditionalOnProperty {
  
}


@Target({ ElementType.TYPE, ElementType.METHOD })
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Conditional(OnClassCondition.class)
public @interface ConditionalOnClass {
  
}
~~~



2. ConditionContext：提供条件评估时需要的上下文信息



下面我们实现一个自定义条件注解：@ConditionalOnTimeRange

作用是：只在指定的时间范围内创建 Bean 

首先，我们创建一个自定义的条件注解

~~~java
/**
 * 自定义条件注解：只在指定的时间范围内创建 Bean
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Conditional(TimeRangeCondition.class)
public @interface ConditionalOnTimeRange {
    String start() default "09:00"; // 开始时间
    String end() default "18:00";   // 结束时间
}
~~~

根据前面知道，自定义条件注解需要关联一个实现了@Condition 接口的实现类

所以我们还创建一个实现类 TimeRangeCondition

~~~java
/**
 * 条件注解的具体实现类
 */
public class TimeRangeCondition implements Condition {
    
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        // 获取注解属性
        Map<String, Object> attributes = metadata.getAnnotationAttributes(
                ConditionalOnTimeRange.class.getName());
        
        String startTime = (String) attributes.get("start");
        String endTime = (String) attributes.get("end");
        
        // 获取当前时间
        LocalTime now = LocalTime.now();
        LocalTime start = LocalTime.parse(startTime);
        LocalTime end = LocalTime.parse(endTime);
        
        // 判断当前时间是否在范围内
        return !now.isBefore(start) && !now.isAfter(end);
    }
}
~~~



最后在配置类中使用

~~~java
@Configuration
public class WorkTimeConfiguration {
    
    /**
     * 只在工作时间内创建这个 Bean
     */
    @Bean
    @ConditionalOnTimeRange(start = "09:00", end = "18:00")
    public WorkTimeService workTimeService() {
        return new WorkTimeService();
    }
}
~~~



进行验证：

~~~java
String[] beanNamesForType = applicationContext.getBeanNamesForType(WorkTimeService.class);
for (String beanName : beanNamesForType) {
       System.out.println(beanName);
 }
~~~



::: tip 实现自定义条件注解功能的步骤有：

1. 创建自定义条件注解
2. 在该注解上添加@Conditional注解，并关联 Condition 接口实现类
3. 在该实现类实现具体条件逻辑
4. 在配置类中使用该自定义条件注解

:::



## 3. 条件注解的实现原理

理解条件注解的实现原理主要是要**知道 SpringBoot 条件注解的生效过程**，即 SpringBoot 是如何让它内置的条件注解以及我们自定义的条件注解生效的



**条件注解处理入口**：

- Spring 容器启动时，通过 ConfigurationClassPostProcessor 开始处理
- 扫描配置类时会检查条件注解

**核心组件**：

- Condition 接口：所有条件的顶层接口
- SpringBootCondition：Spring Boot 提供的条件基类
- 具体条件实现：如 OnClassCondition、OnBeanCondition 等
- ConditionContext：提供条件评估所需的上下文信息

**执行流程**：

- 首先获取所有条件注解
- 依次执行每个条件的 matches 方法
- 根据条件评估结果决定是否创建 Bean





### 条件注解处理流程图：

~~~mermaid
graph TD
    A[Spring容器启动] --> B[ConfigurationClassPostProcessor处理]
    B --> C[解析配置类]
    C --> D{是否有条件注解?}
    D -->|是| E[获取所有条件]
    D -->|否| F[直接注册Bean]
    E --> G[条件评估]
    G --> H{条件是否满足?}
    H -->|是| I[创建Bean]
    H -->|否| J[跳过Bean创建]
    
    subgraph 条件评估过程
    G --> G1[获取ConditionContext]
    G --> G2[获取注解元数据]
    G --> G3[执行matches方法]
    end
~~~



### 条件注解核心类图：

~~~mermaid
classDiagram
    class Condition {
        <<interface>>
        +matches(ConditionContext, AnnotatedTypeMetadata) boolean
    }
    class SpringBootCondition {
        <<abstract>>
        +getMatchOutcome(ConditionContext, AnnotatedTypeMetadata) ConditionOutcome
    }
    class OnClassCondition {
        +getMatchOutcome() ConditionOutcome
    }
    class OnBeanCondition {
        +getMatchOutcome() ConditionOutcome
    }
    class OnPropertyCondition {
        +getMatchOutcome() ConditionOutcome
    }
    class ConditionContext {
        <<interface>>
        +getRegistry() BeanDefinitionRegistry
        +getBeanFactory() ConfigurableListableBeanFactory
        +getEnvironment() Environment
        +getResourceLoader() ResourceLoader
        +getClassLoader() ClassLoader
    }

    Condition <|-- SpringBootCondition
    SpringBootCondition <|-- OnClassCondition
    SpringBootCondition <|-- OnBeanCondition
    SpringBootCondition <|-- OnPropertyCondition
~~~





### 条件注解执行时序图

~~~mermaid
sequenceDiagram
    participant SC as Spring Container
    participant CP as ConfigurationClassPostProcessor
    participant CE as ConditionEvaluator
    participant C as Condition
    
    SC->>CP: 启动处理
    CP->>CP: 扫描配置类
    CP->>CE: 评估条件
    CE->>CE: 获取所有条件注解
    loop 条件检查
        CE->>C: matches()
        C-->>CE: 返回结果
    end
    CE-->>CP: 返回评估结果
    alt 条件满足
        CP->>SC: 注册Bean定义
    else 条件不满足
        CP->>SC: 跳过Bean注册
    end
~~~







