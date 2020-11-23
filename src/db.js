import { language_Entry } from './language/PTBR'

const {app} = require('electron')
const fs = require('fs')
const util = require('util')
const Path = require('path')
const levelup = require('levelup')
const leveldown = require('leveldown')


const deleteFolderRecursive = function(path) {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach((file, index) => {
      const curPath = Path.join(path, file);
      if (fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

const dbFolder = process.cwd() + '/data'
if (fs.existsSync(dbFolder)) 
      deleteFolderRecursive(dbFolder)
fs.mkdirSync(dbFolder)    


const binArrayToJson = function(binArray) {
  var str = "";
  for (var i = 0; i < binArray.length; i++) {
      str += String.fromCharCode(parseInt(binArray[i]));
  } 
  return JSON.parse(str)
}

class FSDS {
  dbFolder = dbFolder;
  filename = null;
  fileContents = null;

  create (filename) {
    if (!filename){
      return null 
    }
    this.filename = filename
    this.fileContents = []
    fs.closeSync(fs.openSync(this.dbFolder + "/" + this.filename, 'w'))
    return this
  };

  load() {
    if (!this.filename){
      return null
    }    
    if (!fs.existsSync(this.dbFolder + "/" + this.filename)){ 
      this.create(this.filename)
    }
    else { 
      const _contents = fs.readFileSync(this.dbFolder + "/" + this.filename)
      if (_contents.length > 0){
        this.fileContents =  JSON.parse(_contents)
      }
      else {
        this.fileContents = []
      }
    }    
    return this
  };

  unload() {
    this.fileContents = []
  }

  sync() {
    if (this.filename && this.fileContents){
      fs.writeFileSync(this.dbFolder + "/" + this.filename, JSON.stringify(this.fileContents))
    }
    return this
  };


  close() {
    this.sync()
    return this
  };

  get(key) {
    if (!key){
      return null
    }
    if (!this.fileContents){
      this.load()
    }
    return this.fileContents[key]
  };

  getContents() {
    return this.fileContents
  }

  find(keys) {
    if (!this.fileContents){
      this.load()
    }
    let _res = this.fileContents
      .filter(e  => {
        let found = true
        for (const [k, v] of Object.entries(keys)){
          found = e[k] === v
          if (!found)
            break
        }
        return found
      })
    return _res
  };

  findOne(keys) {
    if (!this.fileContents){
      this.load()
    }

    for (const valueFileContent of this.fileContents){
      let found = true
      for (const [k, v] of Object.entries(keys)){
        found = valueFileContent[k] === v
        if (!found)
          break
      }
      if (found) {
        return valueFileContent
      }
    }
    return null
  };


  insert(element) {
    if (!this.fileContents){
      this.load()
    }
    if (Array.isArray(element)) {
      this.fileContents.push(...element)
    }
    else {
      this.fileContents.push(element)
    }
    return this
  }
}


class LDDB {
  dbFolder = dbFolder;
  filename = null;
  pk = []
  db = null

  create (filename, primaryKeys) {
    if (!filename){
      return null 
    }
    this.filename = filename
    this.db = levelup(leveldown(this.dbFolder + "/" + this.filename, 'w'))
    if (Array.isArray(primaryKeys)){
      this.pk.push(...primaryKeys)
    }
    else {
      this.pk.push(primaryKeys)
    }  
    return this
  };

  containsPK (element){
    const elementKeys = Object.keys(element) 
    for (const dbKey of this.pk){
      if (!elementKeys.includes(dbKey)) {
        return false
      }
    }
    return true
  };

  getPKValue(element) {
    const elementKeys = Object
      .keys(element)
      .filter(e => this.pk.includes(e))

    const _res = elementKeys
      .reduce((a , c)=> {
        return a + element[c]
      }, "")

    return _res
  };

  keyIsEqual(key1, key2) {
    for (const k1 of Object.keys(key1)) {
      if (key1[k1] !== key2[k1]){
        return false
      }
    }
    return true
  };

  _get(key) {
    return this.db.get(this.getPKValue(key))
  };

  get(element) {
    if (!this.containsPK(element)) {
      return Promise.resolve(null)
    }
    return this._get(element)
  };

  find(element, limit=-1) {
    if (this.containsPK(element)){
      return this._get(element)
    }

    let _values = []
    const _final = Object.values(element)[0] + "zzzzzz"
    const _this = this
    return new Promise((resolve, reject) =>{    
      this.db.createValueStream({gte: this.getPKValue(element), lte: _final, limit: limit, })
        .on('data', function (data) {
          _values.push(binArrayToJson(data))
        })
        .on('error', function (error) {
          reject(error)
        })
        .on('end', function () {    
          resolve(_values.filter(e => _this.keyIsEqual(element, e)))     
        })
    })
  };

  findOne(element) {
    if (this.containsPK(element)){
      return this._get(element)
    }
    const _value = this.find(element, 1)
    return (_value && _value.length >  0) ? value[0] : null
  };

  insert(element) {
    if (Array.isArray(element)) {
      const elementsToSave = element
        .map(e => {
          return {
            type: 'put',
            key: this.getPKValue(e),
            value: JSON.stringify(e)
          }
        })

      return this.db.batch(elementsToSave)
        .then(()=>{
          return element
        })
    }
    else {
      const _keys = this.getPKValue(element)
      return this.db.put(_keys, JSON.stringify(element))
        .then(() => {
          return element
        })
    }
  }
}

const db = {
    csv: new FSDS().create('csv.ds'),
    entry: new FSDS().create('entry.ds'),    
    FDB: new FSDS().create('FDB.ds'),
    TPL: new FSDS().create('TPL.ds'),
    ocorrenciasGBIF: new LDDB().create('ocorrenciasGBIF', ['found_name', 'year', 'month', 'day', 'long', 'lat']),
    ocorrenciasSPLINK: new LDDB().create('ocorrenciasSPLINK', ['found_name', 'year', 'month', 'day', 'long', 'lat']),
    correctorGBIF: new FSDS().create('correctorGBIF.ds')
};

export { 
  db
};
