import * as db from "../db";
import {cancelSource} from "./utils";
import axios from "axios";
import Papa from "papaparse";
import e from "express";
import { getSpeciesAndAuthor } from "./index";


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
    if (entry_name.entry_name.includes("Mertensia zizyphoides") || entry_name.entry_name.includes("Aulomyrcia acutifolia") || entry_name.entry_name.includes("Erythroxylum amplifolium ")){
        debugger
    }
    let entry_name_without_author = getSpeciesAndAuthor(entry_name.entry_name)[0] //entry_name.replace(/[(].*[)]/, '').trim()
    let entries = array
        .filter(e => e !== null)
        .map(e => {
            let res_entry_name = getSpeciesAndAuthor(e.scientificName + ' (' + e.scientificNameAuthorship + ')').join(' ')

            if (!res_entry_name.includes(entry_name_without_author)){
                return
            }
            let res = {
                "entry_name": getSpeciesAndAuthor(entry_name.entry_name).join(' '),
                "found_name": res_entry_name,
                "accepted_name": getSpeciesAndAuthor(entry_name.accepted_name).join(' '),
                "base de dados": 'SPLINK',
                'familia': e.family,
                'pais': e.country,
                'year': e.year,
                'month': e.month ,
                'day': e.day,
                'lat': String(e.decimalLatitude).trim() !== '' ? parseFloat(String(e.decimalLatitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                'long': String(e.decimalLongitude).trim() !== '' ? parseFloat(String(e.decimalLongitude).replace(/[^\d.-]/g, '')).toFixed(2) : '',
            }
            return res
        })    
        .filter(e => e !== undefined)
        .filter(e => e['lat']!=="" || e['long']!=="")  

    const set = new Set(entries.map(item => JSON.stringify(item)));
    const dedup = [...set].map(item => JSON.parse(item));
    return dedup
}

const OccorrenceSPLINKInsert = (multi_entry_names) => {
    return new Promise((resolve,reject) => {
        let all_find = []
        multi_entry_names.forEach(entry_name => {
            all_find.push(db.ocorrenciasSPLINK.find({entry_name: entry_name.entry_name}))
        })

        Promise.all(all_find)
            .then(ocor_locais => {   
                ocor_locais = ocor_locais.filter(e => e.length > 0)       
                let names  = multi_entry_names.map(e =>{
                    return (getSpeciesAndAuthor(e.entry_name)[0])
                })

                let all_sp = []   
                _download(encodeURI(names.join("/")))
                    .then(data => {
                        for (var sp_name of multi_entry_names) {
                            console.log(sp_name)
                            console.log("----")
                            let res = SPLINKUtils(sp_name, data)
                            if (res.length>0){                                
                                all_sp.push(insertOcorrenciasSPLINK(res))                                    
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
            return Promise.resolve(data)
        })
        .catch(error => {
            console.log("Erro no download do SPL para a espécie: " + multi_entry_names)
            console.log(error)
            return Promise.reject(new Error("Erro no download do SPL para a espécie: " + multi_entry_names))
        })
};

export {
    downloadOcorrenceSPLINK
}
