// Corrector GBIF
import axios from "axios";
import * as db from "../db";

const insertOC = async (item) => {
    return await db.ocorrenciasGBIF.insert(item)
}


const insertOcorrenciasGBIF = async (entry) => {
    return await new Promise(resolve => {
        resolve(entry.map(item => {
            return db.ocorrenciasGBIF.findOne(item).then(found => {
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
    return array.filter(e => e != null).map(item => {
        return {
            "entry_name": entry_name,
            "base de dados": 'GBIF',
            'Nome cientifico sem autor': item['species'] ? item['species'] : '',
            'Familia': item['family'] ? item['family'] : '',
            'pais': item['countryCode'] ? item['countryCode'] : '',
            'year': item['year'] ? item['year'] : '',
            'Month': item['month'] ? item['month'] : '',
            'Day': item['day'] ? item['day'] : '',
            'Lat': item['decimalLatitude'] ? parseFloat(item['decimalLatitude']).toFixed(2) : '',
            'long': item['decimalLongitude'] ? parseFloat(item['decimalLongitude']).toFixed(2) : '',
        }
    })
}

const OccorrenceGBIFInsert = async (entry_name, usageKey, name) => {

    return new Promise(resolve => {
        let day0 = new Date(1000, 1, 1, 0, 0).toJSON().slice(0, 10).replace(/-/g, '-')

        let today = new Date()
        today = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toJSON().slice(0, 10).replace(/-/g, '-');
        return db.ocorrenciasGBIF.find({entry_name: name}).then(local_data => {
            if (local_data.length === 0) {
                _download(usageKey, false, 0, day0, today).then(data => {

                    insertOcorrenciasGBIF(GBIFutils(name, data)).then((data) => {
                        resolve(data)
                    })

                })

            } else {
                let last = local_data[local_data.length - 1].updatedAt
                last = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).toJSON().slice(0, 10).replace(/-/g, '-');

                _download(usageKey, false, 0, last, today).then(data => {
                    let res = GBIFutils(name, data)
                    insertOcorrenciasGBIF(res).then((data) => {
                        resolve(local_data.concat(data))
                    })

                })
            }
        })
    })
};
// search

const _download = (taxon_key, endOfRecords = false, offset = 0, dateFrom, dateTo) => {
    return new Promise(resolve => {
        if (endOfRecords === false && offset >= 0) {
            let url = "https://www.gbif.org/api/occurrence/search"

            axios.get(url, {
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
                    })
                } else {
                    resolve([])
                }

            })

        } else {
            resolve([])
        }
    })
}

const downloadOcorrenceGBIF = async (entry_name, usageKey) => {
    return await new Promise(resolve => {
        OccorrenceGBIFInsert(entry_name, usageKey, entry_name).then(data => {
            resolve(data)
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
