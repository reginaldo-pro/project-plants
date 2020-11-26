import { db } from "../db";
import axios from "axios";
import { most_accurate }  from '../classifying_input'
import {language_Entry, language_FDB} from "../language/PTBR";
import {cancelSource} from "./utils"
import { getSpeciesAndAuthorNames, getSpeciesName, removeInfraSpeciesRank } from "./index";

const FDBfind = async (obj) => {
    return db.FDB.findOne(obj)
}

const _FDBSearch = async (search_name) => {
    const consulta_taxon_name = axios.create({
        baseURL: 'http://servicos.jbrj.gov.br/flora/taxon/',
    })
    const consulta_taxon_fixa_publica = 'http://floradobrasil.jbrj.gov.br/reflora/listaBrasil/ConsultaPublicaUC/ResultadoDaConsultaCarregaTaxonGrupo.do?&idDadosListaBrasil='

    return  consulta_taxon_name.get(search_name, {cancelToken: cancelSource.token})
        .then(response => { 
            let result = response.data.result
            let data = null

            if (result){
                if (result.length === 1){
                    data = result[0]
                }
                else if (result.length > 0){
                    let index = most_accurate(result.map(item => item["scientificname"]), search_name)
                    data = result[index]
                }                
            }   
            if (data) {
                return axios.get(consulta_taxon_fixa_publica + data["taxonid"], {cancelToken: cancelSource.token})
                    .then(response => {    
                        let accepted_name = ''
                        if ((data["taxonomicstatus"] === "SINONIMO")){
                            if (data["NOME ACEITO"]){
                                if (data["NOME ACEITO"].length === 1){
                                    accepted_name = removeInfraSpeciesRank(getSpeciesAndAuthorNames(data["NOME ACEITO"][0].scientificname))
                                }
                                else if (data["NOME ACEITO"].length > 1){
                                    //debugger
                                    accepted_name = data["NOME ACEITO"]
                                        .map(e  => {
                                            return (removeInfraSpeciesRank(getSpeciesAndAuthorNames(e["scientificname"])))
                                        })
                                        .join(", ")  
                                }
                            }
                        } else {
                            accepted_name = removeInfraSpeciesRank(getSpeciesAndAuthorNames(data["scientificname"]))
                        }
        
                        let obj = {}
                        obj[language_Entry.search_name] = search_name
                        obj[language_Entry.found_name] = removeInfraSpeciesRank(getSpeciesAndAuthorNames(data["scientificname"]))
                        obj[language_Entry.accepted_name] = accepted_name

                        if (data.SINONIMO && data.SINONIMO.length > 0){
                            obj[language_Entry.synonyms] = data.SINONIMO.map(e  => {
                                return (removeInfraSpeciesRank(getSpeciesAndAuthorNames(e["scientificname"])))
                            })
                            .join(", ") 
                        } 
                        else {
                            obj[language_Entry.synonyms] = []
                        }

                        let hierarchy = data["higherclassification"].split(";")
                        obj[language_Entry.family] = hierarchy[2].normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(' ')[0]
                        obj[language_FDB.taxonomic_group] = hierarchy[1].normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                        let distribuicao = []
                        let distribuicao2 = []
                        let regioes = ["Sul", "Sudeste", "Norte", "Nordeste", "CentroOeste"]
                        regioes.forEach(i => {
                            let txt1 = response.data["distribuicaoGeograficaCerteza" + i]
                            let txt2 = response.data["distribuicaoGeograficaDuvida" + i]

                            let matches1 = (txt1) ? txt1.match(/\(([^)]+)\)/g) : ''
                            let matches2 = (txt2) ? txt2.match(/\(([^)]+)\)/g) : ''
                            if (matches1) {
                                distribuicao = distribuicao.concat(matches1[0].substring(1, matches1[0].length - 1).split(','))
                            }
                            if (matches2) {
                                distribuicao2 = distribuicao2.concat(matches2[0].substring(1, matches2[0].length - 1).split(','))
                            }
                        })       

                        obj[language_FDB.distribution] = distribuicao.join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        obj[language_FDB.possible_distribution] = distribuicao2.join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")

                        obj[language_FDB.life_form] = (response.data["formaVida"]) 
                            ? response.data["formaVida"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            : ''

                        obj[language_FDB.substrate] = (response.data["substrato"]) 
                            ? response.data["substrato"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            : ''

                        obj[language_FDB.source] = (response.data["origem"])
                            ? response.data["origem"].normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            : ''

                        obj[language_FDB.endemism] =  (response.data["endemismo"])
                            ? response.data["endemismo"].normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            : ''

                        obj[language_FDB.phytogeographic_domains] = (response.data["dominioFitogeografico"]) 
                            ? response.data["dominioFitogeografico"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            : ''

                        obj[language_FDB.vegetation] = (response.data["tipoVegetacao"]) 
                            ? response.data["tipoVegetacao"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                            : ''

                        return Promise.resolve(obj) 
                    })
                    .catch(() =>{
                        return Promise.resolve(null)    
                    })
            } else {
                return Promise.resolve(null)
            }            
        })
        .catch(() =>{
            return Promise.resolve(null)
        })
}

const FDBSearch = async (search_name) => {
    let key = {}
    search_name = removeInfraSpeciesRank(getSpeciesAndAuthorNames(search_name))
    key[language_Entry.search_name] = search_name

    let _fdb = db.FDB.findOne(key)

    if (_fdb) {
        return _fdb
    } else {
        return await _FDBSearch(search_name)
            .then(data => {           
                console.log("FDB >--- " + search_name)
                if (data){
                    db.FDB.insert(data)
                    db.FDB.sync()
                }
                return data
            })
    }

}


const FDBget = async (search_name) => {
    search_name = removeInfraSpeciesRank(getSpeciesAndAuthorNames(search_name))
    return new Promise(resolve => {
        let new_accept = {
            [language_Entry.search_name]: search_name,
            [language_Entry.found_name]: '',
            [language_Entry.accepted_name]: '',
            [language_Entry.taxonomic_status]: '',
            [language_Entry.family]: '',
            [language_Entry.synonyms]: '',
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

        let key = {}
        key[language_Entry.search_name] = search_name
        
        let _item = db.FDB.findOne(key)
        if (_item) {          
            new_accept[language_Entry.search_name] = _item[language_Entry.search_name]
            new_accept[language_Entry.found_name] = _item[language_Entry.found_name]
            new_accept[language_Entry.accepted_name] = _item[language_Entry.accepted_name]
            
            new_accept[language_Entry.taxonomic_status] = (_item[language_Entry.accepted_name] !== _item[language_Entry.found_name]) 
                ? language_Entry.is_synonym 
                : language_Entry.is_accept

            if (_item[language_Entry.synonyms].length > 0){
                new_accept[language_Entry.synonyms] = _item[language_Entry.synonyms]
            }
            new_accept[language_Entry.family] = _item[language_Entry.family]
            new_accept[language_FDB.distribution] = _item[language_FDB.distribution]
            new_accept[language_FDB.possible_distribution] = _item[language_FDB.possible_distribution]
            new_accept[language_FDB.taxonomic_group] = _item[language_FDB.taxonomic_group]
            new_accept[language_FDB.life_form] =  _item[language_FDB.life_form]
            new_accept[language_FDB.substrate] = _item[language_FDB.substrate]
            new_accept[language_FDB.source] = _item[language_FDB.source]
            new_accept[language_FDB.endemism] =  _item[language_FDB.endemism] 
            new_accept[language_FDB.phytogeographic_domains] = _item[language_FDB.phytogeographic_domains]
            new_accept[language_FDB.vegetation] = _item[language_FDB.vegetation]
        }                
        resolve(new_accept)

    })
}
export {
    FDBSearch, FDBget, FDBfind
}
