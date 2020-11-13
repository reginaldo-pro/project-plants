import * as db from "../db";
import {cancelSource} from "./utils";
import axios from "axios";
import Papa from "papaparse";
import e from "express";
import { getSpeciesAndAuthor } from "./index";
import { language_Entry } from "../language/PTBR";


const insertOC = async (item) => {
    return await db.ocorrenciasSPLINK.insert(item)
}

const insertOcorrenciasSPLINK = (entry) => {
    let all_inserts = []
    entry.map(item => {
        let key = {
            found_name: item.found_name,
            year: item.year,
            month: item.month,
            day: item.day,
            long: item.long,
            lat: item.lat
        }
        all_inserts.push(
            db.ocorrenciasSPLINK.findOne(key)
                .then(found => {   
                    if (found === null) {
                        return insertOC(item)
                            .then(item => {
                                return item
                            })
                    } 
                })
        )    
    })
    return Promise.all(all_inserts)
        .then(ins => {
            return Promise.resolve(ins.filter(e => e!== undefined))
        })
}

const SPLINKUtils = (entry_name, array) => {
    let entry_name_without_author = getSpeciesAndAuthor(entry_name[language_Entry.search_name])[0] 
    let entries = array
        .filter(e => e !== null)
        .map(e => {            
            let res_entry_name = getSpeciesAndAuthor(e.scientificName + " " + e.infraspecificEpithet + ' (' + e.scientificNameAuthorship + ')').join(' ').trim()

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
                    'lat': String(e.decimalLatitude).trim() !== '' ? parseFloat(String(e.decimalLatitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                    'long': String(e.decimalLongitude).trim() !== '' ? parseFloat(String(e.decimalLongitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                }
                return res
            }
        })    
        .filter(e => e !== undefined)
        .filter(e => e['lat']!=="" || e['long']!=="")

    if (entries.length === 0){
        entries.push({entry_name: entry_name[language_Entry.search_name], found_name:'', accepted_name:'', "base de dados": 'SPL'})
    }

    const set = new Set(entries.map(item => JSON.stringify(item)));
    const dedup = [...set].map(item => JSON.parse(item));
    return dedup
}

const OccorrenceSPLINKInsert = (multi_entry_names) => {
    return new Promise((resolve,reject) => {
        let all_find = []
        multi_entry_names.forEach(entry_name => {
            all_find.push(db.ocorrenciasSPLINK.find({entry_name: entry_name[language_Entry.search_name]}))
        })

        Promise.all(all_find)
            .then(ocor_locais => {                        
                ocor_locais = ocor_locais.filter(e => e.length > 0)       
                let names  = multi_entry_names
                    .map(e =>{
                        if (e[language_Entry.accepted_name].trim() !== '')
                            return (getSpeciesAndAuthor(e[language_Entry.search_name])[0])
                    })
                    .filter(e => e !== undefined)

                if (names.length===0){
                    var res = (multi_entry_names.map(e => ({entry_name: e[language_Entry.search_name], found_name:'', accepted_name:'', "base de dados": 'SPL',}))) 
                    return resolve(res)
                }    

                let all_sp = []            
                _download(encodeURI(names.join("/")))
                    .then(data => {                        
                        for (var sp_name of multi_entry_names) {                            
                            console.log("SPL---- " + sp_name[language_Entry.search_name])   
                            if (sp_name[language_Entry.accepted_name].trim() !== ''){              
                                let res = SPLINKUtils(sp_name, data)
                                if (res.length>0){                                
                                    all_sp.push(insertOcorrenciasSPLINK(res))                                    
                                }      
                            }
                            else {
                                all_sp.push(Promise.resolve([{entry_name: sp_name[language_Entry.search_name], found_name:'', accepted_name:'', accepted_name:'', "base de dados": 'SPL'}]))
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
    })
}
// search

const _download = async (sp_names) => {
    return await new Promise((resolve,reject) => {
        axios.get(
            'http://api.splink.org.br/records/ScientificName/' + sp_names + '/Synonyms/flora2020'
          ).then(response =>{
                let res =  Papa.parse(response.data, {
                    header: true
                })
                console.log("[SPL] Download de: " + res.data.length + " ocorrências.")
              
                resolve(res.data.filter(e => e.seq !== ''))
          }).catch(er => {
              reject(er)
          })
    })    
}

const downloadOcorrenceSPLINK = (multi_entry_names) => {
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

export {
    downloadOcorrenceSPLINK
}
