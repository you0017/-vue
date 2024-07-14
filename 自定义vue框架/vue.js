class QVue{
    
    /*
        el:'...';//需要绑定的区域,一般为#id_name，因为id唯一，
        vue是根据document.querySelector(el)取值，默认为第一个该id

        data:{
            数据
        }
        methods:{
            方法
        }
    */
   /* 
        元素属性调用直接用key键名就行了
   */

    //有参构造
    //传入数据固定格式
    constructor(options){
        //该类创建一个options属性，赋值为传入的options
        this.$options = options; //$解决重名问题
        
        //同上，赋值为data数据，需要绑定监听器的部分
        this.$data = options.data || {};//监听器部分只能针对对象，data为空就默认设置空对象
        
        //绑定监听器
        this.observe(this.$data);

        //用于找到绑定区域内部的v-指令和差值表达式替换值
        new Compile(options.el,this);
    }


    //监听器部分
    observe(data){
        //数据部分不是对象，直接返回
        if(!data || typeof data !== 'object'){  //data为空 || !(data instanceof Object)
            return;
        }

        //对象默认为键值对形式，取到所有数据属性名
        var keys = Object.keys(data);

        //为每个属性都绑定监听器
        keys.forEach( (key) =>{
            this.defineReactive(data,key,data[key]);//data，键名，键对应的值

            //给这个vue的对应的options.data属性也弄一份set和get
            this.proxyData(key);
        } )
    }

    //实际监听部分
    //针对$data里面的数据
    defineReactive(data,key,val){
        //data的属性可能是对象，循环绑定监听
        this.observe(val);

        var dep = new Dep();

        //为data这个对象的属性重写set,get方法，set用来监听值变化
        Object.defineProperty(data,key,{
            get(){
                /********/
                //??这段不懂

                //第一次肯定是空的，但是在compile解析器实行之后，会多次调用watcher这个类，
                //然后把绑定区域里面所有的结点，里面的指令和差值表达式等的更新方法都放入了watcher，
                //每次有值更新的时候  就是调用set方法的时候会遍历所有的watcher，里面全是
                //get方法由Watcher调用，用来压栈
                //get的时候将属性，及其对应的update方法塞到Dep中，统一管理，每次调用set，就会触发notify()，然后执行属性对应的update()方法
                //因为是在defineReactive中new的，所以所有get共享同一个dep
                Dep.target && dep.addWatcher(Dep.target);

                return val;
            },
            set(newVal){
                //值没变化就不必要更新
                if(newVal === val){
                    return;
                }

                val = newVal;

                //更新监听器
                dep.notify();
            }
        })
    }

    //
    //为vue里面的同名属性重写get和set
    //将$data里面的属性挂在这个vue下面，并给了get/set，跳转到$data里面的同名属性
    proxyData(key){
        Object.defineProperty(this,key,{
            get(){
                return this.$data[key];
            },
            set(newVal){
                this.$data[key]=newVal;
            }
        });
    }//当vue挂载的data变化，那么option里面的也会变，只不过调用update使vue属性更新调用，不是option调用
    //只是让数据同步
}


/********/
//管理watcher
class Dep{
    constructor(){
        this.watchers=[];
    }
    //这个在60行调用过?
    /********/
    addWatcher(watcher){
        this.watchers.push(watcher);//数据压栈进数组    这里面存的是所有指令，差值表达式等的属性值，也就是$data里面的属性，和对应的update()方法
    }
    //通知更新
    notify(){
        this.watchers.forEach( (watcher) => {
            //不用new，js自动匹配类，抽象离谱
            //每次都调用watcher自己对应的update()方法
            watcher.update();
        })
    }
}

