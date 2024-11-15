---
title: SpringBoot 是如何进行依赖管理的
order: 1
category:
  - SpringBoot
tag:
  - SpringBoot
  - Maven
---



首先 SpringBoot 的依赖管理是基于 Maven 的依赖传递原则，当依赖 A 中包含依赖 B且依赖 B 中包含依赖 C，那么依赖 A 就同时拥有依赖 B 和依赖 C



## 1. 基于 `spring-boot-starter-parent` 管理

当我们使用 SpringBoot 初始化器创建一个 SpringBoot 项目时，都会有一个父项目 `spring-boot-starter-parent`



~~~xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.5</version>
</parent>
~~~



这个父项目最重要的作用是：

- 提供了统一的 Java 版本配置（Java 17+）
- 提供了统一的源码编码格式（UTF-8）
- 提供了一组预定义的依赖版本（依赖管理）

<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411151125599.png" alt="image-20241115112521450" style="zoom:50%;" />





而 `spring-boot-starter-parent` 也有一个父项目 `spring-boot-dependencies`



~~~xml
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-dependencies</artifactId>
    <version>3.3.5</version>
  </parent>
~~~



它在 `<properties>` 中定义了几百个依赖的版本号，通过这种方式统一管理依赖版本，避免版本冲突

~~~xml
<properties>
    <mybatis.version>3.5.13</mybatis.version>
    <mysql.version>8.0.33</mysql.version>
    <jackson.version>2.15.3</jackson.version>
    ...
</properties>
~~~



而这个父项目 `spring-boot-dependencies` 也称之为 **SpringBoot 版本仲裁中心**，它把所有常见的jar的依赖版本都声明好了。例如：

~~~xml
<!-- 父项目中已经定义了 MySQL 驱动的版本 -->
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <!-- 无需指定版本，会自动使用父项目中定义的版本 -->
</dependency>
~~~



而如果需要**使用不同于 SpringBoot 默认的版本**，有两种方式：

1. 直接在依赖中指定版本号

   ~~~xml
   <dependency>
       <groupId>mysql</groupId>
       <artifactId>mysql-connector-java</artifactId>
       <version>5.1.49</version>
   </dependency>
   ~~~

   

2. 在当前项目的 properties 中覆盖版本属性

~~~xml
<properties>
    <mysql.version>5.1.49</mysql.version>
</properties>
~~~



**所以，SpringBoot 的依赖管理是基于父项目 `spring-boot-starter-parent`，而 `spring-boot-starter-parent`也有父项目 `spring-boot-dependencies`**

**它在 `<properties>` 中定义了几百个依赖的版本号，通过这种方式统一管理依赖版本，避免版本冲突。**



<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411151134960.png" alt="img" style="zoom:100%;" />





## 2. 基于 `dependencyManagement` 管理



什么时候不使用 parent：

- 项目需要继承其他父 POM（比如公司统一的父 POM）
- 需要更灵活的版本控制
- 需要完全控制项目的构建配置



当我们构建一个多模块项目时：

~~~xml
<!-- 父工程 parent-project/pom.xml -->
<project>
    <!-- 继承公司的父 POM -->
    <parent>
        <groupId>com.van</groupId>
        <artifactId>company-parent</artifactId>
        <version>1.0.0</version>
    </parent>
    
    <groupId>com.van</groupId>
    <artifactId>parent-project</artifactId>
    <version>1.0.0</version>
    <packaging>pom</packaging>
    
    <!-- SpringBoot 依赖管理 -->
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>3.2.0</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
            
            <!-- springcloud alibaba -->
            <dependency>
                <groupId>com.alibaba.cloud</groupId>
                <artifactId>spring-cloud-alibaba-dependencies</artifactId>
                <version>2022.0.0.0</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
    
    <!-- 公共插件管理 -->
    <build>
        <pluginManagement>
            <plugins>
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <version>3.2.0</version>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
~~~



比较一下使用和不使用 `spring-boot-starter-parent` 的区别：

使用 parent 方式：

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.0</version>
</parent>
```

使用 dependencyManagement 方式：

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-dependencies</artifactId>
            <version>3.2.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```



## 3. 基于多模块项目的最佳实践

