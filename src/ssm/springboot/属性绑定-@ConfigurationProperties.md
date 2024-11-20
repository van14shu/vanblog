---
title: 属性绑定-@ConfigurationProperties
order: 50
category:
  - SpringBoot
tag:
  - SpringBoot
---



## 属性绑定的使用

什么是 SpringBoot 的属性绑定：就是将配置文件（如 application.properties/yml）中的配置项自动映射到 Java 对象中。从而简化了配置管理。



yaml文件的配置项：

~~~yaml
database:
  mysql:
    host: localhost
    port: 3306
    username: root
    password: 123456
    connections:
      - name: master
        poolSize: 10
      - name: slave
        poolSize: 5
    settings:
      timeout: 5000
      enableSsl: true
~~~



xxxProperties 属性类定义：

~~~java
@ConfigurationProperties(prefix = "database.mysql")
@Component
@Data
public class DatabaseProperties {
    private String host;
    private int port;
    private String username;
    private String password;
    private List<ConnectionConfig> connections;
    private Settings settings;


    // 内部类 - 连接配置
    @Data
    public static class ConnectionConfig {
        private String name;
        private int poolSize;
    }

    // 内部类 - 设置
    @Data
    public static class Settings {
        private long timeout;
        private boolean enableSsl;
    }

}
~~~



配置属性元数据：这会生成 JSON 元数据，提供 IDE 提示

~~~xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-configuration-processor</artifactId>
    <optional>true</optional>
</dependency>
~~~





使用属性类：**使用构造注入的方式而非字段注入**

~~~java
@Service
public class DatabaseService {

    private final DatabaseProperties dbProperties;

    @Autowired // 构造函数注入（在 Spring 4.3+ 中，如果只有一个构造函数，@Autowired 可以省略）
    public DatabaseService(DatabaseProperties dbProperties) {
        this.dbProperties = dbProperties;
    }

    public void printDatabaseInfo(){

        String host = dbProperties.getHost();
        int port = dbProperties.getPort();

        List<DatabaseProperties.ConnectionConfig> connections = dbProperties.getConnections();
        DatabaseProperties.ConnectionConfig masterConfig = connections.get(0);
        int masterPoolSize = masterConfig.getPoolSize();
        long timeout = dbProperties.getSettings().getTimeout();

        System.out.println(dbProperties);
    }
}
~~~



## 为什么使用属性类的时候采用构造注入而非字段注入



**简而言之，就是为了代码的健壮性**



### 字段注入 vs 构造注入



字段注入：

~~~java
@Service
public class DatabaseService {


    @Autowired
    private DatabaseProperties dbProperties;

//    private final DatabaseProperties dbProperties;
//
////    @Autowired
//    public DatabaseService(DatabaseProperties dbProperties) {
//        this.dbProperties = dbProperties;
//    }

    public void printDatabaseInfo(){

        String host = dbProperties.getHost();
        int port = dbProperties.getPort();

        // 获取主从连接配置
        List<DatabaseProperties.ConnectionConfig> connections = dbProperties.getConnections();
        DatabaseProperties.ConnectionConfig masterConfig = connections.get(0);
        int masterPoolSize = masterConfig.getPoolSize();

        // 获取其他设置
        long timeout = dbProperties.getSettings().getTimeout();


        System.out.println(dbProperties);
    }
}
~~~



构造注入：

~~~java
@Service
public class DatabaseService {

    private final DatabaseProperties dbProperties;

    //    @Autowired 构造函数注入（在 Spring 4.3+ 中，如果只有一个构造函数，@Autowired 可以省略）
    public DatabaseService(DatabaseProperties dbProperties) {
        this.dbProperties = dbProperties;
    }

    public void printDatabaseInfo() {

        String host = dbProperties.getHost();
        int port = dbProperties.getPort();

        // 获取主从连接配置
        List<DatabaseProperties.ConnectionConfig> connections = dbProperties.getConnections();
        DatabaseProperties.ConnectionConfig masterConfig = connections.get(0);
        int masterPoolSize = masterConfig.getPoolSize();

        // 获取其他设置
        long timeout = dbProperties.getSettings().getTimeout();


        System.out.println(dbProperties);
    }
}
~~~



