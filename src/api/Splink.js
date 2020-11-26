import { db } from "../db";
import axios from "axios";
import { getSpeciesAndAuthorNames, getSpeciesName, removeInfraSpeciesRank } from "./index";
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


const insertOcorrenciasSPLINK = (entry) => {
    return db.ocorrenciasDB.insert(entry)
}

const SPLINKUtils = (entry_name, array) => {
    let entry_name_without_author = getSpeciesName(entry_name[language_Entry.search_name])

    let entries = array
        .filter(e => e !== null)
        .map(e => {            
            let res_entry_name = (e.scientificNameAuthorship) 
                ? removeInfraSpeciesRank(getSpeciesAndAuthorNames(e.scientificName +  ' (' + e.scientificNameAuthorship + ')'))
                : removeInfraSpeciesRank(getSpeciesAndAuthorNames(e.scientificName))

            let res_entry_name_without_author = removeInfraSpeciesRank(getSpeciesName(e.scientificName))

            if (res_entry_name_without_author === entry_name_without_author){              
                let res = {
                    "entry_name": entry_name[language_Entry.search_name],
                    "found_name": res_entry_name,
                    "accepted_name": entry_name[language_Entry.accepted_name],
                    "base_de_dados": 'SPL',
                    'familia': e.family ? e.family : '',
                    'pais': e.countryCode ? e.countryCode : '',
                    'year': e.year ? e.year : '',
                    'month': e.month ? e.month : '',
                    'day': e.day ? e.day : '',
                    'lat': (e.decimalLatitude && String(e.decimalLatitude).trim() !== '') ? parseFloat(String(e.decimalLatitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                    'long': (e.decimalLatitude && String(e.decimalLongitude).trim() !== '') ? parseFloat(String(e.decimalLongitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                }
                return res
            }
        })    
        .filter(e => (e !== undefined) && (e['lat']!=="" || e['long']!==""))

    const set = new Set(entries.map(item => JSON.stringify(item)));
    const dedup = [...set].map(item => JSON.parse(item));
    return dedup
}

const OccorrenceSPLINKInsert = (multi_entry_names) => {
    return new Promise((resolve,reject) => {   
        let keyNames  = multi_entry_names
            .map(e =>{
                return (getSpeciesName(e.key))
            })
            .filter(e => e !== undefined)

        let spNames = multi_entry_names
            .reduce((a, c) => {
                a.push(...c.values)
                return a
            }, [])
            
        let all_sp = []            
        _download(encodeURI(keyNames.join("/")))
            .then(data => {                        
                for (let spName of spNames) {                            
                    console.log("SPL---- " + spName[language_Entry.search_name])   
                    if (spName[language_Entry.accepted_name].trim() !== ''){          
                        let res = SPLINKUtils(spName, data)                        
                        if (res.length>0){                                
                            all_sp.push(insertOcorrenciasSPLINK(res))                                    
                        }      
                    }          
                }
                Promise.all(all_sp).then(e => {               
                    resolve(e)
                })
            })
            .catch(error => {
                reject(error)
            })
        })
}
// search

const _download = async (sp_names) => {
    return await new Promise((resolve,reject) => {
        axios.get(
            'http://api.splink.org.br/records/ScientificName/' + sp_names + '/Synonyms/flora2020/Format/JSON'
          ).then(response =>{
                console.log("[SPL] Download de: " + response.data.result.length + " ocorrências.")
                resolve(response.data.result)
          }).catch(er => {
              reject(er)
          })
    })    
}

const downloadOcorrenceSPLINK = async (multi_entry_names) => {
    return  OccorrenceSPLINKInsert(multi_entry_names)
        .then(data => {    
            let res = data.filter(e => e !== undefined)
            return Promise.resolve(res)
        })
        .catch(error => {
            console.log("Erro no download do SPL para a espécie: " + multi_entry_names.map(e => e[language_Entry.found_name]))
            console.log(error)
            return Promise.reject(new Error("Erro no download do SPL para a espécie: " + multi_entry_names.map(e => e[language_Entry.found_name])))
        })
};


const getSPLINKOccurrences = async (query) => {
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
    downloadOcorrenceSPLINK,
    getSPLINKOccurrences
}
