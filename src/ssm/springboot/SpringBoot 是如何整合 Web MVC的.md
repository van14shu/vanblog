---
title: SpringBoot 是如何整合 Web MVC的
order: 80
---



Web 开发是我们平时开发中最常遇到的场景，当SpringBoot 项目整合 WebMVC 后，SpringBoot 自动装配到底自动配置了哪些规则呢？



## 自动配置



导入依赖：

~~~xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
~~~



每当引入一个场景启动器都会引入

~~~xml
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter</artifactId>
    </dependency>
~~~



而`spring-boot-starter`中会引入自动配置的依赖`autoconfigure`		

~~~xml
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-autoconfigure</artifactId>
    </dependency>
~~~



`@EnableAutoConfiguration`注解使用 `@Import(AutoConfigurationImportSelector.class)`批量导入组件

所以它会加载类路径下的`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`文件中配置的组件

以下是关于SpringMVC的

~~~xml
org.springframework.boot.autoconfigure.web.client.RestTemplateAutoConfiguration
org.springframework.boot.autoconfigure.web.embedded.EmbeddedWebServerFactoryCustomizerAutoConfiguration
====以下是响应式web场景和现在的没关系======
org.springframework.boot.autoconfigure.web.reactive.HttpHandlerAutoConfiguration
org.springframework.boot.autoconfigure.web.reactive.ReactiveMultipartAutoConfiguration
org.springframework.boot.autoconfigure.web.reactive.ReactiveWebServerFactoryAutoConfiguration
org.springframework.boot.autoconfigure.web.reactive.WebFluxAutoConfiguration
org.springframework.boot.autoconfigure.web.reactive.WebSessionIdResolverAutoConfiguration
org.springframework.boot.autoconfigure.web.reactive.error.ErrorWebFluxAutoConfiguration
org.springframework.boot.autoconfigure.web.reactive.function.client.ClientHttpConnectorAutoConfiguration
org.springframework.boot.autoconfigure.web.reactive.function.client.WebClientAutoConfiguration
================以上没关系=================
org.springframework.boot.autoconfigure.web.servlet.DispatcherServletAutoConfiguration
org.springframework.boot.autoconfigure.web.servlet.ServletWebServerFactoryAutoConfiguration
org.springframework.boot.autoconfigure.web.servlet.error.ErrorMvcAutoConfiguration
org.springframework.boot.autoconfigure.web.servlet.HttpEncodingAutoConfiguration
org.springframework.boot.autoconfigure.web.servlet.MultipartAutoConfiguration
org.springframework.boot.autoconfigure.web.servlet.WebMvcAutoConfiguration
~~~





### **WebMvcAutoConfiguration**

SpringBoot 默认配置好了 SpringMVC 常见的所有特性。而实现自动配置的关键类就是 **WebMvcAutoConfiguration**





### 生效条件



先看这个类上面的注解：

~~~java
// 当前自动配置会在以下几个配置类解析后再处理
@AutoConfiguration(after = { DispatcherServletAutoConfiguration.class, TaskExecutionAutoConfiguration.class,
		ValidationAutoConfiguration.class })

//如果是web应用就生效，类型SERVLET、REACTIVE 响应式web
@ConditionalOnWebApplication(type = Type.SERVLET)

//当前运行环境必须有Servlet类、DispatcherServlet类、WebMvcConfigurer类
@ConditionalOnClass({ Servlet.class, DispatcherServlet.class, WebMvcConfigurer.class })

//容器中没有这个Bean，才生效。默认就是没有
@ConditionalOnMissingBean(WebMvcConfigurationSupport.class)
// 优先级
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE + 10)
@ImportRuntimeHints(WebResourcesRuntimeHints.class)
public class WebMvcAutoConfiguration {
  
}
~~~

由以上源码可知，`WebMvcAutoConfiguration` 自动配置类的生效需要满足以下条件：

