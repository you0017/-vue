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

