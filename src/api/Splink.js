import * as db from "../db";
import {cancelSource} from "./utils";
import axios from "axios";
import Papa from "papaparse";
import e from "express";

const insertOC = async (item) => {
    return await db.ocorrenciasSPLINK.insert(item)
}

const dropSpLDB = async (item) => {
    return await db.ocorrenciasSPLINK.remove({ }, { multi: true }, function (err, numRemoved) {
        db.ocorrenciasSPLINK.loadDatabase();
      });
}


const insertOcorrenciasSPLINK = (entry) => {
    let all_inserts = []
    entry.map(item => {
        let key = {
            entry_name: item.entry_name,
            year: item.year,
            Month: item.Month,
            Day: item.Day,
            long: item.long,
            Lat: item.Lat
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
}

const SPLINKUtils = (entry_name, array) => {
    let entry_name_without_author = entry_name.replace(/[(].*[)]/, '').trim()
    let entries = array
        .filter(e => e != null && e.decimalLatitude !== '' && e.decimalLongitude !== '' && e.scientificName.includes(entry_name_without_author))
        .map(e => {
            return {
                "entry_name": e.scientificNameAuthorship !== '' ? e.scientificName + ' (' + e.scientificNameAuthorship + ')' : e.scientificName,
                "accept": entry_name_without_author,
                "base de dados": 'SPLINK',
                'Nome cientifico sem autor': e.scientificName,
                'Familia': e.family,
                'pais': e.country,
                'year': e.year,
                'Month': e.month ,
                'Day': e.day,
                'Lat': parseFloat(e.decimalLatitude.replace(/[^\d.-]/g, '')).toFixed(2),
                'long': parseFloat(e.decimalLongitude.replace(/[^\d.-]/g, '')).toFixed(2),
            }
        })      

    const set = new Set(entries.map(item => JSON.stringify(item)));
    const dedup = [...set].map(item => JSON.parse(item));
    return dedup
}

const OccorrenceSPLINKInsert = (multi_entry_names) => {
    return new Promise((resolve,reject) => {
        let all_find = []
        multi_entry_names.forEach(entry_name => {
            all_find.push(db.ocorrenciasSPLINK.find({entry_name: entry_name}))
        })

        Promise.all(all_find)
            .then(ocor_locais => {   
                ocor_locais = ocor_locais.filter(e => e.length > 0)       
                let names  = multi_entry_names.map(e =>{
                    return (e.split('(')[0]).trim()
                })
                let all_sp = []
                let all_sp_names = []       

                _download(encodeURI(names.join("/")))
                    .then(data => {
                        for (var sp_name of multi_entry_names) {
                            let res = SPLINKUtils(sp_name, data)
                            if (res.length>0){                                
                                all_sp.push(insertOcorrenciasSPLINK(res))
                                all_sp_names.push(sp_name)                                        
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
              
                resolve(res.data.filter(e => e.seq !== ''))
          }).catch(er => {
              reject(er)
          })
    })    
}

const __download = async (name, endOfRecords = false, offset = 0) => {
    let a = name.split(' ')
    name = a[0] + ' ' + a[1]
    return await new Promise((resolve,reject) => {
        if (endOfRecords === false && offset >= 0) {
            const chowdown = require('chowdown');
            let params = {
                ts_genus: name,
                extra: " withcords ",
                offset: offset
            }

            let collection = chowdown('http://www.splink.org.br/mod_perl/searchHint?' + Object.keys(params).map(key => {
                return key + "=" + params[key]
            }).join("&")
            , {cancelToken: cancelSource.token})


            collection.collection('.record', {
                name_0: '.tGa',
                name_1: '.tEa',
                name_2: '.tA',
                name_s_0: '.tGs',
                name_s_1: '.tEs',
                family: '.tF',
                lat: '.lA',
                coleta: '.tY',
                pais: '.lC',
                long: '.lO'})
                    .then(data => {
                        data.shift();
                        let results = data;
                        collection.collection("#div_hint_summary", {
                            req_0: 'll:nth-child(1)',
                            offset: 'll:nth-child(2)',
                            next: 'td:nth-child(4) img/title'})
                                .then(data => {
                                    _download(name, !data['next'], offset + 100)
                                        .then(data => {
                                            data.shift();
                                            resolve(data.concat(results))
                                        }).catch(error => reject(e))
                                })
                                .catch(e => reject(e))
                    })
                    .catch(er=> reject(er))
        } else {
            resolve([])
        }
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
    downloadOcorrenceSPLINK, dropSpLDB
}
