---
title: SpringBoot 是如何启动的
order: 93
---



Springboot的启动过程分为两个阶段：第一阶段为创建SpringApplication 对象；第二步为执行 run 方法。



## 创建 SpringApplication 对象



~~~java
public class SpringApplication {
    /**
     * 资源加载器，用于加载外部资源（如配置文件）
     * 允许为null，若为null则使用默认的资源加载器
     */
    private ResourceLoader resourceLoader;

    /**
     * 主要源类集合，通常包含主启动类
     * 使用LinkedHashSet保证顺序性和唯一性
     */
    private Set<Class<?>> primarySources;

    /**
     * Web应用类型（NONE、SERVLET、REACTIVE）
     */
    private WebApplicationType webApplicationType;

    /**
     * 启动注册初始化器列表
     */
    private List<BootstrapRegistryInitializer> bootstrapRegistryInitializers;

    /**
     * 应用上下文初始化器集合
     */
    private List<ApplicationContextInitializer<?>> initializers;

    /**
     * 应用监听器集合
     */
    private List<ApplicationListener<?>> listeners;

    /**
     * 主应用类（通常是带有main方法的类）
     */
    private Class<?> mainApplicationClass;

    public SpringApplication(ResourceLoader resourceLoader, Class<?>... primarySources) {
        // 1. 设置资源加载器
        this.resourceLoader = resourceLoader;

        // 2. 校验并设置主要源类
        Assert.notNull(primarySources, "PrimarySources must not be null");
        this.primarySources = new LinkedHashSet<>(Arrays.asList(primarySources));

        // 3. 推断Web应用类型
        this.webApplicationType = WebApplicationType.deduceFromClasspath();

        // 4. 设置启动注册初始化器
        this.bootstrapRegistryInitializers = new ArrayList<>(
            getSpringFactoriesInstances(BootstrapRegistryInitializer.class));

        // 5. 设置应用上下文初始化器
        setInitializers((Collection) getSpringFactoriesInstances(ApplicationContextInitializer.class));

        // 6. 设置应用监听器
        setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));

        // 7. 推断主应用类
        this.mainApplicationClass = deduceMainApplicationClass();
    }

~~~



### 第一步：资源加载器设置

允许为 null，此时会使用默认的资源加载器

~~~java
this.resourceLoader = resourceLoader;
~~~





### 第二步：校验并设置主要源类

存储启动类信息，通常包含 @SpringBootApplication 注解的主类

~~~java
Assert.notNull(primarySources, "PrimarySources must not be null");
this.primarySources = new LinkedHashSet<>(Arrays.asList(primarySources));
~~~



### 第三步：推断Web应用类型

检查类路径中是否存在特定的类来判断：

- NONE：非 Web 应用

- SERVLET：传统 Servlet Web 应用

- REACTIVE：响应式 Web 应用

~~~java
this.webApplicationType = WebApplicationType.deduceFromClasspath();
~~~



~~~java
WebApplicationType.java

  private static final String[] SERVLET_INDICATOR_CLASSES = { "javax.servlet.Servlet",
			"org.springframework.web.context.ConfigurableWebApplicationContext" };

private static final String WEBMVC_INDICATOR_CLASS = "org.springframework.web.servlet.DispatcherServlet";

private static final String WEBFLUX_INDICATOR_CLASS = "org.springframework.web.reactive.DispatcherHandler";

private static final String JERSEY_INDICATOR_CLASS = "org.glassfish.jersey.servlet.ServletContainer";

static WebApplicationType deduceFromClasspath() {
    // 逻辑1
    if (ClassUtils.isPresent(WEBFLUX_INDICATOR_CLASS, null) && !ClassUtils.isPresent(WEBMVC_INDICATOR_CLASS, null)
        && !ClassUtils.isPresent(JERSEY_INDICATOR_CLASS, null)) {
        return WebApplicationType.REACTIVE;
    }
    // 逻辑2
    for (String className : SERVLET_INDICATOR_CLASSES) {
        if (!ClassUtils.isPresent(className, null)) {
            return WebApplicationType.NONE;
        }
    }
    // 逻辑3
    return WebApplicationType.SERVLET;
}

~~~



- 逻辑1：如果WebFlux的核心控制器`reactive.DispatcherHandler`存在，并且WebMvc的核心控制器`servlet.DispatcherServlet`不存在，则启用Reactive环境；
- 逻辑2：如果Servlet类以及`ConfigurableWebApplicationContext`类都不存在，则认为导入WebMvc 相关的环境不全，启用None环境；
- 逻辑3：否则，启用Servlet环境（包括只导入WebMvc环境、WebMvc和WebFlux共存的情况）



### 第四步：设置启动注册初始化器

使用 SPI 机制，从 `META-INF/spring.factories` 中加载`BootstrapRegistryInitializer`，**在应用上下文创建前完成一些初始化工作。**

应用场景有：系统启动时从配置中心拉取远程配置或者服务注册时与注册中心连接的建立等耗时操作

从源码中发现，SpringBoot本身没有`BootstrapRegistryInitializer`的实现类，因此`BootstrapRegistryInitializer`只是为开发者预留的一个扩展点

~~~java
this.bootstrapRegistryInitializers = new ArrayList<>(
            getSpringFactoriesInstances(BootstrapRegistryInitializer.class));
~~~





### 第五步：设置应用上下文初始化器集合

和上一步一样，使用 SPI 机制，从 `META-INF/spring.factories` 中加载初始化器 `ApplicationContextInitializer`

~~~java
setInitializers((Collection) getSpringFactoriesInstances(ApplicationContextInitializer.class));
~~~

`ApplicationContextInitializer`的描述是这样的：

~~~properties
Callback interface for initializing a Spring ConfigurableApplicationContextprior to being refreshed.
一个在刷新容器之前初始化ConfigurableApplicationContext的回调接口。

