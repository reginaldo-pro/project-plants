import axios from "axios";
import {FDBget} from "../api/FloraDoBrazil";
import {TPLget} from "../api/ThePlantList";
import {language_Entry} from "../language/PTBR";

const db = require('../db')
// Entry
const insertEntry = async (entry) => {
    return await db.entry.insert(entry)
}

const getEntries = (cond) => {   
    let entries =  db.entry.find(cond)
        .then(data => {
            return data.filter(e => e.name !== '')
        })
        .catch(reject => {
            console.log("Erro na busca no BD de espécies e sinoníminas já baixadas!")
            console.log(reject)
        })    
    return entries 
}

// CSV
const insertCSV = async (entry) => {
    return await db.csv.insert(entry)
}

const getCSV = (cond) => {
    return db.csv.find(cond)
}
const updateCSV = async (entry, newEntry) => {
    return await db.csv.update(entry, newEntry)
}
const deleteCSV = async (entry) => {
    return await db.entry.remove({fileName: entry['fileName']}).then(()=>{
      return db.csv.remove(entry)
    })
}

// Flora
const insertPlantsFloraDoBrazil = async (entry) => {
    return await db.FDB.insert(entry)
}
const updatePlantsFloraDoBrazil = async (entry, newEntry) => {
    return await db.FDB.update(entry, newEntry)
}
const getPlantsFloraDoBrazil = async (cond) => {
    return await db.FDB.find(cond)
}

// TPL
const insertThePlantList = async (entry) => {
    return await db.TPL.insert(entry)
}
const updateThePlantList = async (entry, newEntry) => {
    return await db.TPL.update(entry, newEntry)
}
const getThePlantList = async (cond) => {
    return await db.TPL.find(cond)
}
// GBIF
const insertPlantsGBIF = async (entry) => {
    return await db.plantsGBIF.insert(entry)
}
const updatePlantsGBIF = async (entry, newEntry) => {
    return await db.plantsGBIF.update(entry, newEntry)
}
const getPlantsGBIF = async (cond) => {
    return await db.plantsGBIF.find(cond)
}

const loadFDBOffline = async (obj) => {
    return new Promise(resolve => {
        try {
            getPlantsFloraDoBrazil({entry_name: obj.name}).then((data) => {
                if (data.length > 0) {
                    resolve(data[0])
                } else {
                    resolve({})
                }
            })
        } catch (e) {
            return null
        }
    })
}

const loadTPLOffline = async (obj) => {
    return new Promise(resolve => {
        try {
            getThePlantList({entry_name: obj.name}).then((data) => {
                if (data.length > 0) {
                    resolve(data[0])
                } else {
                    resolve({})
                }
            })
        } catch (e) {
            return null
        }
    })
}
const loadGBIFOffline = async (obj) => {
    return new Promise(resolve => {
        try {
            getPlantsGBIF({entry_name: obj.name}).then((data) => {
                if (data.length > 0) {
                    resolve(data[0])
                } else {
                    getPlantsGBIF({entry_name: obj.correction}).then((data) => {
                        if (data.length > 0) {
                            resolve(data[0])
                        } else {
                            resolve({})
                        }
                    })
                }
            })
        } catch (e) {
            return null
        }
    })
}
const loadGBIF = async (obj) => {
    return new Promise(resolve => {
        try {
            if (!obj.usageKey) {
                resolve({})
            } else {

                getPlantsGBIF({entry_name: obj.name}).then((data) => {
                    if (data.length > 0) {
                        resolve(data[0])
                    } else {
                        let url = "https://api.gbif.org/v1/species/" + obj.usageKey;
                        if (!obj.acceptedUsageKey) {
                            axios
                                .get(url)
                                .then(response => {
                                    insertPlantsGBIF({
                                        entry_name: obj.name,
                                        accept: response.data
                                    }).then((data) => {
                                        resolve(data)
                                    })
                                })
                        } else {
                            axios
                                .get(url)
                                .then(response => {
                                    insertPlantsGBIF({
                                        entry_name: obj.name,
                                        synonym: response.data
                                    }).then((data) => {
                                        let url = "https://api.gbif.org/v1/species/" + obj.acceptedUsageKey;
                                        axios
                                            .get(url)
                                            .then(response => {
                                                updatePlantsGBIF(data, {
                                                    ...data,
                                                    accept: response.data
                                                }).then((data2) => {
                                                    resolve(data2)
                                                })
                                            })
                                    })
                                })

                        }


                    }
                })
            }
        } catch (e) {
            return null
        }
    })
}
const insertOrUpdateCSV = async (obj) => {
    return new Promise(resolve => {
        return db.csv.findOne({name: obj.fileName}).then((data) => {
            if (!data) {
                resolve(db.csv.insert({name: obj.fileName}))
            } else {
                return db.csv.update({name: obj.fileName}, {name: obj.fileName}).then(d => {
                    return db.csv.findOne({name: obj.fileName}).then(data => {
                        resolve(data)
                    })
                })
            }
        })
    })
}

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}