- 当前环境必须是`WebMvc(Servlet)`环境。引入`spring-boot-starter-web`依赖后，该条件默认生效。
- 当前类路径下必须有`Servlet`类、`DispatcherServlet`类、`WebMvcConfigurer`类。
- 项目中没有自定义的`WebMvcConfigurationSupport`类或子类，`WebMvcAutoConfiguration`才会生效。
- `DispatcherServletAutoConfiguration、TaskExecutionAutoConfiguration、ValidationAutoConfiguration`会先于`WebMvcAutoConfiguration`进行解析。



而 `DispatcherServletAutoConfiguration` 是和前端控制器的自动配置有关

~~~java
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
@AutoConfiguration(after = ServletWebServerFactoryAutoConfiguration.class)
@ConditionalOnWebApplication(type = Type.SERVLET)
@ConditionalOnClass(DispatcherServlet.class)
public class DispatcherServletAutoConfiguration {

}
~~~

可以看到，`DispatcherServletAutoConfiguration` 生效的前提是 `ServletWebServerFactoryAutoConfiguration` 先生效。



**所以大体上可以梳理出WebMVC场景的自动装配环节：Servlet容器的装配→DispatcherServlet的装配→WebMVC 核心组件的装配**

 

#### 核心类：WebMvcAutoConfigurationAdapter

`WebMvc`的装配在 `WebMvcAutoConfiguration`中完成，核心是其中的两个内部类`WebMvcAutoConfigurationAdapter`和`EnableWebMvcConfiguration`



~~~java
	@Configuration(proxyBeanMethods = false)
	@Import(EnableWebMvcConfiguration.class)
	@EnableConfigurationProperties({ WebMvcProperties.class, WebProperties.class })
	@Order(0)
	public static class WebMvcAutoConfigurationAdapter implements WebMvcConfigurer, ServletContextAware {
    
  }
~~~



- 首先这个类会导入 `EnableWebMvcConfiguration`  这个类
- 同时这个类绑定了两个属性类：`WebMvcProperties.class, WebProperties.class ` 
  - `WebMvcProperties.class` 配置对应：`spring.mvc`
  - `WebProperties.class` 配置对应：`spring.web`
- 其次这个类是实现了 `WebMvcConfigurer` 接口，重写了大量方法，并注册了一些新的Bean。这个接口定义了 MVC 底层的很多组件



所以接下来我们重点关注 `WebMvcAutoConfigurationAdapter` 这个类到底注册了哪些组件配置了哪些 MVC的属性





#### ✅1. 配置消息转换器（MessageConverter）



~~~java
  /**
     * 1. 消息转换器配置
     * 用于配置 HTTP 请求和响应的消息转换
     * 默认支持：JSON, XML, String, Form 等格式
     */
    @Override
    public void configureMessageConverters(List<HttpMessageConverter<?>> converters) {
        this.messageConvertersProvider
            .ifAvailable((customConverters) -> converters.addAll(customConverters.getConverters()));
    }
~~~



重写`configureMessageConverters`方法，目的是配置默认的消息转换器`HttpMessageConverter`

**消息转换器的作用对象是`@RequestBody`和@`ResponseBody`注解标注的`Controller`方法，分别完成请求体到参数对象的转换以及响应对象到响应体的转换。**

SpringBoot 默认自动配置了多个常用的消息转换器：

- **`MappingJackson2HttpMessageConverter`: 处理 JSON**
- `StringHttpMessageConverter`: 处理字符串
- `ByteArrayHttpMessageConverter`: 处理字节数组
- `ResourceHttpMessageConverter`: 处理静态资源



#### 2. 异步请求处理



~~~java
    /**
     * 2. 异步请求处理配置
     * 配置异步请求的超时时间和任务执行器
     */
    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        // 设置默认的异步任务执行器
        if (this.beanFactory.containsBean(TaskExecutionAutoConfiguration.APPLICATION_TASK_EXECUTOR_BEAN_NAME)) {
            Object taskExecutor = this.beanFactory
                .getBean(TaskExecutionAutoConfiguration.APPLICATION_TASK_EXECUTOR_BEAN_NAME);
            if (taskExecutor instanceof AsyncTaskExecutor asyncTaskExecutor) {
                configurer.setTaskExecutor(asyncTaskExecutor);
            }
        }
        // 设置异步请求超时时间
        Duration timeout = this.mvcProperties.getAsync().getRequestTimeout();
        if (timeout != null) {
            configurer.setDefaultTimeout(timeout.toMillis());
        }
    }