Typically used within web applications that require some programmatic initialization of the application context. For example, registering property sources or activating profiles against the context’s environment.
通常在需要对应用程序上下文进行某些编程式初始化的Web应用程序中使用。例如，根据上下文环境注册属性源或激活配置文件。
  
  
ApplicationContextInitializerprocessors are encouraged to detect whether Spring’s Orderedinterface has been implemented or if the @Orderannotation is present and to sort instances accordingly if so prior to invocation.
鼓励ApplicationContextInitializer处理器检测是否已实现Ordered接口或是否标注了@Order注解，并在调用之前相应地对实例进行排序  

~~~



由javadoc可知，**ApplicationContextInitializer是一个在IOC容器被创建之后、触发刷新动作之前被回调的接口，意味着它可以在IOC容器被创建之后、触发刷新动作之前进行额外的逻辑处理。**



那SpringBoot是如何加载ApplicationContextInitializer等初始化器的？

由下面的代码实现可以看出：是通过`SpringFramework`的`SPI`机制，即从`spring.factories`中加载。

至于具体的加载细节，这里不展开描述，但是我们可以从中得到该如何读取 spring.factories 中的配置

**利用 `SpringFactoriesLoader.forResourceLocation(String resourceLocation, @Nullable ClassLoader classLoader)`这个静态方法**

~~~java
// SpringApplication.java
  
	private <T> List<T> getSpringFactoriesInstances(Class<T> type) {
		return getSpringFactoriesInstances(type, null);
	}

	private <T> List<T> getSpringFactoriesInstances(Class<T> type, ArgumentResolver argumentResolver) {
		return SpringFactoriesLoader.forDefaultResourceLocation(getClassLoader()).load(type, argumentResolver);
	}
~~~



~~~java
// SpringFactoriesLoader.java

public static final String FACTORIES_RESOURCE_LOCATION = "META-INF/spring.factories";

	public static SpringFactoriesLoader forDefaultResourceLocation(@Nullable ClassLoader classLoader) {
		return forResourceLocation(FACTORIES_RESOURCE_LOCATION, classLoader);
	}

	public static SpringFactoriesLoader forResourceLocation(String resourceLocation, @Nullable ClassLoader classLoader) {
		Assert.hasText(resourceLocation, "'resourceLocation' must not be empty");
		ClassLoader resourceClassLoader = (classLoader != null ? classLoader :
				SpringFactoriesLoader.class.getClassLoader());
		Map<String, SpringFactoriesLoader> loaders = cache.computeIfAbsent(
				resourceClassLoader, key -> new ConcurrentReferenceHashMap<>());
		return loaders.computeIfAbsent(resourceLocation, key ->
				new SpringFactoriesLoader(classLoader, loadFactoriesResource(resourceClassLoader, resourceLocation)));
	}

	protected static Map<String, List<String>> loadFactoriesResource(ClassLoader classLoader, String resourceLocation) {
		Map<String, List<String>> result = new LinkedHashMap<>();
		try {
			Enumeration<URL> urls = classLoader.getResources(resourceLocation);
			while (urls.hasMoreElements()) {
				UrlResource resource = new UrlResource(urls.nextElement());
				Properties properties = PropertiesLoaderUtils.loadProperties(resource);
				properties.forEach((name, value) -> {
					String[] factoryImplementationNames = StringUtils.commaDelimitedListToStringArray((String) value);
					List<String> implementations = result.computeIfAbsent(((String) name).trim(),
							key -> new ArrayList<>(factoryImplementationNames.length));
					Arrays.stream(factoryImplementationNames).map(String::trim).forEach(implementations::add);
				});
			}
			result.replaceAll(SpringFactoriesLoader::toDistinctUnmodifiableList);
		}
		catch (IOException ex) {
			throw new IllegalArgumentException("Unable to load factories from location [" + resourceLocation + "]", ex);
		}
		return Collections.unmodifiableMap(result);
	}

~~~



### 第六步：设置应用生命周期监听器

监听 SpringBoot 启动过程中的各种事件。

从代码可以看出，设置监听器和上一步设置初始化器的逻辑是一致的，均是利用SpringFramework的SPI机制，从spring.factories中加载

~~~java
setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));
~~~



我们自定义一个`ApplicationListener`，然后注册进Spring 容器中，看看 SpringBoot 默认发布了哪些事件

~~~java
public class MyListener implements ApplicationListener<ApplicationEvent> {
    @Override
    public void onApplicationEvent(ApplicationEvent event) {
        System.out.println("监听到事件为：" + event.getClass());
    }
}
~~~

然后将其添加到类路径下的` META-INF/spring.factories`文件中

~~~properties
org.springframework.context.ApplicationListener=\
com.van.core.listener.MyListener
~~~



效果如下：

~~~java
监听到事件为：class org.springframework.boot.context.event.ApplicationStartingEvent
监听到事件为：class org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent
监听到事件为：class org.springframework.boot.context.event.ApplicationContextInitializedEvent
监听到事件为：class org.springframework.boot.context.event.ApplicationPreparedEvent
监听到事件为：class org.springframework.boot.web.servlet.context.ServletWebServerInitializedEvent
监听到事件为：class org.springframework.context.event.ContextRefreshedEvent
监听到事件为：class org.springframework.boot.context.event.ApplicationStartedEvent
监听到事件为：class org.springframework.boot.availability.AvailabilityChangeEvent
监听到事件为：class org.springframework.boot.context.event.ApplicationReadyEvent
监听到事件为：class org.springframework.boot.availability.AvailabilityChangeEvent
~~~



**监听到如下 10 个SpringBoot 内置事件，那么这些事件有什么作用呢，分别又是什么时候发布的呢？答案会在 SpringBoot 执行 run 方法的阶段展开**





### 第七步：推断主应用类

通过栈追踪方式获取调用信息

~~~java
this.mainApplicationClass = deduceMainApplicationClass();
~~~

