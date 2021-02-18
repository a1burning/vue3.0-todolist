<template>
  <section id="app" class="todoapp">
    <header class="header">
      <h1>todos</h1>
      <input
        class="new-todo"
        placeholder="What needs to be done?"
        autocomplete="off"
        autofocus
        v-model="input"
        @keyup.enter="addTodo"
        >
    </header>
    <!--count是代办事项的个数，如果是0就不展示，其他数字就展示-->
    <section class="main" v-show="count">
      <!-- 控制所有的checkbox，下面的label就是控制这个本地的checkbox，绑定allDone -->
      <input id="toggle-all" class="toggle-all" v-model="allDone" type="checkbox">
      <label for="toggle-all">Mark all as complete</label>
      <!-- 代办事项列表 -->
      <ul class="todo-list">
        <!-- 当前是编辑状态的时候，给li设置editing的类样式，当前的todo是编辑项的时候，就可以显示文本框 -->
        <!-- 如果选中，当前的completed可以控制完成没完成的样式 -->
        <li
          v-for="todo in filteredTodos"
          :key="todo"
          :class="{ editing: todo === editingTodo, completed: todo.completed }"
        >
          <div class="view">
            <!-- checkbox，当前代办项是否完成 -->
            <input class="toggle" type="checkbox" v-model="todo.completed">
            <!-- content，双击的时候进入编辑 -->
            <label @dblclick="editTodo(todo)">{{ todo.text }}</label>
            <!-- 删除，点击之后删除这一项，传入当前todo -->
            <button class="destroy" @click="remove(todo)"></button>
          </div>
          <!-- 编辑：
            双向绑定text属性
            键盘输入enter和失去焦点的时候编辑完成
            键盘输入esc的时候取消编辑
            如果当前的文本框正在编辑，那么就通过自定义指令获取焦点 -->
          <input
           class="edit" 
           type="text" 
           v-editing-focus="todo === editingTodo"
           v-model="todo.text"
           @keyup.enter="doneEdit(todo)"
           @blur="doneEdit(todo)"
           @keyup.esc="cancelEdit(todo)">
        </li>
      </ul>
    </section>
    <!--count是代办事项的个数，如果是0就不展示，其他数字就展示-->
    <footer class="footer" v-show="count">
      <span class="todo-count">
        <!-- 显示未完成代办项个数 -->
        <strong>{{ remainingCount }}</strong> item{{ remainingCount > 1 ? 's' : ''}} left
      </span>
      <ul class="filters">
        <li><a href="#/all">All</a></li>
        <li><a href="#/active">Active</a></li>
        <li><a href="#/completed">Completed</a></li>
      </ul>
      <!-- 给清空已完成事项添加点击事件removeCompleted
      如果总数比未完成的待办事项多，就说明有已完成代办事项，就展示 -->
      <button class="clear-completed" @click="removeCompleted" v-show="count > remainingCount">
        Clear completed
      </button>
    </footer>
  </section>
  <footer class="info">
    <p>Double-click to edit a todo</p>
    <!-- Remove the below line ↓ -->
    <p>Template by <a href="http://sindresorhus.com">Sindre Sorhus</a></p>
    <!-- Change this out with your name and url ↓ -->
    <p>Created by <a href="https://www.lagou.com">教瘦</a></p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>
</template>

<script>
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
// 导入模块，这个模块返回一个函数，调用的结果里面存储了setItem和getItem
import useLocalStorage from './utils/useLocalStorage'
import './assets/index.css'

const storage = useLocalStorage()
// 添加代办事项 useAdd
// 这个函数需要一个参数，这个参数是存放所有代办事项的数组，我们最终要把新增的代办事项添加到数组中
const useAdd = todos => {
  // v-model绑定的input，所以通过ref创建响应式数据，默认值是空字符串
  // 这里输出ref后添加Tab键就可以自动导入，
  const input = ref('')
  // 回车之后执行函数addTodo
  const addTodo = () => {
    // 因为我们绑定的是input，input是ref创建的响应式对象，所以这里要判断其value值
    // 这里如果input的value有值就去除前后空格
    const text = input.value && input.value.trim()
    // 判断如果没有输入内容直接返回
    if(text.length === 0) return
    // 给数组添加一个新值，并且放到其最前面
    // 因为todos是响应式数据，所以需要给其value属性添加
    todos.value.unshift({
      // 事项内容
      text,
      // 是否完成，初始值都是未完成
      completed: false
    })
    // 输入完成之后input框自动清空
    input.value = ''
  }
  // 将input和addTodo返回
  return {
    input,
    addTodo
  }
}

// 删除代办事项 useRemove
// 需要一个参数，从todos数组中删除
const useRemove = todos => {
  // 定义一个方法remove，传入参数要删除的那一项
  const remove = todo => {
    // 找todo在todos数组中的索引
    const index = todos.value.indexOf(todo)
    // 将todos中的指定项删除
    todos.value.splice(index, 1)
  }
  // 删除已完成的代办事项
  const removeCompleted = () => {
    // 将过滤了已完成之后的列表赋值给todos
    todos.value = todos.value.filter(todo => !todo.completed)
  }
  // 返回remove方法
  return {
    remove,
    removeCompleted
  }
}