~~~



重写configureAsyncSupport方法，目的是配置异步请求的支持。

**SpringBoot在底层已经默认准备好了一个异步线程池，支持Controller层使用异步处理的方式接收请求。**

线程池在上文提到的`TaskExecutionAutoConfiguration`自动配置类中创建，bean名称是`applicationTaskExecutor`。





#### 3. 内容协商配置

~~~java
    /**
     * 3. 内容协商配置
     * 配置客户端和服务器之间的内容协商策略
     * 支持基于请求参数、请求头的内容协商
     */
    @Override
    public void configureContentNegotiation(ContentNegotiationConfigurer configurer) {
        WebMvcProperties.Contentnegotiation contentnegotiation = this.mvcProperties.getContentnegotiation();
        // 是否启用参数方式的内容协商
        configurer.favorParameter(contentnegotiation.isFavorParameter());
        // 设置内容协商的参数名
        if (contentnegotiation.getParameterName() != null) {
            configurer.parameterName(contentnegotiation.getParameterName());
        }
        // 配置媒体类型映射
        Map<String, MediaType> mediaTypes = this.mvcProperties.getContentnegotiation().getMediaTypes();
        mediaTypes.forEach(configurer::mediaType);
    }
~~~





#### ✅4. 静态资源处理配置

~~~java
    /**
     * 4. 静态资源处理配置
     * 配置静态资源的访问路径和缓存策略
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        if (!this.resourceProperties.isAddMappings()) {
            logger.debug("Default resource handling disabled");
            return;
        }
        // 配置 webjars 资源路径
        addResourceHandler(registry, this.mvcProperties.getWebjarsPathPattern(),
                "classpath:/META-INF/resources/webjars/");
        // 配置静态资源路径
        addResourceHandler(registry, this.mvcProperties.getStaticPathPattern(), (registration) -> {
            registration.addResourceLocations(this.resourceProperties.getStaticLocations());
            if (this.servletContext != null) {
                ServletContextResource resource = new ServletContextResource(this.servletContext, SERVLET_LOCATION);
                registration.addResourceLocations(resource);
            }
        });
    }
~~~

默认的静态资源路径：

- classpath:/static/
- classpath:/public/
- classpath:/resources/
- classpath:/META-INF/resources/

默认的资源路径匹配：/**



#### 5. 路径匹配配置

~~~java
    /**
     * 5. 路径匹配配置
     * 配置 URL 路径的匹配策略
     * Spring 6.0 后默认使用 PathPatternParser，但也支持传统的 AntPathMatcher
     */
    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        if (this.mvcProperties.getPathmatch()
            .getMatchingStrategy() == WebMvcProperties.MatchingStrategy.ANT_PATH_MATCHER) {
            configurer.setPathMatcher(new AntPathMatcher());
            this.dispatcherServletPath.ifAvailable((dispatcherPath) -> {
                String servletUrlMapping = dispatcherPath.getServletUrlMapping();
                if (servletUrlMapping.equals("/") && singleDispatcherServlet()) {
                    UrlPathHelper urlPathHelper = new UrlPathHelper();
                    urlPathHelper.setAlwaysUseFullPath(true);
                    configurer.setUrlPathHelper(urlPathHelper);
                }
            });
        }
    }
~~~



Spring Boot 3.x 默认使用 PathPatternParser

支持配置使用传统的 AntPathMatcher





#### 6. 配置RequestContextHolder支持

~~~java
@Bean
@ConditionalOnMissingBean({RequestContextListener.class, RequestContextFilter.class})
@ConditionalOnMissingFilterBean(RequestContextFilter.class)
public static RequestContextFilter requestContextFilter() {
    return new OrderedRequestContextFilter();
}

~~~

在实际开发中，我们可能会这样获取HttpServletRequest对象：

