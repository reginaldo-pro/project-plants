import * as db from "../db";

const insertOC = async (item) => {
    return await db.ocorrenciasSPLINK.insert(item)
}


const insertOcorrenciasSPLINK = async (entry) => {
    return await new Promise(resolve => {
        resolve(entry.map(item => {
            return db.ocorrenciasSPLINK.findOne(item).then(found => {
                if (found === null) {
                    return insertOC(item).then(item => {
                        console.log("insert", item)
                        return item
                    })
                }
                return found
            })
        }))
    })
}

const SPLINKUtils = (entry_name, array) => {
    return array.filter(e => e != null).map(item => {


        ['name_0', 'name_1', 'name_2', 'family', 'coleta'].map(key => {
            [6, 5, 4, 3, 2].map(sub => {
                let a = parseInt((item[key].length / sub))
                if (item[key].substring(0, a) === item[key].substring(a, a * 2))
                    item[key] = item[key].substring(0, a)
            })

        })

        item['lat'] = item['lat'].substring(3, item['lat'].length)
        item['long'] = item['long'].substring(4, item['long'].length)

        return {
            "entry_name": entry_name,
            "base de dados": 'SPLINK',
            'Nome cientifico sem autor': [...(new Set(item['name_0'].split(' ').concat(item['name_1'].split(' '))))].join(" "),
            'Familia': [...(new Set(item['family'].split(' ')))].join(" "),
            'pais': [...(new Set(item['pais'].split(' ')))].join(" "),
            'year': item['coleta'].length === 10 ? item['coleta'].substring(6, 10) : item['coleta'],
            'Month': item['coleta'].length === 10 ? item['coleta'].substring(3, 5) : item['coleta'],
            'Day': item['coleta'].length === 10 ? item['coleta'].substring(0, 2) : '',
            'Lat': item['lat'] ? parseFloat(item['lat']).toFixed(2) : '',
            'long': item['long'] ? parseFloat(item['long']).toFixed(2) : '',
        }
    })
}

const OccorrenceSPLINKInsert = async (entry_name) => {

    return await new Promise(resolve => {

        return db.ocorrenciasSPLINK.find({entry_name: entry_name}).then(local_data => {

            _download(entry_name, false, local_data.length).then(data => {
                console.log(entry_name, SPLINKUtils(entry_name, data))
                insertOcorrenciasSPLINK(SPLINKUtils(entry_name, data)).then((data) => {
                    resolve(local_data.concat(data))
                })

            })
        })
    })
};
// search

const _download = async (name, endOfRecords = false, offset = 0) => {
    let a = name.split(' ')
    name = a[0] + ' ' + a[1]
    return await new Promise(resolve => {
        if (endOfRecords === false && offset >= 0) {
            const chowdown = require('chowdown');
            let params = {
                ts_genus: name,
                extra: " withcords ",
                offset: offset
            }
            console.log(params)

            let collection = chowdown('http://www.splink.org.br/mod_perl/searchHint?' + Object.keys(params).map(key => {
                return key + "=" + params[key]
            }).join("&")
            )

            collection.collection('.record', {
                name_0: '.tGa',
                name_1: '.tEa',
                name_2: '.tA',
                family: '.tF',
                lat: '.lA',
                coleta: '.tY',
                pais: '.lC',
                long: '.lO'
            }).then(data => {
                data.shift();
                let results = data;
                console.log(data)
                collection.collection("#div_hint_summary", {
                    req_0: 'll:nth-child(1)',
                    offset: 'll:nth-child(2)',
                    next: 'td:nth-child(4) img/title'
                }).then(data => {
                    _download(name, !data['next'], offset + 100).then(data => {
                        data.shift();
                        resolve(data.concat(results))
                    })
                }).catch(() => {
                    alert("limite de acesso atingido para o site SPLINK!!")
                })

            })

        } else {
            resolve([])
        }
    })
}

const downloadOcorrenceSPLINK = async (entry_name) => {
    return await new Promise(resolve => {
        OccorrenceSPLINKInsert(entry_name).then(data => {
            resolve(data)
        })
    })
};

export {
    downloadOcorrenceSPLINK
}
