const {app} = require('electron');
const DataStore = require("linvodb3");
const fs = require('fs');
const util = require('util')

const Path = require('path');

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

fs.mkdirSync(dbFolder);


DataStore.dbPath = dbFolder;
DataStore.prototype.findOne = util.promisify(DataStore.prototype.findOne)
DataStore.prototype.find = util.promisify(DataStore.prototype.find)
DataStore.prototype.insert = util.promisify(DataStore.prototype.insert)
DataStore.prototype.update = util.promisify(DataStore.prototype.save)
DataStore.prototype.save = util.promisify(DataStore.prototype.save)


const dbFactory = (fileName) => {
    return new DataStore(fileName, { /* schema, can be empty */ })
}


const db = {
    entry: dbFactory('entry'),
    
    csv: dbFactory('csv'),

    FDB: dbFactory('FDB'),
    TPL: dbFactory('TPL'),

    ocorrenciasGBIF: dbFactory('ocorrenciasGBIF'),
    ocorrenciasSPLINK: dbFactory('ocorrenciasSPLINK'),
    correctorGBIF: dbFactory('correctorGBIF')
};

module.exports = db;
