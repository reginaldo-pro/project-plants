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
    plantsFloraDoBrazil: dbFactory('plantsFloraDoBrazil.db'),
    plantsGBIF: dbFactory('plantsGBIF.db'),
    ocorrenciasGBIF: dbFactory('ocorrenciasGBIF.db'),
    ocorrenciasSPLINK: dbFactory('ocorrenciasSPLINK.db'),
    plantsTPL: dbFactory('plantsTPL.db'),
    correctorGBIF: dbFactory('correctorGBIF.db')
};

module.exports = db;