//观察者，做具体更新
class Watcher{
    /********/
    //目前没看见哪里调用过这个有参构造
    //最底下的update()
    //         vm=vue对象
    //          key=属性值，也就是元素属性=" "里面的值，之前提到过格式，属性值直接写键名就行了，如果是差值表达式就要使用{{键值}}形式
    //          func就是在解析器里面选好的属性对应的更新方法，如v-text这个指令，就找到text的更新方法
    constructor(vm,key,func){
        //vue实例
        this.vm=vm;
        //需要更新的key
        this.key = key;
        //更新后执行的函数
        this.func = func;
        //将当前watcher实例指定到Dep静态属性target，用来类之间通信
        //74行调用过,告诉set方法Dep.target不为空，可以执行dep.addWatcher()，把此时的watcher压入Dep中管理起来
        /********/  //
        Dep.target = this;
        
        //触发vue被data赋值的该key的get方法,用来调用80行左右
        //,get方法会触发set里面的监听器，会引发update()更新数据，就相当于vue对象初始化的时候，就会把文本节点差值表达式这种就已经改变了
        this.vm[this.key];
        //用完了置空
        Dep.target = null;
    }

    /********/
    update(){   //但是func的第一个参数不是node结点嘛？为什么传vm对象
        //固定搭配，回调141行的func函数
        this.func.call(this.vm,this.vm[this.key]);
    }//第一个参数是将回调函数绑在vm上面，修改的东西是针对vue这个对象，第二个是data下面对应的值
}

/********/
//以上的类中QVue是用来给data里面的属性设置get和set方法
//QVue的属性的set和get是用来调用$data里面同名属性的set和get
//QVue的$data的属性设置set和get，get用来把watcher集中到一个数组，方便管理解析时候要用
//set设置了通知方法，每次值变化之后，就该调用func方法




//双向绑定原理，在编译的时候可以解析出v-model在做操作的时候，在使用v-model元素上添加了一个事件监听（input），
//把事件监听的回调函数作为事件监听的回调函数，如果input发生变化的时候把最新的值设置到vue的实例上，因为vue已经实现了数据的响应化，

//上面这句指调用Watcher.update()

//响应化的set函数会触发界面中所有依赖模块的更新，
//这句话指set会调用notify(),而后调用update，这里面回调了func，func的第二个参数会重新调用get方法
//简单来说，无论是QVue的set还是get，最终都会执行
//Dep.target && dep.addWatcher(Dep.target);这段代码

//然后通知哪些model做依赖更新，所以界面中所有跟这个数据有管的东西就更新了。

class Compile{
    constructor(el,vm){
        //el为接管的区域，vm是new的QVue实例
        //需要绑定的区域,一般为#id_name，因为id唯一，
        //vue是根据document.querySelector(el)取值，默认为第一个该id
        this.$el = document.querySelector(el);
        
        this.$vm = vm;
        //上面这两个都是创建一个同名属性，方便后面使用

        if(this.$el){
            //如果这个区域存在

            //转换宿主节点内容为片段Fragment元素
            this.$fragment = this.node2Fragment(this.$el);//注意：firstChild是把元素提出来，因此此时el对应的元素内部是空的，就剩最外层的了

            //执行编译过程
            this.compile(this.$fragment);
            //编译完的HTML结果追加到宿主节点中  子节点全部填回到el里面，el又变回去了，只不过此时该绑定的方法已经绑定，该渲染的已经渲染
            this.$el.appendChild(this.$fragment);
        }
    }


    //去除宿主元素的代码片段，遍历
    //只考虑id="  "  没考虑 <template>这类模板标签
    node2Fragment(el){
        //创建文档片段，这个片段不会在dom中显示，一个看不见的容器，减少document的操作，将需要的元素一起弄进去
        var frag = document.createDocumentFragment();

        //相当于创建一个新区域，把老区域的所有子元素，无论这个元素是内容还是标签，先不管，都放到新的区域里面
        let child;
        //  如果 el.firstChild 为undefined或null则会停止循环
        while (child = el.firstChild) {
            frag.appendChild(child);
        }
        return frag;
    }