具体实现：

~~~java
    /**
     * 推断主应用类的实现示例
     * 通过获取调用栈，找到含有main方法的类
     */
	private Class<?> deduceMainApplicationClass() {
		return StackWalker.getInstance(StackWalker.Option.RETAIN_CLASS_REFERENCE)
			.walk(this::findMainClass)
			.orElse(null);
	}

	private Optional<Class<?>> findMainClass(Stream<StackFrame> stack) {
		return stack.filter((frame) -> Objects.equals(frame.getMethodName(), "main"))
			.findFirst()
			.map(StackWalker.StackFrame::getDeclaringClass);
	}
~~~



至此，SpringApplication对象就创建完毕了，接下来就是执行对象的 run 方法。



## 执行 SpringApplication 对象的 run 方法



执行 SpringApplication 对象的 run 方法，也就是正式启动 SpringApplication 了。

~~~java
import org.springframework.boot.SpringApplication;
import org.springframework.boot.Banner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.SpringApplicationRunListeners;
import org.springframework.boot.context.event.EventPublishingRunListener;

public class SpringApplication {
    
    /**
     * SpringBoot应用启动的核心方法
     * 该方法实现了SpringBoot的主要启动逻辑，包括：
     * 1. 创建引导上下文
     * 2. 配置环境
     * 3. 创建应用上下文
     * 4. 刷新上下文
     * 5. 启动应用
     */
    public ConfigurableApplicationContext run(String... args) {
        // 创建启动时间监控对象，用于统计应用启动耗时
        Startup startup = Startup.create();
        
        // 注册JVM关闭钩子
        if (this.registerShutdownHook) {
            SpringApplication.shutdownHook.enableShutdownHookAddition();
        }
        
        // 创建引导上下文，用于在ApplicationContext创建前存储一些早期初始化的对象
        DefaultBootstrapContext bootstrapContext = createBootstrapContext();
        
        // 声明应用上下文变量
        ConfigurableApplicationContext context = null;
        
        // 配置java.awt.headless属性，用于在没有显示设备的环境中运行
        configureHeadlessProperty();
        
        // 获取SpringApplicationRunListener列表，用于在启动过程中发布各种事件
        // 默认实现是EventPublishingRunListener，它将把启动事件广播给所有的ApplicationListener
        SpringApplicationRunListeners listeners = getRunListeners(args);
        
        // 发布ApplicationStartingEvent事件，表示应用开始启动
        listeners.starting(bootstrapContext, this.mainApplicationClass);
        
        try {
            // 封装命令行参数
            ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);
            
            // 准备环境，包括创建环境对象、加载属性源、处理配置文件等
            // 这个过程会加载application.properties/yml等配置文件
            ConfigurableEnvironment environment = prepareEnvironment(listeners, bootstrapContext, 
                                                                   applicationArguments);
            
            // 打印Banner，就是启动时看到的Spring图案
            Banner printedBanner = printBanner(environment);
            
            // 创建ApplicationContext，根据webApplicationType选择不同的Context实现
            // SERVLET -> AnnotationConfigServletWebServerApplicationContext
            // REACTIVE -> AnnotationConfigReactiveWebServerApplicationContext
            // NONE -> AnnotationConfigApplicationContext
            context = createApplicationContext();
            
            // 设置启动监控器
            context.setApplicationStartup(this.applicationStartup);
            
            // 准备上下文
            // 1. 将environment设置到context中
            // 2. 执行ApplicationContextInitializer的initialize方法
            // 3. 发布ApplicationContextInitializedEvent事件
            // 4. 加载源配置类
            // 5. 发布ApplicationPreparedEvent事件
            prepareContext(bootstrapContext, context, environment, listeners, 
                         applicationArguments, printedBanner);
            
            // 刷新上下文
            // 这是Spring框架的核心方法，会完成：
            // 1. BeanFactory的创建和准备
            // 2. Bean定义的加载和注册
            // 3. BeanFactoryPostProcessor的调用
            // 4. BeanPostProcessor的注册
            // 5. 自动配置类的处理
            // 6. Bean的实例化和初始化
            // 7. 生命周期接口的回调
            refreshContext(context);
            
            // 刷新完成后的处理，默认为空实现，留给子类扩展
            afterRefresh(context, applicationArguments);
            
            // 记录启动完成时间
            startup.started();
            
            // 打印启动信息日志
            if (this.logStartupInfo) {
                new StartupInfoLogger(this.mainApplicationClass)
                    .logStarted(getApplicationLog(), startup);
            }
            
            // 发布ApplicationStartedEvent事件，表示应用已经启动完成
            listeners.started(context, startup.timeTakenToStarted());
            
            // 调用ApplicationRunner和CommandLineRunner
            // 这是SpringBoot提供的两个接口，用于在应用启动完成后执行一些初始化逻辑
            callRunners(context, applicationArguments);
        }
        catch (Throwable ex) {
            if (ex instanceof AbandonedRunException) {
                throw ex;
            }
            // 处理启动失败，发布ApplicationFailedEvent事件
            handleRunFailure(context, ex, listeners);
            throw new IllegalStateException(ex);
        }
        
        try {
            // 如果上下文正在运行，发布ApplicationReadyEvent事件
            // 表示应用已经准备就绪，可以开始接收请求
            if (context.isRunning()) {
                listeners.ready(context, startup.ready());
            }
        }
        catch (Throwable ex) {
            if (ex instanceof AbandonedRunException) {
                throw ex;
            }
            handleRunFailure(context, ex, null);
            throw new IllegalStateException(ex);
        }
        
        // 返回创建的应用上下文
        return context;
    }
}
~~~



### 前置准备

- 创建启动统计对象，用于性能监控

- 创建引导上下文，为早期初始化做准备

