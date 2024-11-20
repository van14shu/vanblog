---
title: SpringBoot 整合日志系统
order: 70
category:
  - SpringBoot
tag:
  - SpringBoot
  - 日志

---



## **SpringBoot怎么把日志默认配置好的**

SpringBoot 默认使用 Logback 作为日志框架的具体实现，使用 SLF4J 作为日志门面，实现了日志框架的解耦，并且提供开箱即用的默认配置

同时也支持对其他日志框架的配置和扩展使用

那么，SpringBoot 是怎么把日志默认配置好的？

1. 当我们引入某些 starter 场景启动器依赖时，例如`spring-boot-starter-web` 时，都会导入一个核心场景启动器`spring-boot-starter`
2. 核心场景引入了日志的所用功能`spring-boot-starter-logging`
3. 默认使用了`logback + slf4j `组合作为默认底层日志
4. 日志是系统一启动就要用，xxxAutoConfiguration 是系统启动好了以后放好的组件，后来用的。
5. **所以日志是利用监听器机制配置好的。ApplicationListener**
6. 日志所有的配置都可以通过修改配置文件实现。以logging开始的所有配置



<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411180427811.png" alt="img" style="zoom:60%;" />





## SpringBoot 常见日志配置



### 日志级别

1. 在application.properties/yaml中配置`logging.level.<logger-name>=<level>`指定日志级别
2. level可取值范围：TRACE, DEBUG, INFO, WARN, ERROR, FATAL, or OFF，定义在 LogLevel类中
3. root 的`logger-name`叫r oot，可以配置logging.level.root=warn，代表所有未指定日志级别都使用 root 的 warn 级别

~~~shell
logging.level.root=warn
logging.level.org.springframework.web=debug
logging.level.org.hibernate=error
~~~



### 日志分组



将相关的logger分组在一起，统一配置。SpringBoot 也支持。比如：Tomcat 相关的日志统一设置

~~~shell
logging.group.tomcat=org.apache.catalina,org.apache.coyote,org.apache.tomcat
logging.level.tomcat=trace
~~~

SpringBoot 预定义两个组

<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411180435344.png" alt="image-20241118043510293" style="zoom:50%;" />



### 文件输出

SpringBoot 默认只把日志写在控制台，如果想额外记录到文件，可以在application.properties中添加`logging.file.name`

一般不使用`logging.file.path` ，因为`logging.file.name` 即可以写文件名，也可以加指定路径



~~~shell
logging.file.name=logs/app.log
~~~





### 最佳实践

1. 导入任何第三方框架，先排除它的日志包，因为Boot底层控制好了日志
2. 修改 application.properties 配置文件，就可以调整日志的所有行为。如果不够，可以编写日志框架自己的配置文件放在类路径下就行，比如logback-spring.xml，log4j2-spring.xml
3. 如需对接专业日志系统，也只需要把 logback 记录的日志灌倒 kafka之类的中间件，这和SpringBoot没关系，都是日志框架自己的配置，修改配置文件即可



### logback-spring.xml 配置

~~~xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
Configuration 节点
scan：当此属性设置为true时，配置文件如果发生改变，将会被重新加载，默认值为true。
scanPeriod：设置监测配置文件是否有修改的时间间隔，默认单位是毫秒。当scan为true时，此属性生效。默认的时间间隔为1分钟。
debug：当此属性设置为true时，将打印出logback内部日志信息，实时查看logback运行状态。默认值为false。
-->
<configuration scan="true" scanPeriod="60 seconds" debug="false">
    <!-- 定义全局变量 -->
    <springProperty scope="context" name="APP_NAME" source="spring.application.name" defaultValue="logging-service"/>
    <springProperty scope="context" name="ACTIVE_PROFILE" source="spring.profiles.active" defaultValue="dev"/>

    <!-- 定义日志存放路径 -->
    <property name="LOG_PATH" value="logs/${APP_NAME}"/>
    <!-- 定义日志输出格式 -->
    <property name="CONSOLE_LOG_PATTERN"
              value="%red(%d{yyyy-MM-dd HH:mm:ss.SSS}) %green([%thread]) %highlight(%-5level) %boldMagenta(%logger{50}) %cyan(%X{X-B3-TraceId:-}) - %msg%n"/>
    <property name="FILE_LOG_PATTERN"
              value="%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{50} %X{X-B3-TraceId:-} - %msg%n"/>

    <!-- 控制台输出 -->
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>${CONSOLE_LOG_PATTERN}</pattern>
            <charset>UTF-8</charset>
        </encoder>
    </appender>

    <!-- 所有日志文件输出 -->
    <appender name="FILE_ALL" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <!-- 设置文件名 -->
        <file>${LOG_PATH}/all.log</file>
        <!-- 设置滚动策略 -->
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <!-- 日志文件输出的文件名:根据日期命名,如all.2023-12-31.0.log -->
            <fileNamePattern>${LOG_PATH}/all.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <!-- 单个日志文件最大大小 -->
            <maxFileSize>10MB</maxFileSize>
            <!-- 日志文件保留天数 -->
            <maxHistory>30</maxHistory>
            <!-- 所有日志文件的总大小上限 -->
            <totalSizeCap>10GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <pattern>${FILE_LOG_PATTERN}</pattern>
            <charset>UTF-8</charset>
        </encoder>
    </appender>

    <!-- 错误日志文件输出 -->
    <appender name="FILE_ERROR" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <!-- 只记录ERROR级别日志 -->
        <filter class="ch.qos.logback.classic.filter.ThresholdFilter">
            <level>ERROR</level>
        </filter>
        <file>${LOG_PATH}/error.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.SizeAndTimeBasedRollingPolicy">
            <fileNamePattern>${LOG_PATH}/error.%d{yyyy-MM-dd}.%i.log</fileNamePattern>
            <maxFileSize>10MB</maxFileSize>
            <maxHistory>30</maxHistory>
            <totalSizeCap>5GB</totalSizeCap>
        </rollingPolicy>
        <encoder>
            <pattern>${FILE_LOG_PATTERN}</pattern>
            <charset>UTF-8</charset>
        </encoder>
    </appender>

    <!-- 异步日志配置 -->
    <appender name="ASYNC_ALL" class="ch.qos.logback.classic.AsyncAppender">
        <!-- 不丢失日志，默认队列满了丢弃TRACE,DEBUG,INFO级别的日志 -->
        <discardingThreshold>0</discardingThreshold>
        <!-- 队列大小 -->
        <queueSize>1024</queueSize>
        <!-- 队列满时是否阻塞，默认为false -->
        <neverBlock>false</neverBlock>
        <!-- 引用前面定义的FILE_ALL appender -->
        <appender-ref ref="FILE_ALL"/>
    </appender>

    <appender name="ASYNC_ERROR" class="ch.qos.logback.classic.AsyncAppender">
        <discardingThreshold>0</discardingThreshold>
        <queueSize>512</queueSize>
        <appender-ref ref="FILE_ERROR"/>
    </appender>

    <!-- SQL日志配置 -->
    <logger name="org.hibernate.SQL" level="DEBUG" additivity="false">
        <appender-ref ref="CONSOLE"/>
    </logger>

    <!-- 开发环境配置 -->
    <springProfile name="dev">
        <!-- 应用程序包路径 -->
        <logger name="com.van.logging" level="DEBUG"/>
        <!-- 根日志级别 -->
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="ASYNC_ALL"/>
            <appender-ref ref="ASYNC_ERROR"/>
        </root>
    </springProfile>

    <!-- 测试环境配置 -->
    <springProfile name="test">
        <logger name="com.van.logging" level="INFO"/>
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="ASYNC_ALL"/>
            <appender-ref ref="ASYNC_ERROR"/>
        </root>
    </springProfile>

    <!-- 生产环境配置 -->
    <springProfile name="prod">
        <logger name="com.van.logging" level="INFO"/>
        <root level="WARN">
            <!-- 生产环境关闭控制台输出 -->
            <appender-ref ref="ASYNC_ALL"/>
            <appender-ref ref="ASYNC_ERROR"/>
        </root>
    </springProfile>

