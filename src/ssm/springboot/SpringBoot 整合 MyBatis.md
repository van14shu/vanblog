---
title: SpringBoot 整合 MyBatis 原理
order: 91
category:
  - SpringBoot
  - MyBatis
---



## 整合MyBatis实战



### 1. 引入相关依赖

~~~xml
 <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <dependency>
            <groupId>mysql</groupId>
            <artifactId>mysql-connector-java</artifactId>
            <version>8.0.33</version>
        </dependency>

        <dependency>
            <groupId>org.mybatis.spring.boot</groupId>
            <artifactId>mybatis-spring-boot-starter</artifactId>
            <version>3.0.3</version>
        </dependency>
~~~





### **2. 配置数据源**

~~~yaml
spring:
  # 配置数据源
  datasource:
    url: jdbc:mysql://192.168.117.117:3306/test?useUnicode=true&characterEncoding=utf-8&serverTimezone=Asia/Shanghai
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: 666666
    type: com.zaxxer.hikari.HikariDataSource
~~~





### 3. 配置MyBatis

~~~yaml
mybatis:
  #指定mapper映射文件位置
  mapper-locations: classpath:mapper/*.xml

  configuration:
    # 开启驼峰命名转换
    map-underscore-to-camel-case: true
    # 开启 SQL 日志
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
~~~



### 4. CRUD编写

1. 编写Bean

~~~java
@Data
public class Account {

    private Integer id;

    private String name;

    private Integer balance;

    private Integer version;
}
~~~





2. 编写Mapper

~~~java
public interface AccountMapper {

    Account getAccountById(@Param("id") Integer id);

}
~~~



3. 使用mybatisx插件，快速生成MapperXML

   ~~~xml
   <?xml version="1.0" encoding="UTF-8" ?>
   <!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd" >
   <mapper namespace="com.van.mybatis.mapper.AccountMapper">
   
   
       <select id="getAccountById" resultType="com.van.mybatis.entity.Account">
           select * from account where id = #{id}
       </select>
   
   </mapper>
   ~~~





4. ✅**添加包扫描注解：`@MapperScan("com.van.mybatis.mapper")`**



~~~java
@SpringBootApplication
@MapperScan("com.van.mybatis.mapper")
public class MyBatisApplication {

    public static void main(String[] args) {

        SpringApplication.run(MyBatisApplication.class, args);
    }
}
~~~





5. 测试CRUD

~~~java
@RestController
public class AccountController {

    @Autowired
    private AccountMapper accountMapper;

    @GetMapping("/user/{id}")
    public Account getAccount(@PathVariable("id") Integer id){
        return accountMapper.getAccountById(id);
    }
    
}
~~~





<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411201104207.png" alt="image-20241120110427114" style="zoom:50%;" />





::: tip MyBatis 整合总结

1. 导入 `mybatis-spring-boot-starter`
2. 配置数据源信息
3. 配置`mybatis`的`mapper`接口扫描与`xml`映射文件扫描
4. 编写`bean，mapper`，生成`xml`，编写 `sql` 进行`crud`
5. 效果：
   1. 所有`sql`写在`xml`中
   2. 所有`mybatis`配置写在`application.properties/yml `中

:::



## 自动装配的原理



### 核心启动器分析

SpringBoot 整合 MyBatis 的核心在于 `mybatis-spring-boot-starter`，它的主要组成：

1. **mybatis-spring-boot-autoconfigure**：自动配置核心
2. **mybatis-spring**：MyBatis 与 Spring 的整合支持
3. **mybatis**：MyBatis 核心库
4. **spring-boot-starter-jdbc**：JDBC 支持



### JDBC 场景的自动配置



通过查看 autoconfigure 包下面的 imports 文件，可以看到支持 JDBC 的自动配置类

<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411201134205.png" alt="image-20241120113449152" style="zoom:50%;" />

1. `org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration`
   1. **数据源的自动配置**
   2. 所有和数据源有关的配置都绑定在`DataSourceProperties`
   3. 默认使用 `HikariDataSource`
2. `org.springframework.boot.autoconfigure.jdbc.JdbcTemplateAutoConfiguration`
   1. 给容器中放了`JdbcTemplate`操作数据库
3. `org.springframework.boot.autoconfigure.jdbc.JndiDataSourceAutoConfiguration`
4. `org.springframework.boot.autoconfigure.jdbc.XADataSourceAutoConfiguration`
   1. **基于XA二阶提交协议的分布式事务数据源**
5. `org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration`
   1. **支持事务**



**可以看到：JDBC 具有的底层能力：数据源、JdbcTemplate、事务**





### MyBatis 的自动配置类：MyBatisAutoConfiguration



查看imports文件中的自动配置类：

<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411201140377.png" alt="image-20241120114022340" style="zoom:50%;" />



~~~properties
org.mybatis.spring.boot.autoconfigure.MybatisLanguageDriverAutoConfiguration
org.mybatis.spring.boot.autoconfigure.MybatisAutoConfiguration
~~~



重点关注：`MybatisAutoConfiguration`



自动配置生效前提：

1. `DataSourceAutoConfiguration` 和 `MybatisLanguageDriverAutoConfiguration` 必须先配置好，**必须在数据源配置好之后才配置**
2. 必须要有 `SqlSessionFactory`  和 `SqlSessionFactoryBean` 类
3. `MyBatis` 的所有配置绑定在 `MybatisProperties`

~~~java
@ConditionalOnClass({ SqlSessionFactory.class, SqlSessionFactoryBean.class })
@ConditionalOnSingleCandidate(DataSource.class)
@EnableConfigurationProperties(MybatisProperties.class)
@AutoConfigureAfter({ DataSourceAutoConfiguration.class, MybatisLanguageDriverAutoConfiguration.class })
public class MybatisAutoConfiguration implements InitializingBean {
  
}
~~~



`SqlSessionFactory`是`MyBatis`底层核心支撑，有了`SqlSessionFactory`就可以创建`SqlSession`，进而使用`SqlSession`的`CRUD`操作

创建`SqlSessionFactory`的步骤就是把连接数据库的数据源、`MyBatis`原生的配置文件、相关插件、IOC 容器中注册的`MyBatis`拦截器等组件一一应用到`SqlSessionFactoryBean`对象中，并调用其``getObject`方法实际构建`SqlSessionFactory`对象。

~~~java
@Bean
@ConditionalOnMissingBean
public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
    SqlSessionFactoryBean factory = new SqlSessionFactoryBean();
    // 设置数据源
    factory.setDataSource(dataSource);
    factory.setVfs(SpringBootVFS.class);
    // 设置MyBatis原生配置文件
    if (StringUtils.hasText(this.properties.getConfigLocation())) {
        factory.setConfigLocation(this.resourceLoader.getResource(this.properties.getConfigLocation()));
    }
    // 应用配置文件
    applyConfiguration(factory);
    if (this.properties.getConfigurationProperties() != null) {
        factory.setConfigurationProperties(this.properties.getConfigurationProperties());
    }
    // 设置插件
    if (!ObjectUtils.isEmpty(this.interceptors)) {
        factory.setPlugins(this.interceptors);
    }
    
    // 更多set操作

    // 实际构建SqlSessionFactory
    return factory.getObject();
}

~~~





继续查看`factory.getObject()`方法

`getObject`方法中会调用`afterPropertiesSet`方法，该方法会在进行一些前置判断后调用`buildSqlSessionFactory`方法，以构建实际的`SqlSessionFactory`对象。

~~~java
SqlSessionFactoryBean.java

@Override
public SqlSessionFactory getObject() throws Exception {
    if (this.sqlSessionFactory == null) {
        afterPropertiesSet();
    }
    return this.sqlSessionFactory;
}

@Override
public void afterPropertiesSet() throws Exception {
    // 一些前置判断...
    this.sqlSessionFactory = buildSqlSessionFactory();
}

~~~



`buildSqlSessionFactory` 方法是真正创建`SqlSessionFactory`对象的方法，而且方法内部步骤非常多。

大致经过以下阶段：

**基础配置初始化**

- 配置文件解析
- 环境配置
- 数据源设置

**组件注册**

- 类型别名注册
- 类型处理器注册
- 插件注册
- 对象工厂配置
- 语言驱动配置

**映射文件处理**

- XML 映射文件加载
- 注解配置处理
- SQL 语句解析

**其他功能配置**

- 缓存配置
- 数据库厂商标识
- 事务工厂配置



`buildSqlSessionFactory`方法执行完毕，`SqlSessionFactory`被成功创建，`MyBatis`的核心初始化完毕





### Mapper 接口的注册机制



编写 mapper 接口一般都需要在启动类或者配置类上加上注解 `@MapperScan("com.xxx.xxx.mapper")`用来扫描对应的 mapper 接口路径，从而为`mapper`接口创建代理对象

~~~java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@Documented
@Import(MapperScannerRegistrar.class)
@Repeatable(MapperScans.class)
public @interface MapperScan {
}
~~~



这个注解导入了 `MapperScannerRegistrar` 这个类，而这个类实现了 `ImportBeanDefinitionRegistrar` 接口，会进行 SpringBean 的扫描注册



~~~java
  @Override
  public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
    AnnotationAttributes mapperScanAttrs = AnnotationAttributes
        .fromMap(importingClassMetadata.getAnnotationAttributes(MapperScan.class.getName()));
    if (mapperScanAttrs != null) {
      registerBeanDefinitions(importingClassMetadata, mapperScanAttrs, registry,
          generateBaseBeanName(importingClassMetadata, 0));
    }
  }
~~~



registerBeanDefinitions 会扫描 @MapperScan 注解，提取注解的属性信息，并调用 registerBeanDefinitions 方法进行注册





~~~java
// MapperScannerRegistrar.java
void registerBeanDefinitions(AnnotationMetadata annoMeta, AnnotationAttributes annoAttrs,
    BeanDefinitionRegistry registry, String beanName) {
    // 构建 MapperScannerConfigurer 的 BeanDefinition
    BeanDefinitionBuilder builder = BeanDefinitionBuilder.genericBeanDefinition(MapperScannerConfigurer.class);
    
    // 设置各种属性...
    
    // 注册 MapperScannerConfigurer 的 BeanDefinition
    registry.registerBeanDefinition(beanName, builder.getBeanDefinition());
}
~~~

registerBeanDefinitions 方法

- 首先会构建 **MapperScannerConfigurer** 的 BeanDefinition
- 然后设置各种属性
- 最后注册 MapperScannerConfigurer 的 BeanDefinition



而`MapperScannerConfigurer` 类是实现了`BeanDefinitionRegistryPostProcessor` Bean工厂的后置处理器， Bean 实例化之前执行

~~~java
public class MapperScannerConfigurer
    implements BeanDefinitionRegistryPostProcessor, InitializingBean, ApplicationContextAware, BeanNameAware {
  
}
~~~



所以后续 `MapperScannerConfigurer`的 `postProcessBeanDefinitionRegistry` 方法会在 Spring 容器的 refresh 方法中的 `invokeBeanFactoryPostProcessors`方法进行回调执行



这个方法的逻辑主要就是创建 `ClassPathMapperScanner` 扫描器，然后执行扫描工作

~~~java
// MapperScannerConfigurer.java
public class MapperScannerConfigurer implements BeanDefinitionRegistryPostProcessor {
    
    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
        // 创建扫描器
        ClassPathMapperScanner scanner = new ClassPathMapperScanner(registry);
        
        // 配置扫描器...
        
        // 执行扫描
        scanner.scan(
            StringUtils.tokenizeToStringArray(this.basePackage, 
                ConfigurableApplicationContext.CONFIG_LOCATION_DELIMITERS));
    }
}
~~~



扫描器就会扫描 `basePackages` 然后进行注册

- **将 beanClass 从 Mapper 接口改为 MapperFactoryBean**
- 将原始的 Mapper 接口类型作为构造参数
- 配置其他属性...

~~~java
// ClassPathMapperScanner.java
public class ClassPathMapperScanner extends ClassPathBeanDefinitionScanner {
    
    @Override
    public Set<BeanDefinitionHolder> doScan(String... basePackages) {
        // 调用父类扫描获取 BeanDefinitionHolder
        Set<BeanDefinitionHolder> beanDefinitions = super.doScan(basePackages);
        
        if (!beanDefinitions.isEmpty()) {
            // 处理扫描到的 BeanDefinition
            processBeanDefinitions(beanDefinitions);
        }
        
        return beanDefinitions;
    }
    
    private void processBeanDefinitions(Set<BeanDefinitionHolder> beanDefinitions) {
        for (BeanDefinitionHolder holder : beanDefinitions) {
            GenericBeanDefinition definition = (GenericBeanDefinition) holder.getBeanDefinition();
            
            // 重要: 将 beanClass 从 Mapper 接口改为 MapperFactoryBean
            definition.setBeanClass(MapperFactoryBean.class);
            
            // 将原始的 Mapper 接口类型作为构造参数
            definition.getConstructorArgumentValues()
                .addGenericArgumentValue(definition.getBeanClassName());
                
            // 配置其他属性...
        }
    }
}
~~~



而 `MapperFactoryBean` 实现了 `FactoryBean`，是一个工厂 Bean

它的 `getObject()` 方法返回的才是真正放入到 Spring 容器的对象



~~~java
// MapperFactoryBean.java
public class MapperFactoryBean<T> extends SqlSessionDaoSupport implements FactoryBean<T> {
    
    private Class<T> mapperInterface;
    
    // Spring 会调用这个方法来获取实际的 bean 实例
    @Override
    public T getObject() throws Exception {
        // 获取 SqlSession 并创建代理对象
        return getSqlSession().getMapper(this.mapperInterface);
    }
}
~~~



后续将在 SqlSession 中获取 Mapper 时创建代理对象

~~~java
// DefaultSqlSession.java
public class DefaultSqlSession implements SqlSession {
    
    @Override
    public <T> T getMapper(Class<T> type) {
        return configuration.getMapper(type, this);
    }
}

// Configuration.java
public class Configuration {
    
    public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
        return mapperRegistry.getMapper(type, sqlSession);
    }
}

// MapperRegistry.java
public class MapperRegistry {
    
    @SuppressWarnings("unchecked")
    public <T> T getMapper(Class<T> type, SqlSession sqlSession) {
        final MapperProxyFactory<T> mapperProxyFactory = (MapperProxyFactory<T>) knownMappers.get(type);
        if (mapperProxyFactory == null) {
            throw new BindingException("Type " + type + " is not known to the MapperRegistry.");
        }
        try {
            // 在这里创建代理对象
            return mapperProxyFactory.newInstance(sqlSession);
        } catch (Exception e) {
            throw new BindingException("Error getting mapper instance. Cause: " + e, e);
        }
    }
}
~~~





流程图：

~~~mermaid
sequenceDiagram
    participant App as Spring应用启动
    participant Context as ApplicationContext
    participant Scanner as MapperScannerConfigurer
    participant Factory as MapperFactoryBean
    participant Registry as BeanDefinitionRegistry
    participant MyBatis as MyBatis框架

    App ->>+ Context: 1. refresh()
    
    rect rgb(200, 220, 240)
        Note over Context: 配置阶段
        Context ->>+ Registry: 2. 注册 MapperScannerConfigurer
        Registry -->>- Context: 返回
    end

    rect rgb(220, 240, 200)
        Note over Context: BeanFactoryPostProcessor 执行阶段
        Context ->>+ Scanner: 3. postProcessBeanDefinitionRegistry
        Scanner ->> Scanner: 4. 创建 ClassPathMapperScanner
        Scanner ->> Scanner: 5. 扫描指定包下的接口
        
        loop 每个Mapper接口
            Scanner ->>+ Registry: 6. 注册 MapperFactoryBean 定义
            Note over Scanner,Registry: 将原始 Mapper 接口类型作为构造参数
            Registry -->>- Scanner: 返回
        end
        
        Scanner -->>- Context: 扫描注册完成
    end

    rect rgb(240, 220, 220)
        Note over Context: Bean实例化阶段
        loop 每个 MapperFactoryBean
            Context ->>+ Factory: 7. getObject()
            Factory ->>+ MyBatis: 8. sqlSession.getMapper()
            MyBatis ->> MyBatis: 9. 创建代理对象
            MyBatis -->>- Factory: 返回代理对象
            Factory -->>- Context: 返回代理对象
        end
    end
    
    Context -->>- App: refresh完成

    rect rgb(220, 240, 240)
        Note over App: 使用阶段
        App ->> MyBatis: 10. 调用Mapper方法
        MyBatis ->> MyBatis: 11. 代理对象处理调用
        MyBatis -->> App: 返回结果
    end
~~~

