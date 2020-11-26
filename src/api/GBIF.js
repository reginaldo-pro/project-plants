// Corrector GBIF
import axios from "axios";
import { db } from "../db";
import { cancelSource } from "./utils";
import { sleep, getSpeciesName, getSpeciesAndAuthorNames, removeInfraSpeciesRank } from "./index";
import { language_Entry } from "../language/PTBR";
import * as rax from 'retry-axios';

axios.defaults.raxConfig = {
    retry: 5,
    retryDelay: 5000,
    backoffType: 'linear',
    onRetryAttempt: err => {
        const cfg = rax.getConfig(err);
        console.log(`Retry attempt #${cfg.currentRetryAttempt}`);
    }
};
const interceptorId = rax.attach();


const insertOcorrenciasGBIF = async (entry) => {
    return db.ocorrenciasDB.insert(entry)
}


const GBIFutils = (entry_name, usageKey, array) => {
    let entry_name_without_author = getSpeciesName(entry_name[language_Entry.search_name]) 
    let entries = array
        .filter(e => e != null)
        .map(e => {
            let res_entry_name = (e.scientificNameAuthorship) 
                ? removeInfraSpeciesRank(getSpeciesAndAuthorNames(e.scientificName +  ' (' + e.scientificNameAuthorship + ')'))
                : removeInfraSpeciesRank(getSpeciesAndAuthorNames(e.scientificName))

            let res_entry_name_without_author = removeInfraSpeciesRank(getSpeciesName(e.scientificName))
            

            if (res_entry_name_without_author === entry_name_without_author){                
                let res =  {
                    "entry_name": entry_name[language_Entry.search_name],
                    "found_name": res_entry_name,
                    "accepted_name": entry_name[language_Entry.accepted_name],
                    "base_de_dados": 'GBIF',
                    'familia': e.family ? e.family : '',
                    'pais': e.countryCode ? e.countryCode : '',
                    'year': e.year ? e.year : '',
                    'month': e.month ? e.month : '',
                    'day': e.day ? e.day : '',
                    'lat': (e.decimalLatitude && String(e.decimalLatitude).trim() !== '') ? parseFloat(String(e.decimalLatitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                    'long': (e.decimalLongitude && String(e.decimalLongitude).trim() !== '') ? parseFloat(String(e.decimalLongitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                }
                return res
            }
        })
        .filter(e => (e !== undefined) && (e['lat']!=="" || e['long']!==""))
    

    const set = new Set(entries.map(item => JSON.stringify(item)));
    const dedup = [...set].map(item => JSON.parse(item));           
    return dedup
}

const OccorrenceGBIFInsert = async (multi_entry_names) => {
    return new Promise((resolve, reject) => {  
        loadCorrection({name: multi_entry_names.key})
        .then(correction => {                       
            let usageKey = (correction && (correction['matchType']))
                ? correction['usageKey']
                : null

            if (usageKey){
                let spNames = multi_entry_names.values
                _download(usageKey, 0)           
                    .then(async data => {    
                        for (let spName of spNames) {                                                            
                            console.log("GBIF ---- " + spName[language_Entry.search_name])
                            let res = GBIFutils(spName, usageKey, data)    
                            insertOcorrenciasGBIF(res)
                                .then((data) => {
                                    resolve(data)
                                })   
                        }                                                                              
                    })
                    .catch((e) => {
                        reject(e)
                    })                
            }
            else {
                resolve([])
            }
        })
    })
}


const _download = (taxon_key, offset = 0) => {
    return new Promise((resolve, reject) => {
            axios.get("https://api.gbif.org/v1/occurrence/search", {
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
                    
                    if (results)
                        console.log("[GBIF] Download de: " + results.length + " ocorrências. (" + taxon_key + ")")
                    else 
                        console.log("[GBIF] Download de ocorrências. (" + taxon_key + ")")

                    if (finished){
                        resolve(results)
                    } else {
                        sleep(1000)
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

const downloadOcorrenceGBIF = (multi_entry_names) => {
    return OccorrenceGBIFInsert(multi_entry_names)
        .then(data => {
            let res = data.filter(e => e !== undefined)
            return Promise.resolve(res)
        })
        .catch(error => {
            console.log("Erro no download do GBIF para a espécie: " + multi_entry_names.key)
            console.log(error)
            reject(new Error("Erro no download do GBIF para a espécie: " + multi_entry_names.key))
        })
};


const loadCorrection = async (obj) => {
    return new Promise(resolve => {
        try {
            if (!obj.name) {
                resolve(null)
            } else {
                let _correction = db.correctorGBIF.findOne(obj)
                if (_correction && _correction.length > 0) {
                    resolve(_correction[0])
                } else {
                    axios
                        .get("https://api.gbif.org/v1/species/match?name=" + obj.name + "&strict=true")
                        .catch(error => reject(error))
                        .then(response => {                                          
                            if (!response.data || (response.data.matchType && response.data.matchType !== "EXACT")){
                                resolve(null)
                            }
                            db.correctorGBIF.insert({entry_name: obj.name, correction: response.data})
                            db.correctorGBIF.sync()
                            resolve(response.data)
                        }).catch(() => {
                            resolve(null)
                        })
                }
            }
        } catch (e) {
            resolve(null)
        }
    })
}

const clearKeyNames = (o) => {
    let key, destKey, build, value

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

const getGBIFOccurrences = async (query) => {
    return db.ocorrenciasDB.find(query ? query : {})
        .then(occur => {
            let res = occur
                .map(e => {
                        delete e['_id']
                        delete e['createdAt']
                        delete e['updatedAt']

                        return e
                })
            return Promise.resolve(res)
        })     
}

export {
    loadCorrection,
    downloadOcorrenceGBIF,
    getGBIFOccurrences
}
