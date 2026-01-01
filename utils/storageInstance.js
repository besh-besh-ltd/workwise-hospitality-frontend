import { reactLocalStorage } from 'reactjs-localstorage'

class storageInstance {
  static setStorage(key, value) {
    if (typeof window === 'undefined') return null
    return reactLocalStorage.set(key, value)
  }
  static setStorageObj(key, value) {
    if (typeof window === 'undefined') return null
    // const encrypkey = process.env.ENCRYPTION_KEY || ''
    // const encryptedValue = CryptoJS.AES.encrypt(
    //   JSON.stringify(value),
    //   encrypkey
    // ).toString()
    return reactLocalStorage.set(key, value)
  }

  static getStorage(key) {
    if (typeof window === 'undefined') return null
    if (reactLocalStorage.get(key)) {
        //const encrypkey = process.env.ENCRYPTION_KEY || ''
    //   const bytes = CryptoJS.AES.decrypt(reactLocalStorage.get(key), encrypkey)
    //   const decryptedText = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
    //   return decryptedText
        return reactLocalStorage.get(key);
    } else {
      return null
    }
  }
  
  static getStorageObj(key) {
    if (typeof window === 'undefined') return ''
    const encrypkey = process.env.ENCRYPTION_KEY || ''
    if (reactLocalStorage.get(key)) {
        // const encrypkey = process.env.ENCRYPTION_KEY || ''
        // const bytes = CryptoJS.AES.decrypt(reactLocalStorage.get(key), encrypkey)
        // const decryptedText = JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
        // return decryptedText
        return reactLocalStorage.get(key)
    } else {
      return ''
    }
  }

  static removeStorege(key) {
    if (typeof window === 'undefined') return null
    return reactLocalStorage.remove(key)
  }

  static clearStorege() {
    if (typeof window === 'undefined') return
    reactLocalStorage.clear()
  }
}

export default storageInstance