~~~java
 // 创建启动时间监控对象，用于统计应用启动耗时
  Startup startup = Startup.create();

  // 注册JVM关闭钩子
  if (this.registerShutdownHook) {
      SpringApplication.shutdownHook.enableShutdownHookAddition();
  }

  // 创建引导上下文，用于在ApplicationContext创建前存储一些早期初始化的对象
  DefaultBootstrapContext bootstrapContext = createBootstrapContext();
~~~



这里创建默认的`DefaultBootstrapContext`对象，并且在这里回调创建 SpringApplication对象时添加的`BootstrapRegistryInitializer` 初始化器

~~~java
	private DefaultBootstrapContext createBootstrapContext() {
		DefaultBootstrapContext bootstrapContext = new DefaultBootstrapContext();
		this.bootstrapRegistryInitializers.forEach((initializer) -> initializer.initialize(bootstrapContext));
		return bootstrapContext;
	}
~~~







### 获取 SpringBoot 生命周期事件发布器 SpringApplicationRunListeners

虽然起名叫做`SpringApplicationRunListeners`，但是实际上是事件发布器

~~~java
// 获取SpringApplicationRunListener列表，用于在启动过程中发布各种事件
// 默认实现是EventPublishingRunListener，它将把启动事件广播给所有的ApplicationListener
SpringApplicationRunListeners listeners = getRunListeners(args);
~~~



具体的细节就是利用 SPI 机制从`sprng.factories`文件中 加载`SpringApplicationRunListener` 的实现类集合

~~~java
	private SpringApplicationRunListeners getRunListeners(String[] args) {
		ArgumentResolver argumentResolver = ArgumentResolver.of(SpringApplication.class, this);
		argumentResolver = argumentResolver.and(String[].class, args);
		List<SpringApplicationRunListener> listeners = getSpringFactoriesInstances(SpringApplicationRunListener.class,
				argumentResolver);
		SpringApplicationHook hook = applicationHook.get();
		SpringApplicationRunListener hookListener = (hook != null) ? hook.getRunListener(this) : null;
		if (hookListener != null) {
			listeners = new ArrayList<>(listeners);
			listeners.add(hookListener);
		}
		return new SpringApplicationRunListeners(logger, listeners, this.applicationStartup);
	}
~~~



而 Springboot 中`SpringApplicationRunListener` 的默认的实现类就是 `EventPublishingRunListener` ，由构造方法可知：**EventPublishingRunListener构造完成之后，其内部已经初始化了一个事件广播器SimpleApplicationEventMulticaster**

~~~properties
# Run Listeners
org.springframework.boot.SpringApplicationRunListener=\
org.springframework.boot.context.event.EventPublishingRunListener
~~~



~~~java
	EventPublishingRunListener(SpringApplication application, String[] args) {
		this.application = application;
		this.args = args;
		this.initialMulticaster = new SimpleApplicationEventMulticaster();
	}
~~~



`EventPublishingRunListener`实现了`SpringApplicationRunListener`接口的各个方法，在每个方法中都有一个特殊的事件被广播。

~~~java
@Override
	public void starting(ConfigurableBootstrapContext bootstrapContext) {
		multicastInitialEvent(new ApplicationStartingEvent(bootstrapContext, this.application, this.args));
	}

	@Override
	public void environmentPrepared(ConfigurableBootstrapContext bootstrapContext,
			ConfigurableEnvironment environment) {
		multicastInitialEvent(
				new ApplicationEnvironmentPreparedEvent(bootstrapContext, this.application, this.args, environment));
	}

	// 省略

	@Override
	public void started(ConfigurableApplicationContext context, Duration timeTaken) {
		context.publishEvent(new ApplicationStartedEvent(this.application, this.args, context, timeTaken));
		AvailabilityChangeEvent.publish(context, LivenessState.CORRECT);
	}

   //后续代码省略
	}
~~~



### 发布 application starting 事件

- `SpringApplicationRunListeners` 发布 `starting` 事件，*表示应用开始启动*
- `starting`事件的类型为：`ApplicationStartingEvent` ，继承自`SpringApplicationEvent`

~~~java
listeners.starting(bootstrapContext, this.mainApplicationClass);
~~~



~~~java
// SpringApplicationRunListeners.java	
void starting(ConfigurableBootstrapContext bootstrapContext, Class<?> mainApplicationClass) {
		doWithListeners("spring.boot.application.starting", (listener) -> listener.starting(bootstrapContext),
				(step) -> {
					if (mainApplicationClass != null) {
						step.tag("mainApplicationClass", mainApplicationClass.getName());
					}
				});
	}

	private void doWithListeners(String stepName, Consumer<SpringApplicationRunListener> listenerAction,
			Consumer<StartupStep> stepAction) {
		StartupStep step = this.applicationStartup.start(stepName);
		this.listeners.forEach(listenerAction);
		if (stepAction != null) {
			stepAction.accept(step);
		}
		step.end();
	}
~~~



具体的发布事件实现，事件类型为：`ApplicationStartingEvent`

此时 SpringApplicationContext 容器还没有被创建，BootstrapContext 处于有效状态

~~~java
// EventPublishingRunListener.java	
@Override
public void starting(ConfigurableBootstrapContext bootstrapContext) {
  multicastInitialEvent(new ApplicationStartingEvent(bootstrapContext, this.application, this.args));
}
~~~



### 运行时环境准备阶段

这一过程主要作用是：

- 准备环境，包括创建环境对象、加载属性源、处理配置文件等
- 会加载application.properties/yml等配置文件

~~~java
ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);
ConfigurableEnvironment environment = prepareEnvironment(listeners, bootstrapContext, applicationArguments);
~~~



~~~java

/**
 * 环境准备的核心方法
 * 该方法完成配置环境的创建、属性加载、配置转换等核心功能
 */