    //编译
    compile(el){
        //传进来的是新区域el

        //得到该新区域下面的所有子元素
        var childNodes = el.childNodes;

        Array.from(childNodes).forEach( (node) =>{
            if(this.isElement(node)){
                //如果是元素
                console.log("编译元素" + node.nodeName);
                //取到这个元素上所有的属性
                var nodeAttrs = node.attributes;
                //转数组并遍历
                Array.from(nodeAttrs).forEach( (attr) => {
                    //属性名
                    var attrName = attr.name;//v-bind
                    //属性值
                    const exp = attr.value;//" xxx "
                    
                    //v-bind:href=" xxx "

                    //如果是指令
                    if(this.isDirective(attrName)){
                        //v-text
                        //获取指令后面的内容    0,1分别是v,-
                        var dir = attrName.substring(2);
                        //因此dir == href这类东西

                        /********/
                        //执行更新  这段this[dir]是调用哪里？？？
                        //想起来了 this[dir] 是按 键来查找  45行一样
                        //如果compile里面有这个方法，就调用
                        //328开始？这个是什么调用方法？
                        this[dir] && this[dir](node,this.$vm,exp);
                    }
                    //  如果是事件@
                    if (this.isEvent(attrName)) {
                        //  事件处理  @click
                        let dir = attrName.substring(1);    //  click
                        this.eventHandler(node, this.$vm, exp, dir);
                    }
                })
            }else if (this.isInterpolation(node)) {
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
    /*
        <div id="container">
            <!-- 这是注释节点 -->
            <p>这是一个段落元素节点</p>
            这是一个文本节点
        </div>
        /*******
        <p></p>之间的会被当成文本结点嘛？？
    */

    /*
        Element 节点（元素节点）: 1
        Attribute 节点（属性节点）: 2 (已弃用)
        Text 节点（文本节点）: 3
        Comment 节点（注释节点）: 8
        Document 节点（文档节点）: 9
        DocumentType 节点（文档类型节点）: 10
    */

    //  是否为节点
    isElement(node) {
        return node.nodeType === 1;
    }
    //  是否为插值文本
    isInterpolation(node) {
        //3是文本节点
        //并且通过正则表达式 判断 是不是差值表达式
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

    //这两个没找到在那里调用的  243行？
    /********/
    //参数分别为(结点，QVue，属性值)
    //  v-text
    text(node, vm, exp) {
        this.update(node, vm, exp, "text");//调用最底下的update()方法
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
        node.addEventListener('input', (e) => { //e == $event
            vm[exp] = e.target.value;
        })//<input type="text" v-bind:value='message' v-on:input='valueChange($event)'/></br>
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
    //  事件处理器/********/
    //      为什么这个不修改？不用update
    //  因为函数不存在双向绑定，new之后里面的东西就不变了，不需要更新
    eventHandler(node, vm, exp, dir) {//结点  vue对象   事件名称，v-xx等于的那个属性值  xx，绑定的事件类型
        let fn = vm.$options.methods && vm.$options.methods[exp];
        if (dir && fn) {
            node.addEventListener(dir, fn.bind(vm));
        }//fn.bind(vm) 表示事件处理函数。.bind(vm) 的作用是将函数绑定到 vm 对象上，
        //使得在函数内部的 this 指向 vm 对象。这样做的目的是为了在事件处理函数中能够访问到 Vue 实例的属性和方法。
    }

    //  更新函数 - 桥接         v-model v-html...
    //(结点，QVue对象，属性值，v-后面的东西)
    update(node, vm, exp, dir) {
        //                  []里面是拼接语法，将dir的值和后面的Updater组成一个方法名
        const updateFn = this[`${dir}Updater`];
        //  初始化
        //抽象  变量名能变成变化的方法名使用
        //方法名不为空，就调用这个方法，也就是第一次new vue的时候就渲染一遍
        updateFn && updateFn(node, vm[exp]);//vm[exp]也是根据属性取值，在vue里面取到挂载的data里面的属性
        //  依赖收集

        //并且把需要更新的结点，属性值，对应的更新方法返回到watcher
        //回到125行左右
        new Watcher(vm, exp, function (value) {
            updateFn && updateFn(node, value);
        })//把每个绑定了vue的元素的属性和其对应的更新方法一对一对的传进去
    }
}