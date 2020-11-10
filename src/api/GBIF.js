// Corrector GBIF
import axios from "axios";
import { trim } from "jquery";
import * as db from "../db";
import { cancelSource } from "./utils";
import { sleep, getSpeciesAndAuthor } from "./index";
import { language_Entry } from "../language/PTBR";

const insertOC = async (item) => {
    return await db.ocorrenciasGBIF.insert(item)
}


const insertOcorrenciasGBIF = async (entry) => {
    return await new Promise(resolve => {
        resolve(entry.map(item => {
            let key = {
                found_name: item.found_name,
                year: item.year,
                month: item.month,
                day: item.day,
                long: item.long,
                lat: item.lat
            }
            return db.ocorrenciasGBIF.findOne(key).then(found => {
                if (found === null) {
                    return insertOC(item).then(item => {
                        return item
                    })
                }
                return found
            })
        }))
    })
}


const insertCorrectorGBIF = async (entry) => {
    return await db.correctorGBIF.insert(entry)

}

const getCorrectorGBIF = async (cond) => {
    return await db.correctorGBIF.find(cond)
}

const GBIFutils = (entry_name, usageKey, array) => {
    let entry_name_without_author = getSpeciesAndAuthor(entry_name[language_Entry.search_name])[0] 
    let entries = array
        .filter(e => e != null)
        .map(e => {
            let res_entry_name = getSpeciesAndAuthor(e['scientificName']).join(' ') 

            if (!res_entry_name.includes(entry_name_without_author)){
                return
            }

            let res =  {
                "entry_name": entry_name[language_Entry.search_name],
                "found_name": res_entry_name,
                "accepted_name": entry_name[language_Entry.accepted_name],
                "base de dados": 'GBIF',
                'familia': e.family ? e.family : '',
                'pais': e.countryCode ? e.countryCode : '',
                'year': e.year ? e.year : '',
                'month': e.month ? e.month : '',
                'day': e.day ? e.day : '',
                'lat': String(e.decimalLatitude).trim() !== '' ? parseFloat(String(e.decimalLatitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                'long': String(e.decimalLongitude).trim() !== '' ? parseFloat(String(e.decimalLongitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                'usageKey': usageKey
            }
            return res
        })
        .filter(e => e !== undefined)

    const set = new Set(entries.map(item => JSON.stringify(item)));
    const dedup = [...set].map(item => JSON.parse(item));
           
    return dedup
}

const OccorrenceGBIFInsert = async (entry_name, usageKey) => {
    return new Promise((resolve, reject) => {   
        if (!usageKey){
            resolve([{entry_name: entry_name[language_Entry.search_name], found_name:'', accepted_name:''}])
        }
        else {
            db.ocorrenciasGBIF.find({usageKey: usageKey})
                .then(found => {                
                    if (found.length>0){
                        resolve(found)
                    }
                    else {
                        db.cacheOcorrenciasGBIF.find({usageKey: usageKey})
                            .then(cachedData => {
                                if (cachedData.length>0){
                                    console.log(entry_name[language_Entry.search_name])
                                    console.log("GBIF----")
                                    let res = GBIFutils(entry_name, usageKey, cachedData)    
                                    insertOcorrenciasGBIF(res)
                                        .then((data) => {
                                            resolve(data)
                                        })
                                }
                                else {
                                    _download(usageKey, 0)           
                                        .then(async data => {  
                                            let all_inserts = []                         
                                            data = data
                                                .map(e => {                                                
                                                    e['usageKey'] = usageKey  
                                                    return clearKeyNames(e)                                      
                                                })

                                            data
                                                .map(e => {
                                                    all_inserts.push(db.cacheOcorrenciasGBIF.insert(e))
                                                })                                                
                                            
                                            Promise.all(all_inserts)
                                                .then(insertedData => {  
                                                    console.log(entry_name[language_Entry.search_name])
                                                    console.log("GBIF ----") 
                                                    let res = GBIFutils(entry_name, usageKey, insertedData)    
                                                    insertOcorrenciasGBIF(res)
                                                        .then((data) => {
                                                            resolve(data)
                                                        })                                               
                                                })                                       
                                        })
                                }
                            })  
                    }
                })
                .catch((e) => {
                    reject(e)
                })
            }
    })
}


const _download = (taxon_key, offset = 0) => {
    return new Promise((resolve, reject) => {
            let url = "https://api.gbif.org/v1/occurrence/search"

            axios.get(url, {
                cancelToken: cancelSource.token,
                params: {
                    advanced: false,
                    locale: 'en',
                    taxon_key: taxon_key,
                    limit: 300,
                    offset: offset,
                    hasCoordinate: true
                }
            }).then(response => {
                if (response.status === 200) {
                    let data = response.data
                    let results = data['results']
                    let finished = data['endOfRecords']  
                    
                    console.log("[GBIF] Download de: " + results.length + " ocorrências. (" + taxon_key + ")")

                    if (finished){
                        resolve(results)
                    } else {
                        sleep(2000)
                            .then(() =>{
                                _download(taxon_key, offset + 300)                            
                                    .then(new_data => {                                 
                                        resolve(new_data.concat(results) )
                                    }).catch((e) => {
                                        reject(e)
                                    })
                            })
                        }
                } else {
                    resolve([])
                }

            }).catch((e) => reject(e))

    })
}

const downloadOcorrenceGBIF = (entry_name) => {
    return loadCorrection({name: entry_name[language_Entry.search_name]})
        .then(data => {           
            let correction = (data['correction']['matchType'] === "NONE")
                ? null
                : data['correction']['usageKey']

            return OccorrenceGBIFInsert(entry_name, correction)
                    .then(data => { 
                        return Promise.all(data)
                    })
                    .then(data => {
                        return Promise.resolve(data.filter(e => e !== undefined))
                    })
                    .catch(error => {
                        console.log("Erro no download do GBIF para a espécie: " + entry_name[language_Entry.search_name])
                        console.log(error)
                        reject(new Error("Erro no download do GBIF para a espécie: " + entry_name[language_Entry.search_name]))
                    })
        })
};


const loadCorrection = async (obj) => {
    return new Promise(resolve => {
        try {
            if (!obj.name) {
                resolve(null)
            } else {
                getCorrectorGBIF(obj).then((data) => {
                    if (data.length > 0) {
                        resolve(data[0])
                    } else {
                        let url = "https://api.gbif.org/v1/species/match?name=" + obj.name;
                        axios
                            .get(url)
                            .then(response => {                                
                                    insertCorrectorGBIF({name: obj.name, correction: response.data}).then((data) => {
                                        getCorrectorGBIF(obj).then(data => {
                                            if (data.length > 0) {
                                                resolve(data[0])
                                            } else {
                                                resolve(null)
                                            }
                                        })
                                    }).catch(() => {
                                        resolve(null)
                                    })
                            }).catch(() => {
                            resolve(null)
                        })
                    }
                }).catch(() => {
                    resolve(null)
                })
            }
        } catch (e) {
            resolve(null)
        }
    })
}
const loadCorrectionOffline = async (obj) => {
    return new Promise(resolve => {
        try {
            getCorrectorGBIF({name: obj.name}).then((data) => {
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

const clearKeyNames = (o) => {
    var key, destKey, build, value

    build = {}        
    for (key in o) {
        value = o[key]
        destKey = key

        if (typeof value === "object") {
            value = clearKeyNames(value)
        } else {
            if (String(key).includes('.')){                
                destKey = key.replace(/\./g, '_')
            }            
        }       
        build[destKey] = value 
    }
    return build
}

export {
    loadCorrection,
    loadCorrectionOffline,
    downloadOcorrenceGBIF
}
