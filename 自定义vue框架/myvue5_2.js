//1. 先创建一个  QVue类,该类接收的是一个options的对象，也就是我们在实例化Vue的时候需要传递的参数。
class QVue{
	//
	constructor(options){
		//缓存options对象数据  用$是为了防止命名污染的问题
		this.$options=options;
		//取出data数据，做数据响应. 从这里可以观察 到为什么 Vue实例上通过this.$data可以拿到我们所写的data数据
		this.$data=options.data||{};   //如data不为空,则取data,如为空,则创建一个空对象
		
		//监听数据的变化 
		this.observe(this.$data);
		
		//主要用来渲染界面组件，解析各种vue指令，比如{{name}} 等指令，并完成Watcher的绑定工作
		//调用Compile的构造函数
		new Compile(this.$options.el,this);
	}

	//观察数据变化
	observe(data){
		//如果value不存在，或不是一个对象类型，则返回，不予监听
		if(   !data || typeof data!=="object"){
			return;
		}
		//获取  data中所有的键
		let keys=Object.keys(data);    // Object内置对象中的方法，用于      返回一个由一个给定对象的自身可枚举属性组成的数组
		//循环所有的键，绑定监听
		keys.forEach(   (key)=>{
			//数据响应			对象，属性名，属性值
			this.defineReactive(data,key,data[key] );
			//代理data中的属性到vue实例上
			this.proxyData( key );
		});
	}
	//代理Data
	proxyData( key ){
		//这里的  this 指的是 vue对象      key指的是 $data中的每个键
		Object.defineProperty(  this, key,{
			get(){
				return this.$data[key];
			},
			set(newVal){
				this.$data[key]=newVal;
			}
		});
	}
	//数据响应		对象，属性名，属性值
	defineReactive( data, key, val){
		//解决数据层次嵌套, 递归绑定监听
		this.observe(val );
		const dep=new Dep();    //用于管理   watcher
		// 这里的 obj指的是   $data对象，  key是它里面的一个属性
		Object.defineProperty( data,key,{
			get(){
				//向管理watcher的对象追加watcher实例,方便管理
				Dep.target && dep.addWatcher(Dep.target);
				return val;
			},
			set(newVal){
				//如果值 没有发生变化，则返回
				if( newVal===val ){
					return;
				}
				//只有值 发生了变化才 进行更新并通知
				val=newVal;
				dep.notify();
			}
		})
	}
	
	
}

//主要用来渲染界面组件，解析各种vue指令，比如{{name}} 等指令，并完成Watcher的绑定工作
//调用Compile的构造函数
class Compile{
	/**
	 * el:界面待渲染的组件
	 * vm:vue对象
	 */
	constructor(el,vm){
		//document.getElementById -> 不通用
		//this指的是Compile对象
		this.$el = document.querySelector(el);  //
		this.$vm = vm;
		//判断el不为空才能解析
		if(this.$el){
			//转换宿主节点内容为片段Fragment元素
			this.$fragment = this.node2Fragment(this.$el);
			//执行编译解析过程，将里面的{{name}},v-model等指令解析出来
			this.compile(this.$fragment);
			//将编译解析完的html结果追加回主页面结点
			this.$el.appendChild(this.$fragment);
		}
		
	}
	
	//将<div ip="app">宿主元素中代码片段取出来，遍历各子节点，这样做比较高效
	//这里只考虑了  id="xx"的情况，没有考虑<template>
	node2Fragment(el){
		const frag = document.createDocumentFragment(); //也是dom的函数，相当于document.createElement();
		//但这个是轻量级，不会影响到DOM本身
		
		let child;
		while(child = el.firstChild){
			frag.appendChild(child);
		}
		
		return frag;
		
	}
	
	compile(frags){
		//获取frags中所有的子节点
		const childNodes = frags.childNodes;
		//循环数组
		Array.from(childNodes).forEach(node=>{
			//判断这个node是否为一个{{插值节点}}
			if(this.isInterpolation(node)){
				//console.log("这是一个插值节点:"+node.textContext + "   " + RegExp.$1);
				this.compileText(node);	//想让vue.$data.name的值显示到node结点的{{name}}中
			}
			//递归子元素，因为<p>{{name}}</p>
			if(node.childNodes && node.childNodes.length){
				this.compile(node);
			}
		});
	}
	
	/*
		Element 节点（元素节点）: 1
	    Attribute 节点（属性节点）: 2 (已弃用)
	    Text 节点（文本节点）: 3
	    Comment 节点（注释节点）: 8
	    Document 节点（文档节点）: 9
		DocumentType 节点（文档类型节点）: 10

	 */
	//这是否为一个文本节点，且为插值文本
	isInterpolation(node){
		let reg = /\{\{(.*)\}\}/;
		return node.nodeType == 3 && reg.test(node.textContent);
	}
	
	compileText(node){
		let key = RegExp.$1;	//"name": 可以到vue.$data[key]
		//更新界面文本
		this.update(node,this.$vm,key,"text");	//v-html: innerHTML   v-text: innerText
	}
	
	textUpdater(node,value){
		node.textContent = value;	//document.getElementById("").innerText
	}
	htmlUpdater(node,value){
		node.innerHTML = value;	//document.getElementById("").innerText
	}
	
	/**
	 * @param {Object} node	更新的结点
	 * @param {Object} vm	vue对象
	 * @param {Object} key	$data中的属性
	 * @param {Object} type	对节点操作的类型  text  html..
	 */
	update(node,vm,key,type){
		//``反撇号，混合文本和变量
		// this['textUpdater']
		const updateFunc = this[`${type}Updater`]; //在Compile中查找一个函数
		//执行这个函数  更新fragment代码片段
		updateFunc && updateFunc(node,vm[key]);
		
		//创建watcher,注册到vm[key]的subject(Dep)观察者列表中
		new Watcher(vm,key,function(value){
			updateFunc && updateFunc(node,value);
		})
	}
}

//管理watcher
class Dep{
	constructor(){
		//存储
		this.watchers=[];
	}
	//添加watcher
	addWatcher(watcher){
		this.watchers.push( watcher);
	}
	//通知所有的watcher进行更新
	notify(){
		this.watchers.forEach( (watcher)=>{
			watcher.update();
		})
	}
}

//观察者，做具体更新
class Watcher{
	constructor( vm,key,func){
		//vue实例
		this.vm=vm;
		//需要更新的key
		this.key=key;
		//更新后执行的函数
		this.func=func;
		//将当前watcher实例指定到Dep静态属性target,用来在类间进行通信
		Dep.target=this;
		//触发getter,添加依赖
		this.vm[this.key ];
		Dep.target=null;
	}
	update(){
		this.func.call(  this.vm,this.vm[this.key]);
	}
}

