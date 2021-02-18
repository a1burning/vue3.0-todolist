// 将字符串转换成对象
function parse (str) {
  let value
  try {
    value = JSON.parse(str)
  } catch {
    value = null
  }
  return value
}

// 将对象转换成字符串
function stringify (obj) {
  let value
  try {
    value = JSON.stringify(obj)
  } catch {
    value = null
  }
  return value
}

// 设置本地存储和从本地存储获取值
export default function useLocalStorage () {
  // 设置本地存储
  function setItem (key, value) {
    value = stringify(value)
    window.localStorage.setItem(key, value)
  }

  // 获取本地存储
  function getItem (key) {
    let value = window.localStorage.getItem(key)
    // 如果有值就parse转换成对象，否则返回null
    if (value) {
      value = parse(value)
    }
    return value
  }

  return {
    setItem,
    getItem
  }
}