const getSpDown = async (sps) => {
    let all_down = []
    
    sps.forEach(entry => {
        all_down.push(FDBget(entry.name))
        all_down.push(TPLget(entry.name))
    })
    return Promise.all(all_down).then(results => {    
        let items = results
            .filter(e => e !== null)
            .map(e => {
                    let syns = e[language_Entry.synonyms]    
                    let res = []
                   
                    if (syns) {                        
                        res = e[language_Entry.synonyms]
                            .split(', ')
                            .map(s => {  
                                return {
                                    [language_Entry.search_name] : getSpeciesAndAuthor(s)[0],
                                    [language_Entry.found_name] : s,
                                    [language_Entry.accepted_name] : e[language_Entry.accepted_name]
                                }                             
                            })                                                     
                    } 
                    
                    let obj = {}
                    obj[language_Entry.search_name] = getSpeciesAndAuthor(e[language_Entry.search_name])[0]
                    obj[language_Entry.found_name] = e[language_Entry.found_name]
                    obj[language_Entry.accepted_name] = e[language_Entry.accepted_name]

                    res.push(obj)
                    return res 
            })
            .reduce((a, c) => {                
                if (!a){
                    a = []
                }
                if (c){
                    a = a.concat(c)
                }
                return a
            })

        const set = new Set(items.map(item => JSON.stringify(item)))
        items = [...set].map(item => JSON.parse(item))
        return items
    })
}

const getSpeciesAndAuthor = (speciesStringName) => {
    var clear_str = speciesStringName
        .replace(/[{()}]/g, '')
        .replace(/\s\s+/g, ' ')
    
    if (clear_str.length<=0)
        return ['', '']
        
    var cap_words = clear_str.match(/(\b[A-Z.][A-Za-z.]+|\b[A-Z.]\b)/g)
    var author = ''
    var species = ''

    if (cap_words.length>1){
        var part_of_author = clear_str
            .split(cap_words[1])
            .map(w => w.trim())
            .filter(w => w !== '') 
            .slice(1)
            .join(' ')
        part_of_author = part_of_author.length > 0
            ? " " + part_of_author
            : part_of_author

        species = clear_str
            .split(cap_words[1])
            .map(w => w.trim())
            .filter(w => w !== '') 
        species = species[0]

        author = "(" + cap_words[1].trim() + part_of_author + ")"
    } else {
        species = clear_str
    }
    
    return [species, author]
}


export {
    insertEntry,
    getEntries,
    getPlantsFloraDoBrazil,
    getPlantsGBIF,
    insertPlantsFloraDoBrazil,
    insertPlantsGBIF,
    updatePlantsGBIF,
    updatePlantsFloraDoBrazil,
    loadGBIF,
    insertCSV, getCSV, updateCSV, insertOrUpdateCSV,
    loadFDBOffline, loadGBIFOffline, loadTPLOffline, deleteCSV,
    sleep, getSpDown,
    getSpeciesAndAuthor
}