~~~java
HttpServletRequest request = ((ServletRequestAttributes) (RequestContextHolder.currentRequestAttributes())).getRequest();

~~~





### 核心类：EnableWebMvcConfiguration



#### ✅1. 注册 HandlerMapping

~~~java
    @Override
    protected RequestMappingHandlerMapping createRequestMappingHandlerMapping() {
        if (this.mvcRegistrations != null) {
            RequestMappingHandlerMapping mapping = this.mvcRegistrations.getRequestMappingHandlerMapping();
            if (mapping != null) {
                return mapping;
            }
        }
        return super.createRequestMappingHandlerMapping();
    }
~~~

**HandlerMapping 处理器映射器的作用是根据请求URL去匹配查找能处理的Handler**。目前主流的WebMvc方式都是`@RequestMapping`注解定义的 `Handler`请求处理器，因此这里直接默认注册了一个`RequestMappingHandlerMapping`

默认行为：

- 负责建立请求 URL 与处理器方法的映射关系

- 处理 @RequestMapping 注解的解析

- 提供 URL 路径匹配的规则



#### ✅2. 注册HandlerAdapter

~~~java
    /**
     * 请求处理器适配器创建
     * 负责执行处理器方法，处理参数绑定、返回值处理等
     */
    @Override
    protected RequestMappingHandlerAdapter createRequestMappingHandlerAdapter() {
        if (this.mvcRegistrations != null) {
            RequestMappingHandlerAdapter adapter = this.mvcRegistrations.getRequestMappingHandlerAdapter();
            if (adapter != null) {
                return adapter;
            }
        }
        return super.createRequestMappingHandlerAdapter();
    }
~~~



处理器适配器`HandlerAdapter`会拿到`HandlerMapping`匹配成功的`Handler`，并用合适的方式执行`Handler`的逻辑。

使用`@RequestMapping`注解定义的`Handler`，其底层负责执行的适配器就是`RequestMappingHandlerAdapter`。

默认行为：

- 负责执行处理器方法

- 处理方法参数的解析和绑定

- 处理方法返回值的转换





#### 3. 欢迎页配置

欢迎页功能支持（模板引擎目录、静态资源目录放index.html），项目访问/ 就默认展示这个页面

~~~java
    @Bean
    public WelcomePageHandlerMapping welcomePageHandlerMapping(
            ApplicationContext applicationContext,
            FormattingConversionService mvcConversionService,
            ResourceUrlProvider mvcResourceUrlProvider) {
        return createWelcomePageHandlerMapping(...);
    }
    
~~~



#### 4. 配置国际化支持

~~~java

   	@Override
    @Bean
    @ConditionalOnMissingBean(name = DispatcherServlet.LOCALE_RESOLVER_BEAN_NAME)
    public LocaleResolver localeResolver() {
        if (this.webProperties.getLocaleResolver() == WebProperties.LocaleResolver.FIXED) {
            return new FixedLocaleResolver(this.webProperties.getLocale());
        }
        AcceptHeaderLocaleResolver localeResolver = new AcceptHeaderLocaleResolver();
        localeResolver.setDefaultLocale(this.webProperties.getLocale());
        return localeResolver;
    }

~~~



`LocaleResolver`是`SpringWebMvc`针对国际化支持的核心接口，**作用解析请求中的语言标志参数或者请求头中的`Accept-Language`参数**，并将解析的参数存放到指定的位置中，通常配合`LocaleChangeInterceptor`使用。

注意，由该方法的注解`@ConditionalOnProperty(prefix = “spring.mvc”, name = “locale”)`可知，只有配置了`spring.mvc.locale`配置项后，`LocaleResolver`才会被创建。



#### ✅5. 默认的异常解析器 

~~~java
    @Override
    protected ExceptionHandlerExceptionResolver createExceptionHandlerExceptionResolver() {
        if (this.mvcRegistrations != null) {
            ExceptionHandlerExceptionResolver resolver = this.mvcRegistrations
                .getExceptionHandlerExceptionResolver();
            if (resolver != null) {
                return resolver;
            }
        }
        return super.createExceptionHandlerExceptionResolver();
    }
~~~



