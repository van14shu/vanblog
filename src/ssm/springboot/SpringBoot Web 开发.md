---
title: SpringBoot Web 开发
order: 90
---



## 静态资源



### 静态资源映射规则

静态资源映射规则在 `WebMvcAutoConfiguration` 中进行了定义：

1. `/webjars/** `的所有路径 资源都在` classpath:/META-INF/resources/webjars/`
2. **`/**` 的所有路径 资源都在` classpath:/META-INF/resources/、classpath:/resources/、classpath:/static/、classpath:/public/`**
3. 所有静态资源都定义了缓存规则。即浏览器访问过一次，就会缓存一段时间，但此功能参数无默认值
   1. `period`： 缓存间隔。 默认 0S；
   2. `cacheControl`：缓存控制。 默认无；
   3. `useLastModified`：是否使用`lastModified`头。 默认 false；



### 欢迎页

欢迎页规则在 WebMvcAutoConfiguration 中进行了定义：

1. 在静态资源目录下找 index.html
2. 没有就在 templates下找index模板页



### Favicon

在静态资源目录下找 favicon.ico



如下图的静态资源可以通过路径直接访问：



<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411200427870.png" alt="image-20241120042715817" style="zoom:50%;" />



浏览器输入：`http://localhost:10086/003.jpeg`

<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411200431356.png" alt="image-20241120043149316" style="zoom:33%;" />







### 自定义静态资源规则



#### 配置方式

**`spring.mvc`：静态资源访问前缀路径**

`spring.web`：静态资源目录 静态资源缓存策略

