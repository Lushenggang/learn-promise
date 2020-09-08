const STATE_PENDING = 'pending'
const STATE_FULFILLED = 'fulfilled'
const STATE_REJECTED = 'rejected'

class MyPromise {
  constructor (resolver) {
    if (!this.isFunction(resolver)) {
      throw new Error(`Promise resolver ${resolver} is not a function`)
    }
    this.state = STATE_PENDING
    this.value = null
    this.callbackList = {
      [STATE_REJECTED]: [],
      [STATE_FULFILLED]: []
    }

    resolver((value) => {
      this.changeState(STATE_FULFILLED, value)
    }, (value) => {
      this.changeState(STATE_REJECTED, value)
    })
  }

  changeState (state, value) {
    if (this.state != STATE_PENDING) return
    if (value == this) {
      throw new Error('Chaining cycle detected for promise')
    }
    if (state == STATE_FULFILLED && this.thenable(value)) {
      value.then(res => {
        this.changeState(STATE_FULFILLED, res)
      }, error => {
        this.changeState(STATE_REJECTED, error)
      })
      return
    }
    setTimeout(() => {
      this.value = value
      this.state = state
      this.checkCallbackList()
    })
  }

  checkCallbackList () {
    const callbackList = this.callbackList[this.state]
    this.callbackList = undefined
    callbackList.forEach(callback => this.triggerCallback(callback))
  }

  registerStateEvent (state, callback) {
    if (this.state == STATE_PENDING) return this.callbackList[state].push(callback)
    if (this.state == state) {
      setTimeout(() => this.triggerCallback(callback))
    }
  }

  triggerCallback (callback) {
    callback.call(undefined, this.value)
  }

  then (onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const getHandler = (handler) => {
        return (value) => {
          handler = this.isFunction(handler) && handler
          if (!handler) { // 没有处理函数则继承当前promise的状态和值
            this.state == STATE_FULFILLED ? resolve(value) : reject(value)
            return
          }
          try {
            value = handler(value)
            resolve(value)
          } catch (error) {
            reject(error)
            return
          }
        }
      }
      this.registerStateEvent(STATE_FULFILLED, getHandler(onFulfilled))
      this.registerStateEvent(STATE_REJECTED, getHandler(onRejected))
    })
  }

  catch (onRejected) {
    return this.then(undefined, onRejected)
  }

  finally (callback) {
    return this.then(callback, callback)
  }

  isFunction (obj) {
    return typeof obj == 'function'
  }

  isObject (obj) {
    return typeof obj == 'object'
  }

  thenable (obj) {
    return (this.isObject(obj) || this.isFunction(obj) ) && this.isFunction(obj.then)
  }

  static resolve (value) {
    return new MyPromise((resolve, reject) => resolve(value))
  }

  static reject (value) {
    return new MyPromise((resolve, reject) => reject(value))
  }
  
  static all (promiseList) {
    return new MyPromise((resolve, reject) => {
      const resultList = [], length = promiseList.length
      let fulfilled = 0
      for (let i = 0; i < length; i++) {
        promiseList[i].then(res => {
          resultList[i] = res
          fulfilled++
          if (fulfilled == length) resolve(resultList)
        }, error => {
          reject(error)
        })
      }
    })
  }
}
// new MyPromise((resolve, reject) => {
//   resolve('1')
// }).then(res => {
//   console.log(res)
//   return MyPromise.reject('2')
// }).catch(error => {
//   console.log(error)
// })

// new MyPromise((resolve, reject) => {
//   resolve(Promise.reject('a'))
// }).then(res => {
//   console.log(res, 'fulfilled 1')
// }, error => {
//   console.log(error, 'rejected 1')
//   return error
// })

// new MyPromise((resolve, reject) => {
//   reject(MyPromise.resolve('a'))
// }).then(res => {
//   console.log(res, 'fulfilled 2')
// }, error => {
//   console.log(error, 'rejected 2')
//   return error
// })

// Promise.resolve(1).catch(error => 2).then(res => console.log(res))

// var a = MyPromise.resolve().then(() => a, () => 2)

// Promise.resolve(1).then(() => ({ a: 1, then: () => 2 })).then(res => {
//   console.log(res)
// })

// console.log(MyPromise.resolve(1))

// MyPromise.all([MyPromise.resolve(1), MyPromise.resolve(2)]).then(res => console.log(res))