</configuration>
~~~





## 核心实现原理

首先我们看一张典型的日志系统架构图，可以看到：

1. 使用 SLF4J 作为日志门面，实现了日志框架的解耦，底层支持不同的具体日志框架
2. 自动配置：提供默认已经配置好的 `spring-boot-starter-logging`
3. 利用监听器机制实现日志系统的初始化



~~~mermaid
graph TD
    A[应用程序] --> B[SLF4J API]
    B --> C[LoggingSystem]
    C --> D[Logback]
    C --> E[Log4j2]
    C --> F[JUL]
    
    G[spring-boot-starter-logging] --> H[logback-classic]
    G --> I[log4j-to-slf4j]
    G --> J[jul-to-slf4j]
    
    K[LoggingApplicationListener] --> L[日志系统初始化]
    L --> M[加载配置文件]
    L --> N[设置日志级别]
    L --> O[注册关闭钩子]
~~~



简易实现步骤：

1. 日志系统自动配置类

~~~java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(LoggerContext.class)
public class LogbackAutoConfiguration {
    
    @Bean
    @ConditionalOnMissingBean(LoggingSystem.class)
    public LoggingSystem loggingSystem() {
        // 创建默认的 Logback 日志系统
        return new LogbackLoggingSystem(this.getClass().getClassLoader());
    }
}
~~~



2. *日志系统初始化监听器*

~~~java
ublic class LoggingApplicationListener implements ApplicationListener<ApplicationEvent> {
    
    @Override
    public void onApplicationEvent(ApplicationEvent event) {
        if (event instanceof ApplicationStartingEvent) {
            // 初始化阶段：配置日志系统
            onApplicationStartingEvent((ApplicationStartingEvent) event);
        }
        else if (event instanceof ApplicationEnvironmentPreparedEvent) {
            // 环境准备阶段：加载日志配置
            onApplicationEnvironmentPreparedEvent((ApplicationEnvironmentPreparedEvent) event);
        }
    }
    
    private void onApplicationStartingEvent(ApplicationStartingEvent event) {
        // 初始化日志系统
        LoggingSystem system = LoggingSystem.get(event.getSpringApplication().getClassLoader());
        // 设置初始化日志级别
        initializeEarlyLoggingLevel(system);
    }
    
    private void onApplicationEnvironmentPreparedEvent(ApplicationEnvironmentPreparedEvent event) {
        // 加载日志配置
        Environment environment = event.getEnvironment();
        // 设置日志配置路径
        systemProperties.put("logging.config", 
            environment.getProperty("logging.config", "classpath:logback-spring.xml"));
    }
}
~~~



3. 自定义日志配置

~~~java
@Configuration
public class CustomLoggingConfig {
    
    @Bean
    public LoggingSystemProperties loggingSystemProperties(Environment environment) {
        LoggingSystemProperties properties = new LoggingSystemProperties(environment);
        // 设置自定义日志属性
        properties.setPattern("%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread] %-5level %logger{50} - %msg%n");
        properties.setFile("logs/application.log");
        properties.setMaxFileSize("100MB");
        properties.setTotalSizeCAP("1GB");
        return properties;
    }
}
~~~





> 参考文章：
>
> https://www.pdai.tech/md/spring/springboot-data-logback.html
>
> https://cloud.tencent.com/developer/article/2322889