假设以一个电商系统为例，包含多个模块

1. 首先是根项目的 POM（parent-project/pom.xml）：

~~~xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <!-- 基本信息 -->
    <groupId>com.van.mall</groupId>
    <artifactId>mall-parent</artifactId>
    <version>1.0.0-SNAPSHOT</version>
    <packaging>pom</packaging>
    <description>电商系统父工程</description>

    <!-- 统一管理版本号 -->
    <properties>
        <!-- 基础配置 -->
        <java.version>17</java.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.reporting.outputEncoding>UTF-8</project.reporting.outputEncoding>
        <maven.compiler.source>${java.version}</maven.compiler.source>
        <maven.compiler.target>${java.version}</maven.compiler.target>

        <!-- 核心依赖版本 -->
        <spring-boot.version>3.2.0</spring-boot.version>
        <spring-cloud.version>2023.0.0</spring-cloud.version>
        <spring-cloud-alibaba.version>2022.0.0.0</spring-cloud-alibaba.version>

        <!-- 数据库和缓存相关 -->
        <mysql.version>8.0.33</mysql.version>
        <mybatis-plus.version>3.5.4.1</mybatis-plus.version>
        <dynamic-datasource.version>4.2.0</dynamic-datasource.version>
        <redisson.version>3.24.3</redisson.version>

        <!-- 工具类 -->
        <hutool.version>5.8.23</hutool.version>
        <guava.version>32.1.3-jre</guava.version>
        <commons-lang3.version>3.13.0</commons-lang3.version>
        <mapstruct.version>1.5.5.Final</mapstruct.version>
        
        <!-- 接口文档 -->
        <knife4j.version>4.3.0</knife4j.version>
        
        <!-- 监控相关 -->
        <skywalking.version>8.16.0</skywalking.version>
        <prometheus.version>1.11.4</prometheus.version>
    </properties>

    <!-- 子模块管理 -->
    <modules>
        <module>mall-common</module>        <!-- 公共模块 -->
        <module>mall-api</module>           <!-- 接口模块 -->
        <module>mall-security</module>      <!-- 安全模块 -->
        <module>mall-user</module>          <!-- 用户服务 -->
        <module>mall-product</module>       <!-- 商品服务 -->
        <module>mall-order</module>         <!-- 订单服务 -->
        <module>mall-payment</module>       <!-- 支付服务 -->
        <module>mall-gateway</module>       <!-- 网关服务 -->
    </modules>

    <!-- 依赖管理 -->
    <dependencyManagement>
        <dependencies>
            <!-- Spring Boot 依赖 -->
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>

            <!-- Spring Cloud 依赖 -->
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>

            <!-- Spring Cloud Alibaba 依赖 -->
            <dependency>
                <groupId>com.alibaba.cloud</groupId>
                <artifactId>spring-cloud-alibaba-dependencies</artifactId>
                <version>${spring-cloud-alibaba.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>

            <!-- 数据库相关 -->
            <dependency>
                <groupId>com.mysql</groupId>
                <artifactId>mysql-connector-j</artifactId>
                <version>${mysql.version}</version>
            </dependency>
            <dependency>
                <groupId>com.baomidou</groupId>
                <artifactId>mybatis-plus-boot-starter</artifactId>
                <version>${mybatis-plus.version}</version>
            </dependency>
            <dependency>
                <groupId>com.baomidou</groupId>
                <artifactId>dynamic-datasource-spring-boot-starter</artifactId>
                <version>${dynamic-datasource.version}</version>
            </dependency>

            <!-- Redis 相关 -->
            <dependency>
                <groupId>org.redisson</groupId>
                <artifactId>redisson-spring-boot-starter</artifactId>
                <version>${redisson.version}</version>
            </dependency>

            <!-- 工具类 -->
            <dependency>
                <groupId>cn.hutool</groupId>
                <artifactId>hutool-all</artifactId>
                <version>${hutool.version}</version>
            </dependency>
            <dependency>
                <groupId>com.google.guava</groupId>
                <artifactId>guava</artifactId>
                <version>${guava.version}</version>
            </dependency>
            <dependency>
                <groupId>org.apache.commons</groupId>
                <artifactId>commons-lang3</artifactId>
                <version>${commons-lang3.version}</version>
            </dependency>
            <dependency>
                <groupId>org.mapstruct</groupId>
                <artifactId>mapstruct</artifactId>
                <version>${mapstruct.version}</version>
            </dependency>

            <!-- 接口文档 -->
            <dependency>
                <groupId>com.github.xiaoymin</groupId>
                <artifactId>knife4j-openapi3-spring-boot-starter</artifactId>
                <version>${knife4j.version}</version>
            </dependency>

            <!-- 内部模块依赖 -->
            <dependency>
                <groupId>${project.groupId}</groupId>
                <artifactId>mall-common</artifactId>
                <version>${project.version}</version>
            </dependency>
            <!-- 其他内部模块... -->
        </dependencies>
    </dependencyManagement>

    <!-- 公共依赖 -->
    <dependencies>
        <!-- 开发工具 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-devtools</artifactId>
            <scope>runtime</scope>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <!-- 测试依赖 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <!-- 多环境配置 -->
    <profiles>
        <profile>
            <id>dev</id>
            <properties>
                <env>dev</env>
                <nacos.addr>127.0.0.1:8848</nacos.addr>
            </properties>
            <activation>
                <activeByDefault>true</activeByDefault>
            </activation>
        </profile>
        <profile>
            <id>test</id>
            <properties>
                <env>test</env>
                <nacos.addr>test-nacos:8848</nacos.addr>
            </properties>
        </profile>
        <profile>
            <id>prod</id>
            <properties>
                <env>prod</env>
                <nacos.addr>prod-nacos:8848</nacos.addr>
            </properties>
        </profile>
    </profiles>

    <!-- 构建配置 -->
    <build>
        <pluginManagement>
            <plugins>
                <!-- Spring Boot Maven 插件 -->
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <version>${spring-boot.version}</version>
                    <configuration>
                        <excludes>
                            <exclude>
                                <groupId>org.projectlombok</groupId>
                                <artifactId>lombok</artifactId>
                            </exclude>
                        </excludes>
                    </configuration>
                </plugin>
                <!-- 编译插件 -->
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.11.0</version>
                    <configuration>
                        <source>${java.version}</source>
                        <target>${java.version}</target>
                        <encoding>UTF-8</encoding>
                        <!-- mapstruct 配置 -->
                        <annotationProcessorPaths>
                            <path>
                                <groupId>org.projectlombok</groupId>
                                <artifactId>lombok</artifactId>
                                <version>${lombok.version}</version>
                            </path>
                            <path>
                                <groupId>org.mapstruct</groupId>
                                <artifactId>mapstruct-processor</artifactId>
                                <version>${mapstruct.version}</version>
                            </path>
                        </annotationProcessorPaths>
                    </configuration>
                </plugin>
              	 <!-- 源码插件 -->
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-source-plugin</artifactId>
                    <version>3.3.0</version>
                </plugin>
            </plugins>
        </pluginManagement>
        
        <!-- 资源文件配置 -->
        <resources>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>true</filtering>
                <includes>
                    <include>application.yml</include>
                    <include>application-${env}.yml</include>
                    <include>bootstrap.yml</include>
                    <include>bootstrap-${env}.yml</include>
                </includes>
            </resource>
            <resource>
                <directory>src/main/resources</directory>
                <filtering>false</filtering>
                <excludes>
                    <exclude>application*.yml</exclude>
                    <exclude>bootstrap*.yml</exclude>
                </excludes>
            </resource>
        </resources>
    </build>

    <!-- 仓库配置 -->
    <repositories>
        <repository>
            <id>aliyun</id>
            <url>https://maven.aliyun.com/repository/public</url>
            <releases>
                <enabled>true</enabled>
            </releases>
            <snapshots>
                <enabled>false</enabled>
            </snapshots>
        </repository>
    </repositories>
</project>
~~~



2. 子模块商品服务模块的 POM 



~~~xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <artifactId>mall-parent</artifactId>
        <groupId>com.van.mall</groupId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>mall-product</artifactId>
    <description>商品服务模块</description>

    <dependencies>
        <!-- 内部依赖 -->
        <dependency>
            <groupId>${project.groupId}</groupId>
            <artifactId>mall-common</artifactId>
        </dependency>
        <dependency>
            <groupId>${project.groupId}</groupId>
            <artifactId>mall-api</artifactId>
        </dependency>

        <!-- Spring Boot 依赖 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <!-- Spring Cloud 依赖 -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
        </dependency>
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-openfeign</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-loadbalancer</artifactId>
        </dependency>

        <!-- 数据库相关 -->
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-boot-starter</artifactId>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>dynamic-datasource-spring-boot-starter</artifactId>
        </dependency>

        <!-- 缓存相关 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>org.redisson</groupId>
            <artifactId>redisson-spring-boot-starter</artifactId>
        </dependency>

     
        <!-- 工具类 -->
        <dependency>
            <groupId>cn.hutool</groupId>
            <artifactId>hutool-all</artifactId>
        </dependency>
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
        </dependency>
    </dependencies>

    <build>
        <finalName>${project.artifactId}</finalName>
        <plugins>
            <!-- Spring Boot 打包插件 -->
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <executions>
                    <execution>
                        <goals>
                            <goal>repackage</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
~~~



3. 公共模块（mall-common）的 POM 配置

~~~xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <parent>
        <artifactId>mall-parent</artifactId>
        <groupId>com.van.mall</groupId>
        <version>1.0.0-SNAPSHOT</version>
    </parent>
    <modelVersion>4.0.0</modelVersion>

    <artifactId>mall-common</artifactId>
    <description>公共工具模块</description>

    <dependencies>
        <!-- Web 相关 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- 工具类 -->
        <dependency>
            <groupId>cn.hutool</groupId>
            <artifactId>hutool-all</artifactId>
        </dependency>
        <dependency>
            <groupId>org.apache.commons</groupId>
            <artifactId>commons-lang3</artifactId>
        </dependency>
        <dependency>
            <groupId>com.google.guava</groupId>
            <artifactId>guava</artifactId>
        </dependency>

        <!-- JSON 处理 -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>

        <!-- 对象转换 -->
        <dependency>
            <groupId>org.mapstruct</groupId>
            <artifactId>mapstruct</artifactId>
        </dependency>
    </dependencies>
  
  	 <!-- 只配置必要的插件 -->
    <build>
        <plugins>
            <!-- 源码插件，便于调试 -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-source-plugin</artifactId>
                <executions>
                    <execution>
                        <id>attach-sources</id>
                        <phase>verify</phase>
                        <goals>
                            <goal>jar-no-fork</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</build>
~~~



## 4. 依赖中 optional 标记和provided scope 的区别



### optional 标记

`optional` 的作用是标记该依赖是可选的，主要用于避免依赖传递。

- **当项目 A 依赖项目 B，项目 B 依赖项目 C（optional=true），此时项目 A 不会自动依赖项目 C**

- **如果项目 A 需要使用项目 C，需要在项目 A 中显式声明对项目 C 的依赖**

**也就是说，该依赖对当前项目是可用的，依赖这个项目的其他项目如果需要这个依赖，需要显式声明**

~~~xml
<!-- mall-common 模块 -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <optional>true</optional>  <!-- 标记为可选依赖 -->
</dependency>

<!-- mall-product 模块 (依赖 mall-common) -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <!-- 需要显式声明依赖，因为 mall-common 中的是可选依赖 -->
</dependency>
~~~



### scope 标记

`scope` 用于控制依赖的使用范围，常见的值有：compile、provided、runtime、test。

1. **compile（默认值）**

- 编译、测试、运行阶段都有效

- 依赖会传递

- 会被打包到最终的 WAR/JAR 中

~~~xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
    <scope>compile</scope>  <!-- 默认值，可以省略 -->
</dependency>
~~~



2. provided

- **编译和测试阶段有效**

- **运行时由 JDK 或容器提供**

- **不会被打包到最终的 WAR/JAR 中**

~~~xml
<dependency>
    <groupId>javax.servlet</groupId>
    <artifactId>javax.servlet-api</artifactId>
    <scope>provided</scope>
</dependency>
~~~

3. runtime

- 测试和运行阶段有效

- 编译阶段不需要

- 会被打包到最终的 WAR/JAR 中

~~~xml
<dependency>
    <groupId>mysql</groupId>
    <artifactId>mysql-connector-java</artifactId>
    <scope>runtime</scope>
</dependency>
~~~

4. test

- 仅在测试阶段有效

- 不会被打包到最终的 WAR/JAR 中

~~~xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
~~~



| 特性           | optional=true | scope=provided   |
| -------------- | ------------- | ---------------- |
| 依赖传递       | 阻止传递      | 阻止传递         |
| 编译时有效     | 是            | 是               |
| 运行时有效     | 是            | 否（由容器提供） |
| 打包到最终制品 | 是            | 否               |



### provided 的使用场景

作用：

- **编译和测试阶段有效**

- **运行时由 JDK 或容器提供**

- **不会被打包到最终的 WAR/JAR 中**

所以，当 SpringBoot 应用打包时，

- 像 Lombok MapStruct 这类依赖只在编译时需要，运行时不需要的依赖就可以使用` <scope>provided</scope>`

- 而当我们打 WAR包进行部署时，外部 Tomcat 已提供运行环境，同时为了避免包冲突和重复，就需要移除 Springboot 内嵌的 Tomcat

~~~xml
<!-- 1. 编译时工具 -->
    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <scope>provided</scope>
    </dependency>
    
    <!-- MapStruct 注解处理器 -->
    <dependency>
        <groupId>org.mapstruct</groupId>
        <artifactId>mapstruct-processor</artifactId>
        <scope>provided</scope>
    </dependency>


<!-- 2. 运行环境已存在的依赖 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-tomcat</artifactId>
    <scope>provided</scope>
</dependency>
~~~



### optional=true 使用场景

场景：在自定义一个数据库的 Springboot Starter 给其他项目用时，我不知道别人用的数据库是 MySQL 还是 PostgreSQL，但是我在这个 starter 中，都需要引入这两个数据库的依赖，这就是一个典型的 `optional=true` 使用场景

自定义 starter 依赖配置：

~~~xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.van</groupId>
    <artifactId>my-db-spring-boot-starter</artifactId>
    <version>1.0.0</version>

    <properties>
        <java.version>17</java.version>
        <spring-boot.version>3.2.0</spring-boot.version>
    </properties>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>
        <!-- Spring Boot 自动配置 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-autoconfigure</artifactId>
        </dependency>
        
        <!-- 配置处理器 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-configuration-processor</artifactId>
            <optional>true</optional>
        </dependency>

        <!-- JDBC 支持 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-jdbc</artifactId>
        </dependency>

        <!-- 数据库驱动 -->
        <!-- MySQL 驱动 -->
    	<dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <optional>true</optional>  <!-- 标记为可选 -->
    	</dependency>
    
    		<!-- PostgreSQL 驱动 -->
    	<dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <optional>true</optional>  <!-- 标记为可选 -->
    	</dependency>

        <!-- 工具类 -->
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <scope>provided</scope>
        </dependency>
    </dependencies>
</project>
~~~



自动配置类：

~~~java
@Configuration
@ConditionalOnClass(DataSource.class)
@EnableConfigurationProperties(MyDbProperties.class)
public class MyDbAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public DataSource dataSource(MyDbProperties properties) {
        // 根据配置创建对应的数据源
        return createDataSource(properties);
    }

    private DataSource createDataSource(MyDbProperties properties) {
        String driverClassName = properties.getDriverClassName();
        // 根据驱动类名判断数据库类型
        if (driverClassName.contains("mysql")) {
            // MySQL 配置
            return createMySQLDataSource(properties);
        } else if (driverClassName.contains("postgresql")) {
            // PostgreSQL 配置
            return createPostgreSQLDataSource(properties);
        }
        throw new IllegalArgumentException("Unsupported database type");
    }
}
~~~



使用方的依赖配置：

~~~xml
<!-- 使用方的 pom.xml -->
<dependencies>
    <!-- 引入自定义 starter -->
    <dependency>
        <groupId>com.example</groupId>
        <artifactId>my-db-spring-boot-starter</artifactId>
        <version>1.0.0</version>
    </dependency>
    
    <!-- 明确声明需要使用的数据库驱动 -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
    </dependency>
</dependencies>
~~~



