import * as db from "../db";
import {cancelSource} from "./utils";

const insertOC = async (item) => {
    return await db.ocorrenciasSPLINK.insert(item)
}


const insertOcorrenciasSPLINK = async (entry) => {
    return await new Promise(resolve => {
        resolve(entry.map(item => {
            return db.ocorrenciasSPLINK.findOne(item).then(found => {
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

const SPLINKUtils = (entry_name, array) => {
    let entry_name_without_author = entry_name.replace(/[(].*[)]/, '').trim()

    let entries = array
        .filter(e => e != null)
        .map(item => {
            ['name_0', 'name_1', 'name_2', 'family', 'coleta'].map(key => {
                [6, 5, 4, 3, 2].map(sub => {
                    let a = parseInt((item[key].length / sub))
                    if (item[key].substring(0, a) === item[key].substring(a, a * 2))
                        item[key] = item[key].substring(0, a)
                })

            })

            item['lat'] = item['lat'].substring(3, item['lat'].length)
            item['long'] = item['long'].substring(4, item['long'].length)

            item['name_0'] = item['name_0'].trim() ? item['name_0'].trim() : item['name_s_0'].trim()
            item['name_1'] = item['name_1'].trim() ? item['name_1'].trim() : item['name_s_1'].trim()


            let res_entry_name = [...(new Set(item['name_0'].split(' ').concat(item['name_1'].split(' ').concat("(" + item['name_2'].split(' ') + ")"))))].join(" ").replace(/ +(?= )/g,'')
            res_entry_name = res_entry_name.replace(" ()", "")

            if (!res_entry_name.includes(entry_name_without_author) || item['Lat']==="" || item['long']===""){
                return
            }

            return {
                "entry_name": res_entry_name,
                "base de dados": 'SPLINK',
                'Nome cientifico sem autor': [...(new Set(item['name_0'].split(' ').concat(item['name_1'].split(' '))))].join(" ").replace(/ +(?= )/g,''),
                'Familia': [...(new Set(item['family'].split(' ')))].join(" "),
                'pais': [...(new Set(item['pais'].split(' ')))].join(" "),
                'year': item['coleta'].length === 10 ? item['coleta'].substring(6, 10) : item['coleta'],
                'Month': item['coleta'].length === 10 ? item['coleta'].substring(3, 5) : item['coleta'],
                'Day': item['coleta'].length === 10 ? item['coleta'].substring(0, 2) : '',
                'Lat': item['lat'] ? parseFloat(String(item['lat']).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                'long': item['long'] ? parseFloat(String(item['long']).replace(/[^\d.-]/g, '')).toFixed(2) : '',
            }
        })
        .filter(e => e !== undefined)
        
    const set = new Set(entries.map(item => JSON.stringify(item)));
    const dedup = [...set].map(item => JSON.parse(item));

    return dedup
}

const OccorrenceSPLINKInsert = async (entry_name) => {
    return await new Promise((resolve,reject) => {
        return db.ocorrenciasSPLINK.find({entry_name: entry_name})
            .then(local_data => {
                    _download(entry_name, false, local_data.length)
                        .then(data => {
                            let res = SPLINKUtils(entry_name, data)
                            insertOcorrenciasSPLINK(res)
                                .then((data) => {
                                    resolve(local_data.concat(data))
                                })        
                        })
                        .catch(error => reject(error))
            })
    })
};
// search

const _download = async (name, endOfRecords = false, offset = 0) => {
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

const downloadOcorrenceSPLINK = async (entry_name) => {
    return await new Promise((resolve, reject) => {
        OccorrenceSPLINKInsert(entry_name).then(data => {
            resolve(data)
        }).catch(error => reject(error))
    })
};

export {
    downloadOcorrenceSPLINK
}