private ConfigurableEnvironment prepareEnvironment(SpringApplicationRunListeners listeners,
        DefaultBootstrapContext bootstrapContext, ApplicationArguments applicationArguments) {

    // 第一步：创建或获取环境对象
    // 根据应用类型（SERVLET/REACTIVE/NONE）创建对应的环境对象
    // 如：StandardServletEnvironment、StandardReactiveEnvironment、StandardEnvironment
    ConfigurableEnvironment environment = getOrCreateEnvironment();

    // 第二步：配置环境
    // 1. 添加命令行参数到环境中
    // 2. 设置默认的配置文件名称（application）
    // 3. 设置活动配置文件（active profiles）
    configureEnvironment(environment, applicationArguments.getSourceArgs());

    // 第三步：将环境中的属性源转换为ConfigurationPropertySource
    // 这使得我们可以以统一的方式访问配置属性，无论它们来自哪里
    // 例如：application.properties、application.yml、命令行参数等
  	// 支持松散绑定（如：server.port = SERVER_PORT = server-port）
    ConfigurationPropertySources.attach(environment);

    // 第四步：发布环境准备事件
    // 这允许监听器在环境准备好后但在应用上下文创建之前执行一些操作
    // 例如：添加自定义的属性源、修改现有的配置等
    listeners.environmentPrepared(bootstrapContext, environment);

    // 第五步：确保默认属性是最后被处理的
    // 这样可以保证用户配置的属性优先级高于默认属性
    DefaultPropertiesPropertySource.moveToEnd(environment);

    // 第六步：检查是否设置了environment-prefix
    // 这是一个安全检查，防止通过属性文件修改环境前缀
    Assert.state(!environment.containsProperty("spring.main.environment-prefix"),
            "Environment prefix cannot be set via properties.");

    // 第七步：将环境属性绑定到SpringApplication
  	// 也就是绑定 spring.main 到 SpringApplication 对象
    // 这样可以通过配置文件来配置SpringApplication的行为
    bindToSpringApplication(environment);

    // 第八步：如果需要，转换环境类型
    // 例如：从StandardEnvironment转换为StandardServletEnvironment
    if (!this.isCustomEnvironment) {
        EnvironmentConverter environmentConverter = new EnvironmentConverter(getClassLoader());
        environment = environmentConverter.convertEnvironmentIfNecessary(environment, deduceEnvironmentClass());
    }

    // 第九步：再次附加配置属性源
    // 因为环境可能已经被转换，需要重新附加配置属性源
    ConfigurationPropertySources.attach(environment);

    return environment;
}
~~~



~~~java
	protected void bindToSpringApplication(ConfigurableEnvironment environment) {
		try {
			Binder.get(environment).bind("spring.main", Bindable.ofInstance(this));
		}
		catch (Exception ex) {
			throw new IllegalStateException("Cannot bind to SpringApplication", ex);
		}
	}
~~~





### 创建 Spring 容器

~~~java
ConfigurableApplicationContext context = null;

context = createApplicationContext();
~~~



具体的创建细节：

~~~java
	/**
	 * Strategy method used to create the {@link ApplicationContext}. By default this
	 * method will respect any explicitly set application context class or factory before
	 * falling back to a suitable default.
	 * @return the application context (not yet refreshed)
	 * @see #setApplicationContextFactory(ApplicationContextFactory)
	 */
	protected ConfigurableApplicationContext createApplicationContext() {
		return this.applicationContextFactory.create(this.webApplicationType);
	}
~~~

它的方法签名意思就是：

这个方式是利用工厂来创建 ApplicationContext 的策略方法

通过传入应用的类型，来创建不同类型的容器对象。

通过 DEBUG 可以看到，Servlet 类型的应用创建的容器对象为 `AnnotationConfigServletWebServerApplicationContext` 

![image-20241123152624881](https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411231526954.png)



这个容器的构造方法：

~~~java
/**
 * 默认构造函数
 * 在这里会注册所有注解处理器，包括 ConfigurationClassPostProcessor
 */	
public AnnotationConfigServletWebServerApplicationContext() {
     /**
     * 创建AnnotatedBeanDefinitionReader
     * 这个reader负责注册注解处理器
     */
		this.reader = new AnnotatedBeanDefinitionReader(this);
  	// 创建类路径扫描器，用于后续的组件扫描
		this.scanner = new ClassPathBeanDefinitionScanner(this);
	}
~~~



~~~java
/**
 * AnnotatedBeanDefinitionReader
 * 负责读取和注册注解相关的处理器
 */
class AnnotatedBeanDefinitionReader {
    
    public AnnotatedBeanDefinitionReader(BeanDefinitionRegistry registry) {
        this(registry, getOrCreateEnvironment(registry));
    }
    
    public AnnotatedBeanDefinitionReader(BeanDefinitionRegistry registry, Environment environment) {
        // ...
        
        // 注册注解配置处理器，这是关键步骤
        AnnotationConfigUtils.registerAnnotationConfigProcessors(registry);
    }
}
~~~



~~~java
/**
 * AnnotationConfigUtils
 * 包含注册各种注解处理器的工具方法
 */
public abstract class AnnotationConfigUtils {
    
    /**
     * 注解配置处理器的Bean名称常量
     */
    public static final String CONFIGURATION_ANNOTATION_PROCESSOR_BEAN_NAME =
        "org.springframework.context.annotation.internalConfigurationAnnotationProcessor";
        
    public static final String AUTOWIRED_ANNOTATION_PROCESSOR_BEAN_NAME =
        "org.springframework.context.annotation.internalAutowiredAnnotationProcessor";
        
    public static final String COMMON_ANNOTATION_PROCESSOR_BEAN_NAME =
        "org.springframework.context.annotation.internalCommonAnnotationProcessor";

    /**
     * 注册注解配置处理器
     * 这个方法会注册所有必要的注解处理器
     */
    public static void registerAnnotationConfigProcessors(BeanDefinitionRegistry registry) {
        registerAnnotationConfigProcessors(registry, null);
    }

