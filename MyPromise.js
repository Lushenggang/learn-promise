const STATE_PENDING = 1
const STATE_RESOLVED = 2
const STATE_REJECTED = 3

class MyPromise {
  constructor (resolver) {
    if (typeof resolver != 'function') {
      throw new Error(`Promise resolver ${resolver} is not a function`)
    }
    this.state = STATE_PENDING
    this.value = null
    this.callbackList = {
      [STATE_REJECTED]: [],
      [STATE_RESOLVED]: []
    }
    this.resolveList = []

    resolver((value) => {
      this.changeState(STATE_RESOLVED, value)
    }, (value) => {
      this.changeState(STATE_REJECTED, value)
    })
  }

  changeState (state, value) {
    if (this.state != STATE_PENDING) return
    if (state == STATE_RESOLVED && this.thenable(value)) {
      value.then(res => {
        this.changeState(STATE_RESOLVED, res)
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
    if (this.state == state) this.triggerCallback(callback)
  }

  triggerCallback (callback) {
    callback.call(undefined, this.value)
  }

  then (onFullfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const getHandler = (handler) => {
        return (value) => {
          handler = typeof handler == 'function' && handler
          value = handler ? handler(value) : value
          if (this.thenable(value)) {
            value.then(res => {
              resolve(res)
            }, error => {
              reject(error)
            })
          } else {
            resolve(value)
          }
        }
      }
      this.registerStateEvent(STATE_RESOLVED, getHandler(onFullfilled))
      this.registerStateEvent(STATE_REJECTED, getHandler(onRejected))
    })
  }

  catch (onRejected) {
    return this.then(undefined, onRejected)
  }

  thenable (obj) {
    return typeof obj == 'object' && typeof obj.then == 'function'
  }

}

MyPromise.resolve = value => new MyPromise((resolve, reject) => resolve(value))

MyPromise.reject = value => new MyPromise((resolve, reject) => reject(value))

MyPromise.all = promiseList => new MyPromise((resolve, reject) => {
  const resultList = [], length = promiseList.length
  let fullfilled = 0
  for (let i = 0; i < length; i++) {
    promiseList[i].then(res => {
      resultList[i] = res
      fullfilled++
      if (fullfilled == length) resolve(resultList)
    }, error => {
      reject(error)
    })
  }
})
// new MyPromise((resolve, reject) => {
//   resolve('1')
// }).then(res => {
//   console.log(res)
//   return MyPromise.reject('2')
// }).catch(error => {
//   console.log(error)
// })

// new Promise((resolve, reject) => {
//   resolve(Promise.reject('a'))
// }).then(res => {
//   console.log(res, 'fullfilled 1')
// }, error => {
//   console.log(error, 'rejected 1')
//   return error
// })

// new Promise((resolve, reject) => {
//   reject(Promise.resolve('a'))
// }).then(res => {
//   console.log(res, 'fullfilled 2')
// }, error => {
//   console.log(error, 'rejected 2')
//   return error
// })

MyPromise.resolve(1).then(res => {
  return MyPromise.reject(2)
}).catch(error => {
  console.log(error, 2)
})