// 编辑代办事项 useEdit
// 需要一个参数 remove函数在编辑的时候使用，所以这里传入
const useEdit = remove => {
  // 定义两个数据
  // 编辑之前的文本
  let beforeEditingText = ''
  // 编辑状态，响应式的，变化的时候界面上要控制文本框的显示和隐藏
  const editingTodo = ref(null)

  // 进入编辑 —— 记录当前的编辑状态和text属性
  // 接收参数todo，编辑的todo对象
  const editTodo = todo => {
    // 之前的文本
    beforeEditingText = todo.text
    // 当前进入的编辑状态
    editingTodo.value = todo
  }

  // 完成编辑 —— 接收编辑的todo对象
  const doneEdit = todo => {
    // 如果value没有值，直接返回
    if (!editingTodo.value) return
    // text去掉前后空格
    todo.text = todo.text.trim()
    // 如果没有内容就删除当前对象
    todo.text || remove(todo)
    // 编辑完成之后将状态取消，设置为null
    editingTodo.value = null
  }

  // 取消编辑 —— 接收编辑的todo对象
  const cancelEdit = todo => {
    // 将状态取消
    editingTodo.value = null
    // 将文本还原成之前的文本
    todo.text = beforeEditingText
  }
  // 返回使用的数据
  return {
    // 记录编辑状态
    editingTodo,
    // 三个函数
    editTodo,
    doneEdit,
    cancelEdit
  }
}

// 切换代办项完成状态 useFilter —— 接收参数todos
const useFilter = todos => {
  // 创建计算属性allDone，computed然后按Tab键上面可以自动导入
  // 计算属性中传get和set，
  const allDone = computed({
    // 有未完成的代办项返回false，所有代办项为完成的返回true
    get () {
      // filter方法过滤未完成的待办事项并获取其个数
      return !todos.value.filter(todo => !todo.completed).length
    },
    set (value) {
      // 遍历所有的todos，然后找到待办事项的completed的属性设置为传过来的value(true/false)
      todos.value.forEach(todo => {
        todo.completed = value
      })
    }
  })

  // 和hash的all、active、completed同名的过滤函数
  const filter = {
    // 所有的
    all: list => list,
    // 所有未完成的
    active: list => list.filter(todo => !todo.completed),
    // 所有已完成的
    completed: list => list.filter(todo => todo.completed)
  }

  // 定义一个响应式对象all，在onHashChange中获取值，触发更新操作，默认是all
  const type = ref('all')
  // 提供一个计算属性，type的值发生变化的之后，执行filter方法修改列表
  const filteredTodos = computed(() => filter[type.value](todos.value))
  // 计算属性，直接使用filter的active方法获取个数
  const remainingCount = computed(() => filter.active(todos.value).length)
  // 计算属性，所有列表的个数
  const count = computed(() => todos.value.length)
  // 定义hashChange对应的事件处理函数
  const onHashChange = () => {
    console.log("111")
    // 将 #/ 替换成空字符串
    const hash = window.location.hash.replace('#/', '')
    // 根据hash值如果能找到对应方法，就赋值给type
    if (filter[hash]) {
      type.value = hash
    // filter中找不到对应的方法，可能是页面首次加载，可能是hash不合法
    } else {
      // 默认为all，并把hash清空
      type.value = 'all'
      window.location.hash = ''
    }
  }

  // 挂载事件
  onMounted(() => {
    // 监听hashChange事件
    window.addEventListener('hashchange', onHashChange)
    // 页面首次加载的时候需要传todos事件
    onHashChange()
  })

  // 移除事件
  onUnmounted(() => {
    window.removeEventListener('hashchange', onHashChange)
  })
  
  
  return {
    allDone,
    filteredTodos,
    remainingCount,
    count
  }
}

// 存储待办事项
const useStorage = () => {
  // 定义一个常量KEY，本地存储对应的键
  const KEY = 'TODOKEYS'
  // 创建响应式的todos，首先从本地去获取数据，没有就初始化一个空数组
  const todos = ref(storage.getItem(KEY) || [])
  // watchEffect会监视todos数据，如果todos数据改变了，
  // 就会调用这个函数，我们就存储数据
  watchEffect(() => {
    storage.setItem(KEY, todos.value)
  })

  return todos
}

export default {
  name: 'App',
  setup () {
    // 开始的时候要去storage中查找数据
    const todos = useStorage()
    // 将remove和removeCompleted函数解构出来
    const { remove, removeCompleted } = useRemove(todos)
    // setup返回的成员在模板和组件的其他位置都可以使用
    return {
      // 因为todos在列表中使用，所以这里也返回
      todos,
      remove,
      removeCompleted,
      // 将input和addTodo直接解构返回
      ...useAdd(todos),
      // 将remove传入
      ...useEdit(remove),
      ...useFilter(todos)
    }
  },
  // 注册指令
  directives: {
    // v- 可以省略，el是指令修饰的元素，binding可以获取一些参数
    editingFocus: (el, binding) => {
      // binding.value是true说明当前文本框是编辑文本框，让其获取焦点
      binding.value && el.focus()
    }
  }
}
</script>

<style></style>