    public static Set<BeanDefinitionHolder> registerAnnotationConfigProcessors(
            BeanDefinitionRegistry registry, Object source) {
            
        // 获取DefaultListableBeanFactory
        DefaultListableBeanFactory beanFactory = unwrapDefaultListableBeanFactory(registry);
        
        Set<BeanDefinitionHolder> beanDefs = new LinkedHashSet<>(8);

        // 1. 注册ConfigurationClassPostProcessor
        if (!registry.containsBeanDefinition(CONFIGURATION_ANNOTATION_PROCESSOR_BEAN_NAME)) {
            RootBeanDefinition def = new RootBeanDefinition(ConfigurationClassPostProcessor.class);
            def.setSource(source);
            // 注册ConfigurationClassPostProcessor的BeanDefinition
            registry.registerBeanDefinition(
                CONFIGURATION_ANNOTATION_PROCESSOR_BEAN_NAME, def);
            beanDefs.add(new BeanDefinitionHolder(def, 
                CONFIGURATION_ANNOTATION_PROCESSOR_BEAN_NAME));
        }

        // 2. 注册AutowiredAnnotationBeanPostProcessor
        if (!registry.containsBeanDefinition(AUTOWIRED_ANNOTATION_PROCESSOR_BEAN_NAME)) {
            RootBeanDefinition def = new RootBeanDefinition(AutowiredAnnotationBeanPostProcessor.class);
            def.setSource(source);
            registry.registerBeanDefinition(
                AUTOWIRED_ANNOTATION_PROCESSOR_BEAN_NAME, def);
            beanDefs.add(new BeanDefinitionHolder(def, 
                AUTOWIRED_ANNOTATION_PROCESSOR_BEAN_NAME));
        }

        // 3. 注册CommonAnnotationBeanPostProcessor
        if (!registry.containsBeanDefinition(COMMON_ANNOTATION_PROCESSOR_BEAN_NAME)) {
            RootBeanDefinition def = new RootBeanDefinition(CommonAnnotationBeanPostProcessor.class);
            def.setSource(source);
            registry.registerBeanDefinition(
                COMMON_ANNOTATION_PROCESSOR_BEAN_NAME, def);
            beanDefs.add(new BeanDefinitionHolder(def, 
                COMMON_ANNOTATION_PROCESSOR_BEAN_NAME));
        }

        // 4. 注册其他处理器...

        return beanDefs;
    }
}

~~~







### 初始化 Spring 容器

这一步主要关注以下几点：

1. 将 environment 设置到 context 中

2. 调用所有`ApplicationContextInitializer`的`initialize`方法

3. 发布`contextPrepared`容器准备完成事件，事件类型为：`ApplicationContextInitializedEvent`
4. **加载源配置类，并创建BeanDefinitionLoader对象，将主配置类注册为 BeanDefinition[重点分析]**

4. 发布`contextLoaded`容器加载完成事件，事件类型为`ApplicationPreparedEvent`

~~~java
prepareContext(bootstrapContext, context, environment, listeners, 
             applicationArguments, printedBanner);
            
~~~



实现细节：

~~~java
  private void prepareContext(DefaultBootstrapContext bootstrapContext,
                            ConfigurableApplicationContext context,
                            ConfigurableEnvironment environment,
                            SpringApplicationRunListeners listeners,
                            ApplicationArguments applicationArguments,
                            Banner printedBanner) {

      // 1. 设置环境对象
      // 将前面准备好的environment设置到应用上下文中
      context.setEnvironment(environment);

      // 2. 应用上下文后置处理
      // 设置一些基础设施组件，如资源加载器、BeanName生成器等
      postProcessApplicationContext(context);

      // 3. 添加AOT生成的初始化器（如果需要）
      // 用于支持原生镜像构建
      addAotGeneratedInitializerIfNecessary(this.initializers);

      // 4. 应用初始化器
      // 调用所有ApplicationContextInitializer的initialize方法
      applyInitializers(context);

      // 5. 发布上下文准备完成事件
      listeners.contextPrepared(context);

      // 6. 关闭引导上下文
      bootstrapContext.close(context);

      // 7. 打印启动信息
      if (this.logStartupInfo) {
          logStartupInfo(context.getParent() == null);
          logStartupProfileInfo(context);
      }

      // 8. 注册特殊的单例Bean
      ConfigurableListableBeanFactory beanFactory = context.getBeanFactory();
      // 注册启动参数Bean
      beanFactory.registerSingleton("springApplicationArguments", applicationArguments);
      // 注册Banner Bean
      if (printedBanner != null) {
          beanFactory.registerSingleton("springBootBanner", printedBanner);
      }

      // 9. 配置Bean工厂的特性
      if (beanFactory instanceof AbstractAutowireCapableBeanFactory autowireCapableBeanFactory) {
          // 设置是否允许循环引用
          autowireCapableBeanFactory.setAllowCircularReferences(this.allowCircularReferences);
          // 设置是否允许Bean定义覆盖
          if (beanFactory instanceof DefaultListableBeanFactory listableBeanFactory) {
              listableBeanFactory.setAllowBeanDefinitionOverriding(this.allowBeanDefinitionOverriding);
          }
      }

      // 10. 配置懒加载
      if (this.lazyInitialization) {
          context.addBeanFactoryPostProcessor(new LazyInitializationBeanFactoryPostProcessor());
      }

      // 11. 配置keepAlive模式
      if (this.keepAlive) {
          KeepAlive keepAlive = new KeepAlive();
          keepAlive.start();
          context.addApplicationListener(keepAlive);
      }

      // 12. 添加属性源排序处理器
      context.addBeanFactoryPostProcessor(new PropertySourceOrderingBeanFactoryPostProcessor(context));

      // 13. 加载源配置类（非AOT模式）
      if (!AotDetector.useGeneratedArtifacts()) {
          Set<Object> sources = getAllSources();
          Assert.notEmpty(sources, "Sources must not be empty");
          load(context, sources.toArray(new Object[0]));
      }

      // 14. 发布上下文加载完成事件
      listeners.contextLoaded(context);
  }
