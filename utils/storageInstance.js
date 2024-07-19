import { reactLocalStorage } from 'reactjs-localstorage'

class storageInstance {
  static setStorage(key, value) {
    return reactLocalStorage.set(key, value)
  }
  static setStorageObj(key, value) {
    // const encrypkey = process.env.ENCRYPTION_KEY || ''
    // const encryptedValue = CryptoJS.AES.encrypt(
    //   JSON.stringify(value),
    //   encrypkey
    // ).toString()
    return reactLocalStorage.set(key, value)
  }

  static getStorage(key) {
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
    return reactLocalStorage.remove(key)
  }

  static clearStorege() {
    reactLocalStorage.clear()
  }
}

export default storageInstance