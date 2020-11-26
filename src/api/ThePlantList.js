import { db } from "../db";
import axios from "axios";
import Papa from "papaparse";
import { most_accurate }  from '../classifying_input'
import {language_Entry} from "../language/PTBR";
import { getSpeciesAndAuthorNames, getSpeciesName, removeInfraSpeciesRank } from "./index";

const JSSoup = require('jssoup').default;

const _TPLCorrection = (search_name) => {
    const consulta_taxon_name = "http://www.theplantlist.org/tpl1.1/search?q=" + search_name + "&csv=true"

    return axios.get(consulta_taxon_name)
        .then(response => {
            let data = Papa.parse(response.data, {
                header: true
            })
            
            let result = data.data
                .filter(e => (e.ID !== "" && (e["Taxonomic status in TPL"] === "Accepted" || e["Taxonomic status in TPL"] === "Synonym")))
            
            let _res = most_accurate(result.map(e => {
                return getSpeciesAndAuthorNames(e['Genus'] + " " + e['Species'] + " " + e['Infraspecific epithet'] + " " + e['Authorship'])
            }), search_name)

            if (_res){
                result = result.filter(e => {
                    let _spName = removeInfraSpeciesRank(getSpeciesAndAuthorNames(e['Genus'] + " " + e['Species'] + " " + e['Infraspecific epithet'] + " " + e['Authorship']))
                    return _spName === _res
                })                
                return Promise.resolve(result[0])
            } 
            else {
                return Promise.resolve(null)
            }
        })
        .catch(e =>{
            return Promise.resolve(null)
        })
} 

const _TPLSearch = (search_name) => {
    return _TPLCorrection(search_name)
        .then(result => {  
            if (result){                
                if (result["Taxonomic status in TPL"] === "Accepted") {                             
                    let consulta_taxon_fixa_publica = 'http://www.theplantlist.org/tpl1.1/record/' + result['ID'] + '?ref=tpl2'                    
                    return axios.get(consulta_taxon_fixa_publica)
                        .then(response => {                            
                            let soup = new JSSoup(response.data)
                            let syn_list = soup.find('tbody')
                            
                            if (syn_list){
                                syn_list = syn_list.contents
                                    .map(item => {
                                        var _last_one = item.contents[0].contents[0].contents[0].contents.length - 1
                                        var _name = item.contents[0].getText(' ')                                        
                                        var _author = item.contents[0].contents[0].contents[0].contents[_last_one].getText(' ')
                                        _name = _name.replace(_author, "(" + _author.trim() + ")")     
                                                        
                                        if (item.contents[1].getText().trim() === "Synonym" && !_name.includes('[Invalid]') && !_name.includes('[Illegitimate]')){
                                            return removeInfraSpeciesRank(getSpeciesAndAuthorNames(_name))
                                        }         
                                                                
                                    })    
                                    .filter(e => e !== undefined)
                                
                                if (syn_list.length>0){
                                    syn_list = syn_list.join(", ")
                                }
                            }
                            else {
                                syn_list = []
                            }
                                    
                            let obj = {}
                            obj[language_Entry.search_name] = search_name
                            obj[language_Entry.found_name] = getSpeciesAndAuthorNames(result['Genus'] + " " + result['Species'] + " " + result['Infraspecific epithet'] + " " + result['Authorship'])
                            obj[language_Entry.accepted_name] = obj[language_Entry.found_name]
                            obj[language_Entry.synonyms] = syn_list
                            obj[language_Entry.family] = soup.findAll('i', 'family')[0].getText().trim()
                            obj["results"] = result
                            obj["details"] = (soup.find('tbody')) ? soup.find('tbody').getText(' ').trim() : ''
                                 
                            return Promise.resolve(obj)
                        })
                } else {
                    let consulta_taxon_fixa_publica = 'http://www.theplantlist.org/tpl1.1/record/' + result['Accepted ID'] + '?ref=tpl2'
                    return axios.get(consulta_taxon_fixa_publica)
                        .then(response => {
                            let soup = new JSSoup(response.data)
                            
                            let obj = {}
                            obj[language_Entry.search_name] = search_name
                            obj[language_Entry.found_name] = getSpeciesAndAuthorNames(result['Genus'] + " " + result['Species'] + " " + result['Infraspecific epithet'] + " " + result['Authorship'])
                            obj[language_Entry.accepted_name] = removeInfraSpeciesRank(getSpeciesAndAuthorNames(soup.findAll('h1')[1].find('span', {'class': 'name'}).getText(' ')))
                            obj[language_Entry.synonyms] = []
                            obj[language_Entry.family] = soup.findAll('i', 'family')[0].getText().trim()                                    
                            return Promise.resolve(obj)
                        })                
                }
            }
            else {
                return Promise.resolve(null)
            }
        })
}

const TPLSearch = async (search_name) => {
    let key = {}
    search_name = removeInfraSpeciesRank(getSpeciesAndAuthorNames(search_name))
    key[language_Entry.search_name] = search_name
    
    let _tpl = db.TPL.findOne(key)
    
    if (_tpl) {
        return _tpl
    } else {
        return await _TPLSearch(search_name)
            .then(data => { 
                if (data){
                    console.log("TPL >--- " + search_name)
                    db.TPL.insert(data)
                    db.TPL.sync()
                }
                return data
            })
    }
};

const TPLfind = async (obj) => {
    return db.TPL.findOne(obj)
}

const TPLget = async (search_name) => {
    search_name = removeInfraSpeciesRank(getSpeciesAndAuthorNames(search_name))
    return new Promise(resolve => {
        let new_accept = {
            [language_Entry.search_name]: search_name,
            [language_Entry.found_name]: '',
            [language_Entry.accepted_name]: '',
            [language_Entry.synonyms]: '',
            [language_Entry.taxonomic_status]: '',
            [language_Entry.family]: ''            
        }

        let key = {}        
        key[language_Entry.search_name] = search_name
        let _item = db.TPL.findOne(key)
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
        }
        resolve(new_accept)              
    })
}

export {
    TPLSearch, TPLget, TPLfind
}