### *使用 @RequiredArgsConstructor（Lombok）简化构造注入*



**添加 @RequiredArgsConstructor ，*Lombok 会为所有 final 字段生成构造函数***



~~~java
@Service
@RequiredArgsConstructor // Lombok 会为所有 final 字段生成构造函数
public class DatabaseService {

    private final DatabaseProperties dbProperties;

    //    @Autowired
//    public DatabaseService(DatabaseProperties dbProperties) {
//        this.dbProperties = dbProperties;
//    }

    public void printDatabaseInfo() {

        String host = dbProperties.getHost();
        int port = dbProperties.getPort();

        // 获取主从连接配置
        List<DatabaseProperties.ConnectionConfig> connections = dbProperties.getConnections();
        DatabaseProperties.ConnectionConfig masterConfig = connections.get(0);
        int masterPoolSize = masterConfig.getPoolSize();

        // 获取其他设置
        long timeout = dbProperties.getSettings().getTimeout();


        System.out.println(dbProperties);
    }
}
~~~



### 为什么使用构造注入

**不变性保证**：

- **使用 `final` 字段**
- 确保依赖不会被修改
- **线程安全**

**依赖明确**：

- **清楚地知道类需要什么依赖**
- 避免循环依赖
- 容易发现设计问题

**测试友好**：

- 易于进行单元测试
- 可以轻松模拟依赖
- 构造函数参数清晰表明依赖关系

**强制依赖**：

- **必要的依赖无法被忽略**
- 编译时检查
- 避免 `NullPointerException`



### 字段注入的问题

**隐藏依赖**：

- 无法从外部看出类的依赖
- 可能导致过多依赖

**不可变性**：

- 无法使用 `final` 修饰
- 可能在运行时被修改

**测试困难**：

- 需要反射注入依赖
- 测试代码复杂

**容器耦合**：

- 强依赖于 IoC 容器
- 无法在容器外使用



## SpringBoot 是如何实现属性绑定的

### 属性绑定流程图：





~~~mermaid
graph TB
    A[SpringBoot 启动] --> B[创建 ApplicationContext]
    B --> C[ConfigurationClassPostProcessor 处理配置类]
    C --> D[识别 @ConfigurationProperties]
    
    D --> E[ConfigurationPropertiesBindingPostProcessor]
    E --> F[Binder.get&#40;environment&#41;]
    
    F --> G[属性源解析]
    G --> H1[解析 application.properties]
    G --> H2[解析 application.yml]
    G --> H3[解析环境变量]
    G --> H4[解析命令行参数]
    
    H1 --> I[Binder 绑定过程]
    H2 --> I
    H3 --> I
    H4 --> I
    
    I --> J[类型转换]
    J --> K[属性值设置]
    K --> L[校验&#40;如果有@Validated&#41;]
    
    style A fill:#f9f,stroke:#333,stroke-width:4px
    style E fill:#bbf,stroke:#333,stroke-width:2px
    style I fill:#bfb,stroke:#333,stroke-width:2px
~~~





### 绑定过程时序图：

~~~mermaid
sequenceDiagram
    participant App as SpringApplication
    participant Context as ApplicationContext
    participant Processor as ConfigPropertyProcessor
    participant Binder as Binder
    participant Converter as ConversionService
    
    App->>Context: 1. 启动应用
    Context->>Processor: 2. 处理@ConfigurationProperties
    Processor->>Binder: 3. 创建 Binder 实例
    
    Note over Binder: 4. 开始绑定过程
    
    Binder->>Binder: 5. 获取属性源
    Binder->>Converter: 6. 请求类型转换
    Converter-->>Binder: 7. 返回转换后的值
    
    Note over Binder: 8. 处理松散绑定
    
    Binder->>Binder: 9. 验证属性值
    Binder-->>Processor: 10. 返回绑定结果
    
    Note over Processor: 11. 处理验证注解
    
    Processor-->>Context: 12. 注册绑定后的Bean
~~~







