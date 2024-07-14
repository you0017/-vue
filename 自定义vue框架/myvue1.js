//1. 先创建一个  QVue类,该类接收的是一个options的对象，也就是我们在实例化Vue的时候需要传递的参数。
class QVue{
	//
	constructor(options){
		//缓存options对象数据  用$是为了防止命名污染的问题
		this.$options=options;
		//取出data数据，做数据响应. 从这里可以观察 到为什么 Vue实例上通过this.$data可以拿到我们所写的data数据
		this.$data=options.data||{};   //如data不为空,则取data,如为空,则创建一个空对象
	}
}

//请测试是否可以通过  xx.$data.xxx 取值 了