//1. 先创建一个  QVue类,该类接收的是一个options的对象，也就是我们在实例化Vue的时候需要传递的参数。
class QVue {
    //
    constructor(options) {
        //缓存options对象数据  用$是为了防止命名污染的问题
        this.$options = options;
        //取出data数据，做数据响应. 从这里可以观察 到为什么 Vue实例上通过this.$data可以拿到我们所写的data数据
        this.$data = options.data || {};   //如data不为空,则取data,如为空,则创建一个空对象

        //监听数据的变化 
        this.observe(this.$data);

        //  主要用来解析各种指令，比如v-modal，v-on:click等指令
        new Compile(options.el, this);

    }

    //观察数据变化
    observe(data) {
        //如果value不存在，或不是一个对象类型，则返回，不予监听
        if (!data || typeof data !== "object") {
            return;
        }
        //获取  data中所有的键
        let keys = Object.keys(data);    // Object内置对象中的方法，用于      返回一个由一个给定对象的自身可枚举属性组成的数组
        //循环所有的键，绑定监听
        keys.forEach((key) => {
            //数据响应
            this.defineReactive(data, key, data[key]);
            //代理data中的属性到vue实例上
            this.proxyData(key);
        });
    }
    //代理Data
    proxyData(key) {
        //这里的  this 指的是 vue对象      key指的是 $data中的每个键
        Object.defineProperty(this, key, {
            get() {
                return this.$data[key];
            },
            set(newVal) {
                this.$data[key] = newVal;
            }
        });
    }
    //数据响应
    defineReactive(data, key, val) {
        //解决数据层次嵌套, 递归绑定监听
        this.observe(val);
        const dep = new Dep();    //用于管理   watcher
        // 这里的 obj指的是   $data对象，  key是它里面的一个属性
        Object.defineProperty(data, key, {
            get() {
                //向管理watcher的对象追加watcher实例,方便管理
                Dep.target && dep.addWatcher(Dep.target);
                return val;
            },
            set(newVal) {
                //如果值 没有发生变化，则返回
                if (newVal === val) {
                    return;
                }
                //只有值 发生了变化才 进行更新并通知
                val = newVal;
                dep.notify();
            }
        })
    }


}

//管理watcher
class Dep {
    constructor() {
        //存储
        this.watchers = [];
    }
    //添加watcher
    addWatcher(watcher) {
        this.watchers.push(watcher);
    }
    //通知所有的watcher进行更新
    notify() {
        this.watchers.forEach((watcher) => {
            watcher.update();
        })
    }
}

//观察者，做具体更新
class Watcher {
    constructor(vm, key, func) {
        //vue实例
        this.vm = vm;
        //需要更新的key
        this.key = key;
        //更新后执行的函数
        this.func = func;
        //将当前watcher实例指定到Dep静态属性target,用来在类间进行通信
        Dep.target = this;
        //触发getter,添加依赖
        this.vm[this.key];
        Dep.target = null;
    }
    update() {
        this.func.call(this.vm, this.vm[this.key]);
    }
}

//双向绑定原理，在编译的时候可以解析出v-model在做操作的时候，在使用v-model元素上添加了一个事件监听（input），
//把事件监听的回调函数作为事件监听的回调函数，如果input发生变化的时候把最新的值设置到vue的实例上，因为vue已经实现了数据的响应化，
//响应化的set函数会触发界面中所有依赖模块的更新，
//然后通知哪些model做依赖更新，所以界面中所有跟这个数据有管的东西就更新了。
class Compile {
    constructor(el, vm) {
        //  要遍历的宿主节点
        this.$el = document.querySelector(el);
        this.$vm = vm;

        //  编译
        if (this.$el) {
            //  转换宿主节点内容为片段Fragment元素
            this.$fragment = this.node2Fragment(this.$el);
            //  执行编译过程
            this.compile(this.$fragment);
            //  将编译完的HTML结果追加至宿主节点中
            this.$el.appendChild(this.$fragment);
        }
    }

    //  将宿主元素中代码片段取出来，遍历，这样做比较高效
    //这里只考虑了    id="xx"的情况，没有考虑   <template>
    node2Fragment(el) {
        const frag = document.createDocumentFragment();
        //  将宿主元素中所有子元素**（搬家，搬家，搬家）**至frag中
        let child;
        //  如果 el.firstChild 为undefined或null则会停止循环
        while (child = el.firstChild) {
            frag.appendChild(child);
        }
        return frag;
    }

    compile(el) {
        //  宿主节点下的所有子元素
        const childNodes = el.childNodes;
        Array.from(childNodes).forEach((node) => {
            if (this.isElement(node)) {
                //  如果是元素
                console.log("编译元素" + node.nodeName)
                //  拿到元素上所有的执行,伪数组
                const nodeAttrs = node.attributes;
                Array.from(nodeAttrs).forEach((attr) => {
                    //  属性名
                    const attrName = attr.name;
                    //  属性值
                    const exp = attr.value;
                    //  如果是指令
                    if (this.isDirective(attrName)) {
                        //  q-text
                        //  获取指令后面的内容
                        const dir = attrName.substring(2);
                        //  执行更新
                        this[dir] && this[dir](node, this.$vm, exp);
                    }
                    //  如果是事件
                    if (this.isEvent(attrName)) {
                        //  事件处理
                        let dir = attrName.substring(1);    //  @
                        this.eventHandler(node, this.$vm, exp, dir);
                    }
                })
            } else if (this.isInterpolation(node)) {
                //  如果是插值文本
                this.compileText(node);
                console.log("编译文本" + node.textContent)
            }
            //  递归子元素，解决元素嵌套问题
            if (node.childNodes && node.childNodes.length) {
                this.compile(node);
            }
        })
    }
    //  是否为节点
    isElement(node) {
        return node.nodeType === 1;
    }
    //  是否为插值文本
    isInterpolation(node) {
        //3是文本节点
        return node.nodeType === 3 && /\{\{(.*)\}\}/.test(node.textContent);
    }
    //  是否为指令   q-xxx
    isDirective(attr) {
        return attr.indexOf("q-") == 0;
    }
    // 是否为事件
    isEvent(attr) {
        return attr.indexOf("@") == 0;
    }

    //  v-text
    text(node, vm, exp) {
        this.update(node, vm, exp, "text");
    }
    textUpdater(node, value) {
        node.textContent = value;
    }

    //  双向绑定
    //  v-model
    model(node, vm, exp) {
        //  指定input的value属性，模型到视图的绑定
        this.update(node, vm, exp, "model");
        //  试图对模型的响应
        node.addEventListener('input', (e) => {
            vm[exp] = e.target.value;
        })
    }
    modelUpdater(node, value) {
        node.value = value;
    }

    //  v-html
    html(node, vm, exp) {
        this.update(node, vm, exp, "html")
    }
    htmlUpdater(node, value) {
        node.innerHTML = value;
    }

    //  更新插值文本
    compileText(node) {
        let key = RegExp.$1;
        this.update(node, this.$vm, key, "text");
    }
    //  事件处理器
    eventHandler(node, vm, exp, dir) {
        let fn = vm.$options.methods && vm.$options.methods[exp];
        if (dir && fn) {
            node.addEventListener(dir, fn.bind(vm));
        }
    }

    //  更新函数 - 桥接
    update(node, vm, exp, dir) {
        const updateFn = this[`${dir}Updater`];
        //  初始化
        updateFn && updateFn(node, vm[exp]);
        //  依赖收集
        new Watcher(vm, exp, function (value) {
            updateFn && updateFn(node, value);
        })
    }
}