~~~properties
spring.web.resources.static-locations=classpath:/a/,classpath:/b/,classpath:/static/
# 这个配置的意思就是原本默认访问静态资源路径是 /** 直接去找对应的映射路径
# 但是配置了/static/** 后，访问静态资源路径就需要加 /static 后才能映射对应的资源路径
# 但是配置了/static/** 后，访问静态资源路径就需要加 /static 后才能映射对应的资源路径
spring.mvc.static-path-pattern=/static/**
~~~



`spring.mvc.static-path-pattern` 这个配置常用于我们后端需要拦截所有请求，但是对静态资源不进行拦截，所以我们配置一个静态资源路径前缀来区分



#### 代码方式

定义一个配置类，实现`WebMvcConfigurer`接口，但是不要标注`@EnableWebMvc`注解

~~~java
@Configuration //配置类
public class MyConfig implements WebMvcConfigurer {


    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        //保留以前规则
        //自己写新的规则。
        registry.addResourceHandler("/static/**")
                .addResourceLocations("classpath:/a/","classpath:/b/")
                .setCacheControl(CacheControl.maxAge(1180, TimeUnit.SECONDS));
    }
}
~~~





## 路径匹配



>Spring5.3 之后加入了更多的请求路径匹配的实现策略；
>以前只支持 AntPathMatcher 策略, 现在提供了 PathPatternParser 策略。并且可以让我们指定到底使用那种策略。



### **Ant风格路径用法**

Ant 风格的路径模式语法具有以下规则：

- *：表示任意数量的字符。
- ?：表示任意一个字符。
- **：表示任意数量的目录。
- {}：表示一个命名的模式占位符。
- []：表示字符集合，例如[a-z]表示小写字母。

例如：

- `*.html` 匹配任意名称，扩展名为.html的文件。
- `/folder1/*/*.java` 匹配在folder1目录下的任意两级目录下的`.java`文件。
- `/folder2/**/*.jsp` 匹配在folder2目录下任意目录深度的.jsp文件。
- `/{type}/{id}.html `匹配任意文件名为{id}.html，在任意命名的{type}目录下的文件。

注意：Ant 风格的路径模式语法中的特殊字符需要转义，如：

- 要匹配文件路径中的星号，则需要转义为`\\*`。
- 要匹配文件路径中的问号，则需要转义为`\\?`。



### 模式切换

AntPathMatcher 与 PathPatternParser

- PathPatternParser 在 jmh 基准测试下，有 6~8 倍吞吐量提升，降低 30%~40%空间分配率
- PathPatternParser 兼容 AntPathMatcher语法，并支持更多类型的路径模式
- **PathPatternParser  "**" 多段匹配的支持仅允许在模式末尾使用**



~~~java
    @GetMapping("/a*/b?/{p1:[a-f]+}")
    public String hello(HttpServletRequest request, 
                        @PathVariable("p1") String path) {

        log.info("路径变量p1： {}", path);
        //获取请求路径
        String uri = request.getRequestURI();
        return uri;
    }
~~~

~~~properties
# 改变路径匹配策略：
# ant_path_matcher 老版策略；
# path_pattern_parser 新版策略；
spring.mvc.pathmatch.matching-strategy=ant_path_matcher
~~~



**总结：**

- **使用默认的路径匹配规则，是由 PathPatternParser  提供的**
- **如果路径中间需要有 **，替换成ant风格路径**





## 内容协商

> 一套系统适配多端数据返回

<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411200452632.png" alt="image-20241120045213604" style="zoom:50%;" />







### **SpringBoot** 多端适配默认规则



#### 基于请求头内容协商：（默认开启）

客户端向服务端发送请求，携带HTTP标准的 Accept 请求头

- Accept: application/json、text/xml、text/yaml
- 服务端根据客户端请求头期望的数据类型进行动态返回



#### 基于请求参数内容协商：（需要开启）

- 发送请求 GET /projects/spring-boot?format=json 

- 匹配到 @GetMapping("/projects/spring-boot") 
- 根据参数协商，优先返回 json 类型数据【需要开启参数匹配设置】
- 发送请求 GET /projects/spring-boot?format=xml,优先返回 xml 类型数据





### 效果演示

::: tip 请求同一个接口，可以返回 json 和 xml 不同格式数据 

:::

1. 引入支持写出xml内容依赖

~~~xml
<dependency>
    <groupId>com.fasterxml.jackson.dataformat</groupId>
    <artifactId>jackson-dataformat-xml</artifactId>
</dependency>
~~~



2. 标注注解

~~~java
@JacksonXmlRootElement  // 可以写出为xml文档
@Data
public class Person {
    private Long id;
    private String userName;
    private String email;
    private Integer age;
}
~~~



3. 开启基于请求参数的内容协商

~~~properties
# 开启基于请求参数的内容协商功能。 默认参数名：format。 默认此功能不开启
spring.mvc.contentnegotiation.favor-parameter=true
# 指定内容协商时使用的参数名。默认是 format
spring.mvc.contentnegotiation.parameter-name=type
~~~



4. 效果

<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411200458323.png" alt="image-20241120045801265" style="zoom:50%;" />





## 错误处理



### 默认机制



::: tip 默认机制

错误处理的自动配置都在ErrorMvcAutoConfiguration中，两大核心机制：

- SpringBoot 会自适应处理错误，响应页面或JSON数据
- SpringMVC的错误处理机制依然保留，MVC处理不了，才会交给boot进行处理

:::

<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411200501038.svg" alt="未命名绘图.svg" style="zoom:70%;" />



发生错误以后，转发给/error路径，SpringBoot在底层写好一个 BasicErrorController的组件，专门处理这个请求：

~~~java
	@RequestMapping(produces = MediaType.TEXT_HTML_VALUE) //返回HTML
	public ModelAndView errorHtml(HttpServletRequest request, HttpServletResponse response) {
		HttpStatus status = getStatus(request);
		Map<String, Object> model = Collections
			.unmodifiableMap(getErrorAttributes(request, getErrorAttributeOptions(request, MediaType.TEXT_HTML)));
		response.setStatus(status.value());
		ModelAndView modelAndView = resolveErrorView(request, response, status, model);
		return (modelAndView != null) ? modelAndView : new ModelAndView("error", model);
	}

	@RequestMapping  //返回 ResponseEntity, JSON
	public ResponseEntity<Map<String, Object>> error(HttpServletRequest request) {
		HttpStatus status = getStatus(request);
		if (status == HttpStatus.NO_CONTENT) {
			return new ResponseEntity<>(status);
		}
		Map<String, Object> body = getErrorAttributes(request, getErrorAttributeOptions(request, MediaType.ALL));
		return new ResponseEntity<>(body, status);
	}
~~~



如何**解析一个错误页**：

1. 如果发生了500、404、503、403 这些错误
   1. 如果有模板引擎，默认在 `classpath:/templates/error/精确码.html`
   2. 如果没有模板引擎，在静态资源文件夹下找  `精确码.html`
2. 如果匹配不到`精确码.html`这些精确的错误页，就去找`5xx.html，4xx.html`模糊匹配
   1. 如果有模板引擎，默认在` classpath:/templates/error/5xx.html`
   2. 如果没有模板引擎，在静态资源文件夹下找 ` 5xx.html`
3. 如果都匹配不到：
   1. 如果模板引擎路径`templates`下有 `error.html`页面，就直接渲染





### 自定义错误响应



1. **自定义json响应**

使用`@ControllerAdvice + @ExceptionHandler `进行统一异常处理







2. **自定义页面响应**

根据`SpringBoot`的错误页面规则，自定义页面模板





## 消息转换器

开发中我们经常自己实现一个`WebMvcConfigurer` 接口，然后重写 `configureMessageConverters` 方法

常用于解决

- 处理前端精度丢失问题（如Long类型ID）
- 统一日期格式
- 统一空值处理
- 处理特殊字符编码



有如下接口：

~~~java
    @GetMapping("/{id}")
    public User getUser(@PathVariable Long id) {
        return userService.getUser(id);
    }
~~~



在没有配置自定义消息转换器之前在前端是这样返回的：

~~~json
{
    "id": 1234567890123456789,  // Long型数据可能精度丢失
    "createTime": 1621324800000, // 时间戳格式
    "name": "张三",
    "age": null,                 // 空值也会返回
}
~~~



添加自定义消息转换器：

~~~java
/**
 * 场景：接口需要统一处理日期格式、Long型数据精度丢失、空值处理等问题
 */
@Configuration
public class CustomMessageConverterConfig implements WebMvcConfigurer {
    
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        // 创建自定义的 Jackson 转换器
        MappingJackson2HttpMessageConverter jackson2HttpMessageConverter = new MappingJackson2HttpMessageConverter();
        ObjectMapper objectMapper = new ObjectMapper();
        
        // 配置日期格式
        objectMapper.setDateFormat(new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"));
        
        // 配置 Long 型数据序列化为字符串，避免精度丢失
        SimpleModule simpleModule = new SimpleModule();
        simpleModule.addSerializer(Long.class, ToStringSerializer.instance);
        simpleModule.addSerializer(Long.TYPE, ToStringSerializer.instance);
        objectMapper.registerModule(simpleModule);
        
        // 配置空值处理
        objectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        
        // 禁用时间戳功能
        objectMapper.configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
        
        jackson2HttpMessageConverter.setObjectMapper(objectMapper);
        
        // 将自定义的转换器添加到首位
        converters.add(0, jackson2HttpMessageConverter);
    }
}
~~~



添加后的效果：

~~~json
{
    "id": "1234567890123456789", // Long型转为字符串
    "createTime": "2021-05-18 12:00:00", // 格式化的日期
    "name": "张三"               // 空值被忽略
}
~~~

