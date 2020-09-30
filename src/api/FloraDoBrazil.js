import * as db from "../db";
import axios from "axios";
import most_accurate from '../classifying_input'
import {language_Entry, language_FDB} from "../language/PTBR";
import {cancelSource} from "./utils"

const FDBfind = async (obj) => {
    return db.FDB.findOne(obj)
}

const FDBInsertOrUpdate = async (entry_name, obj) => {
    return db.FDB.findOne({entry_name: entry_name}).then(data => {
        if (!data) {
            return db.FDB.insert(obj)
        } else {
            return db.FDB.update({entry_name: entry_name}, obj).then(d => {
                return db.FDB.findOne({entry_name: entry_name}).then(data => {
                    return data
                })
            })
        }
    })
};

const _FDBSearch = async (entry_name2, entry_name, correction, synonym = null) => {
    return new Promise((resolve, reject) => {
        try {
            if (entry_name) {
                const consulta_taxon_name = axios.create({
                    baseURL: 'http://servicos.jbrj.gov.br/flora/taxon/',
                });
                const consulta_taxon_fixa_publica = 'http://floradobrasil.jbrj.gov.br/reflora/listaBrasil/ConsultaPublicaUC/ResultadoDaConsultaCarregaTaxonGrupo.do?&idDadosListaBrasil='

                consulta_taxon_name.get(entry_name, {cancelToken: cancelSource.token}).then(response => {
                    let result = response.data.result;
                    if (result && result.length === 1) {
                        let data = result[0];
                        if (data["taxonomicstatus"] === "NOME_ACEITO") {
                            axios.get(consulta_taxon_fixa_publica + data["taxonid"], {cancelToken: cancelSource.token}).then(response => {
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
                            _FDBSearch(entry_name2, data["NOME ACEITO"][0]["scientificname"], null, data).then(data => {
                                resolve(data)
                            }).catch(e => {
                                resolve(null)
                            })
                        }
                    } else if (result && result.length > 0) {
                        let index = most_accurate(result.map(item => item["scientificname"]), entry_name2);

                        let data = result[index];

                        if (data["taxonomicstatus"] === "NOME_ACEITO") {
                            axios.get(consulta_taxon_fixa_publica + data["taxonid"], {cancelToken: cancelSource.token}).then(response => {
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
                            _FDBSearch(entry_name2, data["NOME ACEITO"][0]["scientificname"], null, data).then(data => {
                                resolve(data)
                            }).catch(e => {
                                resolve(null)
                            })
                        }

                    } else {
                        if (correction) {
                            _FDBSearch(entry_name2, correction).then(data => {
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
    return db.FDB.findOne({entry_name: entry_name2}).then(data => {
        if (data) {
            return new Promise(resolve => {
                resolve(data)
            })
        } else {
            return _FDBSearch(entry_name2, entry_name, correction, synonym).then(data => {
                if (data){
                    data.accept.SINONIMO.map(e => {
                        e['scientificname'] = e['scientificname'].replace(e['scientificnameauthorship'].trim(), "(" + e['scientificnameauthorship'].trim() + ")")
                    })  
                    data.accept.scientificname =  data.accept.scientificname.replace(data.accept.scientificnameauthorship, "(" + data.accept.scientificnameauthorship + ")")
                    return FDBInsertOrUpdate(entry_name2, {...data, entry_name: entry_name2})
                }
            })
        }
    })
};

const FDBget = async (entry_name) => {
    return new Promise(resolve => {
        let new_accept = {
            [language_Entry.scientific_name]: '',
            [language_Entry.taxonomic_status]: '',
            [language_Entry.scientific_name_authorship]: '',
            [language_Entry.family]: '',
            [language_Entry.synonym]: '',
            [language_FDB.life_form]: '',
            [language_FDB.substrate]: '',
            [language_FDB.taxonomic_group]: '',
            [language_FDB.source]: '',
            [language_FDB.endemism]: '',
            [language_FDB.distribution]: '',
            [language_FDB.possible_distribution]: '',
            [language_FDB.phytogeographic_domains]: '',
            [language_FDB.vegetation]: ''
        };

        db.FDB.findOne(entry_name).then(item => {
            if (item) {
                let regExp = /\(([^)]+)\)/g;
                let regiao = ["Sul", "Sudeste", "Norte", "Nordeste", "CentroOeste"]
                let distribuicao = []
                let distribuicao2 = []
                regiao.forEach(i => {
                    let txt1 = item.ConsultaPublicaUC["distribuicaoGeograficaCerteza" + i]
                    let txt2 = item.ConsultaPublicaUC["distribuicaoGeograficaDuvida" + i]


                    let matches1 = txt1.match(regExp);
                    let matches2 = txt2.match(regExp);
                    if (matches1) {
                        distribuicao = distribuicao.concat(matches1[0].substring(1, matches1[0].length - 1).split(','))
                    }
                    if (matches2) {
                        distribuicao2 = distribuicao2.concat(matches2[0].substring(1, matches2[0].length - 1).split(','))
                    }
                });
                new_accept[language_FDB.distribution] = distribuicao.join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                new_accept[language_FDB.possible_distribution] = distribuicao2.join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                new_accept[language_Entry.synonym] = item.accept["SINONIMO"].map(item => item["scientificname"]).join(", ");

                let hierarchy = item.accept["higherclassification"].split(";")
                new_accept[language_FDB.taxonomic_group] = hierarchy[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                new_accept[language_Entry.family] = hierarchy[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                new_accept[language_Entry.scientific_name] = item.accept['genus'] + " " + item.accept['specificepithet'];
                new_accept[language_Entry.scientific_name_authorship] = item.accept['scientificnameauthorship'];
                new_accept[language_Entry.search] = new_accept[language_Entry.search] + " [" + (item.synonym ? language_Entry.is_synonym : language_Entry.is_accept) + "]";
                new_accept[language_Entry.taxonomic_status] = (item.synonym == null)? language_Entry.is_accept: language_Entry.is_synonym;

                new_accept[language_FDB.life_form] = item.ConsultaPublicaUC["formaVida"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                new_accept[language_FDB.substrate] = item.ConsultaPublicaUC["substrato"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                if (item.ConsultaPublicaUC["origem"])
                    new_accept[language_FDB.source] = item.ConsultaPublicaUC["origem"].normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                if (item.ConsultaPublicaUC["endemismo"])
                    new_accept[language_FDB.endemism] = item.ConsultaPublicaUC["endemismo"].normalize("NFD").replace(/[\u0300-\u036f]/g, "")

                new_accept[language_FDB.phytogeographic_domains] = item.ConsultaPublicaUC["dominioFitogeografico"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                new_accept[language_FDB.vegetation] = item.ConsultaPublicaUC["tipoVegetacao"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            }
            resolve(new_accept)
        })
    })
}
export {
    FDBSearch, FDBget, FDBfind
}
