import * as db from "../db";
import axios from "axios";
import most_accurate from '../classifying_input'

const FDBInsertOrUpdate = async (entry_name, obj) => {
    return db.plantsFloraDoBrazil.findOne({entry_name: entry_name}).then(data => {
        if (!data) {
            return db.plantsFloraDoBrazil.insert(obj)
        } else {
            return db.plantsFloraDoBrazil.update({entry_name: entry_name}, obj).then(d => {
                return db.plantsFloraDoBrazil.findOne({entry_name: entry_name}).then(data => {
                    return data
                })
            })
        }
    })
};

const _FDBSearch = async (entry_name2,entry_name, correction, synonym = null) => {
    return new Promise((resolve, reject) => {
        try {
            if (entry_name) {
                const consulta_taxon_name = axios.create({
                    baseURL: 'http://servicos.jbrj.gov.br/flora/taxon/',
                });
                const consulta_taxon_fixa_publica = 'http://floradobrasil.jbrj.gov.br/reflora/listaBrasil/ConsultaPublicaUC/ResultadoDaConsultaCarregaTaxonGrupo.do?&idDadosListaBrasil='

                consulta_taxon_name.get(entry_name).then(response => {
                    let result = response.data.result;
                    if (result && result.length === 1) {
                        let data = result[0];
                        if (data["taxonomicstatus"] === "NOME_ACEITO") {
                            axios.get(consulta_taxon_fixa_publica + data["taxonid"]).then(response => {
                                let obj = {
                                    entry_name: entry_name,
                                    accept: data,
                                    synonym: synonym,
                                    ConsultaPublicaUC: response.data
                                };
                                resolve(obj)
                            }).catch(e => {
                                resolve(null)
                            })
                        } else {
                            _FDBSearch(entry_name2,data["NOME ACEITO"][0]["scientificname"], null, data).then(data => {
                                resolve(data)
                            }).catch(e => {
                                resolve(null)
                            })
                        }
                    } else if (result && result.length > 0) {
                        let index = most_accurate(result.map(item => item["scientificname"]), entry_name2);

                        let data = result[index];

                        if (data["taxonomicstatus"] === "NOME_ACEITO") {
                            axios.get(consulta_taxon_fixa_publica + data["taxonid"]).then(response => {
                                let obj = {
                                    entry_name: entry_name,
                                    accept: data,
                                    synonym: synonym,
                                    ConsultaPublicaUC: response.data
                                };
                                resolve(obj)
                            }).catch(e => {
                                resolve(null)
                            })
                        } else {
                            _FDBSearch(entry_name2,data["NOME ACEITO"][0]["scientificname"], null, data).then(data => {
                                resolve(data)
                            }).catch(e => {
                                resolve(null)
                            })
                        }

                    } else {
                        if (correction) {
                            _FDBSearch(entry_name2,correction).then(data => {
                                resolve(data)
                            }).catch(e => {
                                resolve(null)
                            })
                        } else {
                            resolve(null)
                        }
                    }
                }).catch(e => {
                    resolve(null)
                })
            } else {
                resolve(null)
            }
        } catch (e) {
            return null
        }

    })
}

const FDBSearch = async (entry_name2, entry_name, correction = null, synonym = null) => {
    return db.plantsFloraDoBrazil.findOne({entry_name: entry_name2}).then(data => {
        if (data) {
            return new Promise(resolve => {
                resolve(data)
            })
        } else {
            return _FDBSearch(entry_name2,entry_name, correction, synonym).then(data => {
                if (data)
                    return FDBInsertOrUpdate(entry_name2, {...data, entry_name: entry_name2})
            })
        }
    })
};


export {
    FDBSearch
}
