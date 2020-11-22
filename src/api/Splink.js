import { db } from "../db";
import {cancelSource} from "./utils";
import axios from "axios";
import { getSpeciesAndAuthor, getSpeciesAndAuthorNames, getSpeciesName } from "./index";
import { language_Entry } from "../language/PTBR";


const insertOcorrenciasSPLINK = (entry) => {
    let _res = entry
        .map(item => {
            let key = {
                found_name: item.found_name,
                year: item.year,
                month: item.month,
                day: item.day,
                long: item.long,
                lat: item.lat
            }

                let _found = db.ocorrenciasSPLINK.findOne(key)               
                if (!_found) {
                    db.ocorrenciasSPLINK.insert(item)
                    return item
                }
        })
        .filter(e => e!== undefined)
    db.ocorrenciasSPLINK.sync()
    return Promise.resolve(_res)
}

const SPLINKUtils = (entry_name, array) => {
    let entry_name_without_author = getSpeciesAndAuthorNames(entry_name[language_Entry.search_name])

    let entries = array
        .filter(e => e !== null)
        .map(e => {            
            let res_entry_name = getSpeciesAndAuthorNames(e.scientificName +  ' (' + e.scientificNameAuthorship + ')')

            if (res_entry_name.includes(entry_name_without_author)){              
                let res = {
                    "entry_name": entry_name[language_Entry.search_name],
                    "found_name": res_entry_name,
                    "accepted_name": entry_name[language_Entry.accepted_name],
                    "base de dados": 'SPL',
                    'familia': e.family,
                    'pais': e.country,
                    'year': e.year,
                    'month': e.month ,
                    'day': e.day,
                    'lat': (e.decimalLatitude && String(e.decimalLatitude).trim() !== '') ? parseFloat(String(e.decimalLatitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                    'long': (e.decimalLatitude && String(e.decimalLongitude).trim() !== '') ? parseFloat(String(e.decimalLongitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                }
                return res
            }
        })    
        .filter(e => e !== undefined)
        .filter(e => e['lat']!=="" || e['long']!=="")

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
    return db.ocorrenciasSPLINK.find(query ? query : {})
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