~~~





分析加载源配置类代码：

~~~java
Set<Object> sources = getAllSources();
load(context, sources.toArray(new Object[0]));
~~~

这段代码的核心作用是**加载并处理SpringBoot应用的主配置类（Primary Configuration）以及其他配置源**

1. 加载主配置类（带有@SpringBootApplication的类）

2. 将主配置类注册为 BeanDefinition

#### 获取配置源

~~~java
public Set<Object> getAllSources() {
  Set<Object> allSources = new LinkedHashSet<>();
  if (!CollectionUtils.isEmpty(this.primarySources)) {
    allSources.addAll(this.primarySources);
  }
  if (!CollectionUtils.isEmpty(this.sources)) {
    allSources.addAll(this.sources);
  }
  return Collections.unmodifiableSet(allSources);
}
~~~

配置源可能包括：

- 主配置类（@SpringBootApplication注解的类）
- XML配置文件
- Groovy配置文件
- 其他配置类



#### 源加载过程

~~~java
load(context, sources.toArray(new Object[0]));
~~~



1. 创建 BeanDefinitionReader，里面包含不同的 beanDefinitionReader 具体实现

~~~java
BeanDefinitionLoader loader = new BeanDefinitionLoader(
   	// 创建注解Bean定义读取器，用于读取主配置类
    new AnnotatedBeanDefinitionReader(registry),
    // 创建XML Bean定义读取器，用于读取XML配置
    new XmlBeanDefinitionReader(registry),
  	// 创建GroovyBean定义扫描器，用于扫描组件
    new GroovyBeanDefinitionReader(registry),
  	// 创建类路径Bean定义扫描器，用于扫描组件
    new ClassPathBeanDefinitionScanner(registry)
);
~~~



2. 根据不同源配置来加载

~~~java
// BeanDefinitionReader.java
void load() {
		for (Object source : this.sources) {
			load(source);
		}
	}

	private void load(Object source) {
		Assert.notNull(source, "Source must not be null");
    // 根据source类型选择不同的加载方式
		if (source instanceof Class<?> clazz) {
      // 处理配置类
			load(clazz);
			return;
		}
		if (source instanceof Resource resource) {
      // 处理资源文件
			load(resource);
			return;
		}
		if (source instanceof Package pack) {
       // 处理包
			load(pack);
			return;
		}
		if (source instanceof CharSequence sequence) {
      // 处理字符串表示的类名
			load(sequence);
			return;
		}
		throw new IllegalArgumentException("Invalid source type " + source.getClass());
	}


	private void load(Class<?> source) {
		if (isGroovyPresent() && GroovyBeanDefinitionSource.class.isAssignableFrom(source)) {
			// Any GroovyLoaders added in beans{} DSL can contribute beans here
			GroovyBeanDefinitionSource loader = BeanUtils.instantiateClass(source, GroovyBeanDefinitionSource.class);
			((GroovyBeanDefinitionReader) this.groovyReader).beans(loader.getBeans());
		}
		if (isEligible(source)) {
      // AnnotatedBeanDefinitionReader 对象
			this.annotatedReader.register(source);
		}
	}
~~~



3. 通过 `AnnotatedBeanDefinitionReader` 将主配置类注册为 BeanDefinition

~~~java
// AnnotatedBeanDefinitionReader.java

public void register(Class<?>... componentClasses) {
  for (Class<?> componentClass : componentClasses) {
    registerBean(componentClass);
  }
}
public void registerBean(Class<?> beanClass) {
  doRegisterBean(beanClass, null, null, null, null);
}

private <T> void doRegisterBean(Class<T> beanClass, @Nullable String name,
    @Nullable Class<? extends Annotation>[] qualifiers, @Nullable Supplier<T> supplier,
    @Nullable BeanDefinitionCustomizer[] customizers) {

  AnnotatedGenericBeanDefinition abd = new AnnotatedGenericBeanDefinition(beanClass);
  if (this.conditionEvaluator.shouldSkip(abd.getMetadata())) {
    return;
  }

  abd.setAttribute(ConfigurationClassUtils.CANDIDATE_ATTRIBUTE, Boolean.TRUE);
  abd.setInstanceSupplier(supplier);
  ScopeMetadata scopeMetadata = this.scopeMetadataResolver.resolveScopeMetadata(abd);
  abd.setScope(scopeMetadata.getScopeName());
  String beanName = (name != null ? name : this.beanNameGenerator.generateBeanName(abd, this.registry));

  AnnotationConfigUtils.processCommonDefinitionAnnotations(abd);
  if (qualifiers != null) {
    for (Class<? extends Annotation> qualifier : qualifiers) {
      if (Primary.class == qualifier) {
        abd.setPrimary(true);
      }
      else if (Lazy.class == qualifier) {
        abd.setLazyInit(true);
      }
      else {
        abd.addQualifier(new AutowireCandidateQualifier(qualifier));
      }
    }
  }
  if (customizers != null) {
    for (BeanDefinitionCustomizer customizer : customizers) {
      customizer.customize(abd);
    }
  }

  BeanDefinitionHolder definitionHolder = new BeanDefinitionHolder(abd, beanName);
  definitionHolder = AnnotationConfigUtils.applyScopedProxyMode(scopeMetadata, definitionHolder, this.registry);
  // 注册beanDefinition
  BeanDefinitionReaderUtils.registerBeanDefinition(definitionHolder, this.registry);
}
~~~



<img src="https://raw.githubusercontent.com/itscj1014/PictureBed/master/img/202411240516553.png" alt="image-20241124051630420" style="zoom:50%;" />





### 刷新 Spring 容器

::: tip 类比

