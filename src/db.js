const {app} = require('electron')
const fs = require('fs')
const util = require('util')
const Path = require('path')
const DataStore = require("nedb-promises")

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


const dbFactory = (fileName) => DataStore.create({
  filename: `./data/${fileName}`,
  timestampData: true,
  autoload: true
});


const db = {
    csv: new FSDS().create('csv.ds'),
    entry: new FSDS().create('entry.ds'),    
    FDB: new FSDS().create('FDB.ds'),
    TPL: new FSDS().create('TPL.ds'),
    ocorrenciasGBIF: new FSDS().create('ocorrenciasGBIF.ds'),
    ocorrenciasSPLINK: new FSDS().create('ocorrenciasSPLINK.ds'),
    correctorGBIF: new FSDS().create('correctorGBIF.ds')
};

export { 
  db
};
