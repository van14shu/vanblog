---
title: SpringBoot 可执行 jar 的打包问题
order: 20
category:
  - SpringBoot
tag:
  - SpringBoot
  - Maven
---



## 单系统打包问题

在 SpringBoot 项目中，如果继承了 `spring-boot-starter-parent`，它已经默认配置了 `spring-boot-maven-plugin` 并启用了 `repackage` 功能。

**所以，当前的项目也自动获得 `repackage` 功能，而在多模块系统使用 `dependencyManagement` 管理的项目，需要手动配置 `repackage`**



spring-boot-starter-parent 的默认配置

~~~xml
<!-- spring-boot-starter-parent/pom.xml -->
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
            <executions>
                <execution>
                    <id>repackage</id>
                    <goals>
                        <goal>repackage</goal>
                    </goals>
                </execution>
            </executions>
            <configuration>
                <mainClass>${start-class}</mainClass>
            </configuration>
        </plugin>
    </plugins>
</build>
~~~







## 多模块系统打包规范

在一个电商多模块系统中，一般像商品模块、订单模块等进行打包时都是需要打包成的 jar 是可执行文件，即可以通过 `java -jar xxx.jar` 运行

而像公共模块以及 API 模块进行打包时，是不需要打包为可执行的 jar 文件



A. 可执行 jar（product 模块）：

- 需要配置 spring-boot-maven-plugin
- 需要配置 repackage goal
- 需要指定 mainClass（如果有多个主类）

B. 非可执行 jar（common/api 模块）：

- 不需要 spring-boot-maven-plugin
- 建议打包源码（使用 maven-source-plugin）
- 使用基础的 maven-compiler-plugin 即可



## 为什么可执行 jar 需要配置`repackage`功能

Maven 默认打包生成的 jar 是无法直接运行的，因为：

- 依赖的 jar 包不会被包含在最终的 jar 包中

- `MANIFEST.MF` 文件缺少必要的信息（如 Main-Class、Class-Path 等）

  

**`repackage` 是将普通 jar 转换为可执行 jar 的关键**



**打包过程详解**：

1. **Maven 默认打包**：

```shell
mvn package
```

- 生成普通的 jar 包
- 只包含项目的类文件
- 不包含依赖

2. **Spring Boot 重新打包**：

```shell
# repackage 目标会在 Maven 默认打包后执行
mvn spring-boot:repackage
```

- 将原始 jar 重命名为 *.original
- 创建可执行的 fat jar
- 包含所有依赖
- 添加 Spring Boot 启动相关类



~~~xml
原始jar包结构：
mall-order.jar
├── com/
│   └── van/
│       └── mall/
│           └── order/
│               └── *.class
└── META-INF/
    └── MANIFEST.MF

重新打包后的结构：
mall-order.jar
├── BOOT-INF/
│   ├── classes/
│   │   └── com/
│   │       └── van/
│   │           └── mall/
│   │               └── order/
│   │                   └── *.class
│   └── lib/
│       ├── spring-boot-2.x.x.jar
│       ├── spring-core-5.x.x.jar
│       └── 其他依赖jar包
├── META-INF/
│   ├── MANIFEST.MF
│   └── maven/
└── org/
    └── springframework/
        └── boot/
            └── loader/
                └── *.class
~~~

**MANIFEST.MF 内容示例**：

~~~
Manifest-Version: 1.0
Implementation-Title: mall-order
Implementation-Version: 1.0.0-SNAPSHOT
Start-Class: com.van.mall.order.OrderApplication
Spring-Boot-Classes: BOOT-INF/classes/
Spring-Boot-Lib: BOOT-INF/lib/
Spring-Boot-Version: 3.2.0
Main-Class: org.springframework.boot.loader.JarLauncher
~~~





## 父 POM 配置

~~~xml
<project>
    <!-- 1. 统一版本管理 -->
    <properties>
        <spring-boot.version>3.2.0</spring-boot.version>
        <java.version>17</java.version>
        <!-- 其他版本属性... -->
    </properties>

    <!-- 2. 依赖管理 -->
    <dependencyManagement>
        <dependencies>
            <!-- Spring Boot 依赖管理 -->
            <dependency>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-dependencies</artifactId>
                <version>${spring-boot.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <!-- 3. 插件管理 -->
    <build>
        <pluginManagement>
            <plugins>
                <!-- 编译插件 -->
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-compiler-plugin</artifactId>
                    <version>3.11.0</version>
                    <configuration>
                        <source>${java.version}</source>
                        <target>${java.version}</target>
                        <encoding>UTF-8</encoding>
                    </configuration>
                </plugin>

                <!-- Spring Boot 插件 -->
                <plugin>
                    <groupId>org.springframework.boot</groupId>
                    <artifactId>spring-boot-maven-plugin</artifactId>
                    <version>${spring-boot.version}</version>
                </plugin>

                <!-- 源码插件 -->
                <plugin>
                    <groupId>org.apache.maven.plugins</groupId>
                    <artifactId>maven-source-plugin</artifactId>
                    <version>3.3.0</version>
                </plugin>
            </plugins>
        </pluginManagement>
    </build>
</project>
~~~





## 非可执行模块（如 common、api 模块）

~~~xml
<project>
    <!-- 1. 将大部分依赖标记为 optional -->
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>

    <!-- 2. 只配置必要的插件 -->
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
</project>
~~~





## 可执行模块（如 product 模块）

~~~xml
<project>
    <!-- 1. 正常引入依赖 -->
    <dependencies>
        <!-- 内部模块依赖 -->
        <dependency>
            <groupId>${project.groupId}</groupId>
            <artifactId>common</artifactId>
        </dependency>

        <!-- Spring Boot 依赖 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
    </dependencies>

    <!-- 2. 配置打包插件 -->
    <build>
        <finalName>${project.artifactId}</finalName>
        <plugins>
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



## 总结

- 在父 POM 使用 pluginManagement 统一管理插件
- 子模块按需配置特定插件
- 可执行模块配置 spring-boot-maven-plugin
- 非可执行模块使用基础插件