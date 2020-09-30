// Corrector GBIF
import axios from "axios";
import { trim } from "jquery";
import * as db from "../db";
import {cancelSource} from "./utils";

const insertOC = async (item) => {
    return await db.ocorrenciasGBIF.insert(item)
}


const insertOcorrenciasGBIF = async (entry) => {
    return await new Promise(resolve => {
        resolve(entry.map(item => {
            let key = {
                entry_name: item.entry_name,
                year: item.year,
                Month: item.Month,
                Day: item.Day,
                long: item.long,
                Lat: item.Lat
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

const GBIFutils = (entry_name, array) => {
    let entry_name_without_author = entry_name.replace(/[(].*[)]/, '').trim()

    let entries = array.
        filter(e => e != null)
        .map(item => {
            let author = item['scientificName'].split(item['genericName'] + " " + item['specificEpithet'])[1]
            let res_entry_name = item['scientificName'].replace(author, "").trim()

            if (author){
                author = author.trim()
                if (author.match("[A-Z]")){
                    author = "(" + author.trim() + ")"
                } 
            } else {
                author = ""
            }

            res_entry_name = res_entry_name.trim() + " " + author.trim()

            if (!res_entry_name.includes(entry_name_without_author)){
                if (!(item['acceptedScientificName'].includes(entry_name_without_author))){
                    return
                }
            }
            if (item['Lat']==="" || item['long']===""){
                return
            }

            return {
                "entry_name": res_entry_name,
                "base de dados": 'GBIF',
                'Nome cientifico sem autor': item['species'] ? item['species'] : '',
                'Familia': item['family'] ? item['family'] : '',
                'pais': item['countryCode'] ? item['countryCode'] : '',
                'year': item['year'] ? item['year'] : '',
                'Month': item['month'] ? item['month'] : '',
                'Day': item['day'] ? item['day'] : '',
                'Lat': item['decimalLatitude'] ? parseFloat(String(item['decimalLatitude']).replace(/[^\d.-]/g, '')).toFixed(2) : '',
                'long': item['decimalLongitude'] ? parseFloat(String(item['decimalLongitude']).replace(/[^\d.-]/g, '')).toFixed(2) : '',
            }
        })
        .filter(e => e !== undefined)

    const set = new Set(entries.map(item => JSON.stringify(item)));
    const dedup = [...set].map(item => JSON.parse(item));
           
    return dedup
}

const OccorrenceGBIFInsert = async (entry_name, usageKey, name) => {
    return new Promise((resolve, reject) => {
        let day0 = new Date(1000, 1, 1, 0, 0).toJSON().slice(0, 10).replace(/-/g, '-')

        let today = new Date()
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toJSON().slice(0, 10).replace(/-/g, '-');
        return db.ocorrenciasGBIF.find({entry_name: name}).then(local_data => {
            var data_down = null
            if (local_data.length === 0) {
                data_down = _download(usageKey, false, 0, day0, today)
            } else {
                var last = local_data[local_data.length - 1].updatedAt
                last = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).toJSON().slice(0, 10).replace(/-/g, '-');
                data_down = _download(usageKey, false, 0, last, today)                
            }

            data_down
                .then(data => {
                    let res = GBIFutils(name, data)
                    insertOcorrenciasGBIF(res).then((data) => {
                        resolve(data)
                })

            }).catch((e) => {
                reject(e)
            })
        })
    })
};
// search

const _download = (taxon_key, endOfRecords = false, offset = 0, dateFrom, dateTo) => {
    return new Promise((resolve, reject) => {
        if (endOfRecords === false && offset >= 0) {
            let url = "https://www.gbif.org/api/occurrence/search"

            axios.get(url, {
                cancelToken: cancelSource.token,
                params: {
                    advanced: false,
                    locale: 'en',
                    taxon_key: taxon_key,
                    limit: 300,
                    offset: offset,
                    lastInterpreted: dateFrom + "," + dateTo,
                    hasCoordinate: true
                }
            }).then(response => {
                if (response.status === 200) {
                    let data = response.data;
                    let results = data['results'];
                    _download(taxon_key, data['endOfRecords'] ? data['endOfRecords'] : true, data['offset'] + 300).then(data => {
                        resolve(data.concat(results))
                    }).catch((e) => {
                        reject(e)
                    })
                } else {
                    resolve([])
                }

            }).catch((e) => reject(e))

        } else {
            resolve([])
        }
    })
}

const downloadOcorrenceGBIF = (entry_name) => {
    return loadCorrection({name: entry_name})
        .then(data => { 
            return OccorrenceGBIFInsert(entry_name, data['correction']['usageKey'], entry_name)
                    .then(data => { 
                        return Promise.all(data)
                    })
                    .then(data => {
                        return Promise.resolve(data.filter(e => e !== undefined))
                    })
                    .catch(error => {
                        console.log("Erro no download do GBIF para a espécie: " + entry_name)
                        console.log(error)
                        throw new Error("Erro no download do GBIF para a espécie: " + entry_name)
                    })
        })
};


const loadCorrection = async (obj) => {
    return new Promise(resolve => {
        try {
            if (!obj.name) {
                resolve({})
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
export {
    loadCorrection,
    loadCorrectionOffline,
    downloadOcorrenceGBIF
}
