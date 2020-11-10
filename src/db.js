const {app} = require('electron');
const DataStore = require('nedb-promises');
const dbFactory = (fileName) => DataStore.create({
    filename: `./data/${fileName}`,
    timestampData: true,
    autoload: true
});


const db = {
    entry: dbFactory('entry.db'),
    csv: dbFactory('csv.db'),

    FDB: dbFactory('FDB.db'),
    TPL: dbFactory('TPL.db'),

    plantsGBIF: dbFactory('plantsGBIF.db'),
    ocorrenciasGBIF: dbFactory('ocorrenciasGBIF.db'),
    cacheOcorrenciasGBIF: dbFactory('cacheOcorrenciasGBIF.db'),
    ocorrenciasSPLINK: dbFactory('ocorrenciasSPLINK.db'),
    cacheOcorrenciasSPLINK: dbFactory('cacheOcorrenciasSPLINK.db'),
    correctorGBIF: dbFactory('correctorGBIF.db')
};


const dropDB = (dbName) => {
    return db[dbName].remove({ }, { multi: true }, function (err, numRemoved) {
        db.dbName.loadDatabase();
      })
};

dropDB('entry')
dropDB('csv')
dropDB('FDB')
dropDB('TPL')
dropDB('plantsGBIF')
dropDB('ocorrenciasGBIF')
dropDB('cacheOcorrenciasGBIF')
dropDB('ocorrenciasSPLINK')
dropDB('cacheOcorrenciasSPLINK')
dropDB('correctorGBIF')

module.exports = db;