调用 Spring 容器的 refresh() 方法，结合前面两步，相当于原生 Spring 执行了这样一个流程：

1. AnnotationConfigApplicationContext applicationContext = new AnnotationConfigApplicationContext();
2. applicationContext .register(MyApplication.class)
3. applicationContext .refresh()

:::



这一步相比于 Spring 容器的创建和初始化，都要复杂的多。主要会完成以下七件事：

1. BeanFactory的创建和准备
2. Bean定义的加载和注册
3. BeanFactoryPostProcessor的调用
4. BeanPostProcessor的注册
5. 自动配置类的处理
6. Bean的实例化和初始化
7. 生命周期接口的回调

~~~java
// SpringApplication.java
refreshContext(context);

private void refreshContext(ConfigurableApplicationContext context) {
  if (this.registerShutdownHook) {
    shutdownHook.registerApplicationContext(context);
  }
  refresh(context);
}

protected void refresh(ConfigurableApplicationContext applicationContext) {
  applicationContext.refresh();
}
~~~



~~~java
// ServletWebServerApplicationContext.java

	public final void refresh() throws BeansException, IllegalStateException {
		try {
			super.refresh();
		}
		catch (RuntimeException ex) {
			WebServer webServer = this.webServer;
			if (webServer != null) {
				webServer.stop();
				webServer.destroy();
			}
			throw ex;
		}
	}
~~~



通过查看源码，`refreshContext`方法最终会调用AbstractApplicationContext中的`refresh `方法

~~~java
// AbstractApplicationContext.java

public void refresh() throws BeansException, IllegalStateException {
		synchronized (this.startupShutdownMonitor) {
			StartupStep contextRefresh = this.applicationStartup.start("spring.context.refresh");

			// Prepare this context for refreshing.
			prepareRefresh();

			// Tell the subclass to refresh the internal bean factory.
			ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

			// Prepare the bean factory for use in this context.
			prepareBeanFactory(beanFactory);

			try {
				// Allows post-processing of the bean factory in context subclasses.
				postProcessBeanFactory(beanFactory);

				StartupStep beanPostProcess = this.applicationStartup.start("spring.context.beans.post-process");
				// Invoke factory processors registered as beans in the context.
				invokeBeanFactoryPostProcessors(beanFactory);

				// Register bean processors that intercept bean creation.
				registerBeanPostProcessors(beanFactory);
				beanPostProcess.end();

				// Initialize message source for this context.
				initMessageSource();

				// Initialize event multicaster for this context.
				initApplicationEventMulticaster();

				// Initialize other special beans in specific context subclasses.
				onRefresh();

				// Check for listener beans and register them.
				registerListeners();

				// Instantiate all remaining (non-lazy-init) singletons.
				finishBeanFactoryInitialization(beanFactory);

				// Last step: publish corresponding event.
				finishRefresh();
			}

			catch (RuntimeException | Error ex ) {
				if (logger.isWarnEnabled()) {
					logger.warn("Exception encountered during context initialization - " +
							"cancelling refresh attempt: " + ex);
				}
				// Destroy already created singletons to avoid dangling resources.
				destroyBeans();

				// Reset 'active' flag.
				cancelRefresh(ex);

				// Propagate exception to caller.
				throw ex;
			}

			finally {
				contextRefresh.end();
			}
		}
	}
~~~





### 发布 started 事件

刷新完容器后，发布 started事件，表示应用已经启动完成

started 事件类型为`ApplicationStartedEvent`

~~~java
listeners.started(context, startup.timeTakenToStarted());
~~~



### 调用 ApplicationRunner 和 CommandLineRunner

在这里调用实现了 ApplicationRunner 和 CommandLineRunner 两个接口的实现类，常用于应用启动完成后执行一下初始化逻辑

~~~java
// 调用 ApplicationRunner 和 CommandLineRunner
// 这是SpringBoot提供的两个接口，用于在应用启动完成后执行一些初始化逻辑 
callRunners(context, applicationArguments);
~~~



~~~java
SpringApplication.java	
private void callRunners(ApplicationContext context, ApplicationArguments args) {
		context.getBeanProvider(Runner.class).orderedStream().forEach((runner) -> {
			if (runner instanceof ApplicationRunner applicationRunner) {
				callRunner(applicationRunner, args);
			}
			if (runner instanceof CommandLineRunner commandLineRunner) {
				callRunner(commandLineRunner, args);
			}
		});
	}

	private void callRunner(CommandLineRunner runner, ApplicationArguments args) {
		try {
			(runner).run(args.getSourceArgs());
		}
		catch (Exception ex) {
			throw new IllegalStateException("Failed to execute CommandLineRunner", ex);
		}
	}
~~~



### 发布 ready 事件 or 发布 failed 事件

如果前面没有异常发生，当前的容器正在正常运行，则发布 ready 事件，表示当前应用已经准备就绪，可以开始接收请求

ready 事件的类型为`ApplicationReadyEvent`

~~~java
listeners.ready(context, startup.ready());
~~~



如果在前面的启动过程中，发生异常，则会退出容器，并发布 failed 事件

failed 事件的类型为 `ApplicationFailedEvent`

~~~java
	private void handleRunFailure(ConfigurableApplicationContext context, Throwable exception,
			SpringApplicationRunListeners listeners) {
		try {
			try {
				handleExitCode(context, exception);
				if (listeners != null) {
          // 发布 failed 事件
					listeners.failed(context, exception);
				}
			}
			finally {
				reportFailure(getExceptionReporters(context), exception);
				if (context != null) {
					context.close();
					shutdownHook.deregisterFailedApplicationContext(context);
				}
			}
		}
		catch (Exception ex) {
			logger.warn("Unable to close ApplicationContext", ex);
		}
		ReflectionUtils.rethrowRuntimeException(exception);
	}
~~~





至此，SpringBoot 应用启动完毕。



