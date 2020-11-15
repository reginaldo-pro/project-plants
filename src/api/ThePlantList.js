import * as db from "../db";
import axios from "axios";
import Papa from "papaparse";
import most_accurate from '../classifying_input'
import {language_Entry} from "../language/PTBR";
import { getSpeciesAndAuthor, getSpeciesName, removeInfraSpeciesRank } from "./index";

const JSSoup = require('jssoup').default;

const TPLInsertOrUpdate = async (obj) => {
    let key = {}
    key[language_Entry.search_name] =  obj[language_Entry.search_name]
    key[language_Entry.found_name] =  obj[language_Entry.found_name]
    key[language_Entry.accepted_name] =  obj[language_Entry.accepted_name]

    return db.TPL.findOne(key)
        .then(data => {
            if (!data) {
                return db.TPL.insert(obj)
            } 
        })
};

const _TPLCorrection = (search_name) => {
    const consulta_taxon_name = "http://www.theplantlist.org/tpl1.1/search?q=" + search_name + "&csv=true"

    return axios.get(consulta_taxon_name)
        .then(response => {
            let data = Papa.parse(response.data, {
                header: true
            })
            
            let result = data.data
                .filter(e => (e.ID !== "" && (e["Taxonomic status in TPL"] === "Accepted" || e["Taxonomic status in TPL"] === "Synonym")))
                
            let index = most_accurate(result.map(e => {
                return getSpeciesAndAuthor(e['Genus'] + " " + e['Species'] + " " + e['Infraspecific rank'] + " " + e['Infraspecific epithet'] + " " + e['Authorship']).join(' ')
            }), search_name)

            if (index >= 0){
                return Promise.resolve(result[index])
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
                                            return removeInfraSpeciesRank(getSpeciesAndAuthor(_name).join(' '))
                                        }         
                                                                
                                    })    
                                    .filter(e => e !== undefined)
                                
                                if (syn_list.length>0){
                                    syn_list = syn_list.reduce((a, c) => (c ? a + ", " + c : a))
                                }
                            }
                            else {
                                syn_list = []
                            }
                                    
                            let obj = {}
                            obj[language_Entry.search_name] = search_name
                            obj[language_Entry.found_name] = getSpeciesAndAuthor(result['Genus'].trim() + " " + result['Species'].trim() + " " + result['Infraspecific epithet'].trim() + " " + result['Authorship'].trim()).join(' ')
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
                            obj[language_Entry.found_name] = getSpeciesAndAuthor(result['Genus'].trim() + " " + result['Species'].trim()+ " " + result['Infraspecific epithet'].trim() + " " + result['Authorship'].trim()).join(' ')
                            obj[language_Entry.accepted_name] = removeInfraSpeciesRank(getSpeciesAndAuthor(soup.findAll('h1')[1].find('span', {'class': 'name'}).getText(' ').trim()).join(' '))
                            obj[language_Entry.synonyms] = []
                            obj[language_Entry.family] = soup.findAll('i', 'family')[0].getText().trim()
                            obj["results"] = result
                            obj["details"] = soup.contents[1].getText(' ')
                                      
                            return Promise.resolve(obj)
                        })                
                }
            }
            else {
                return Promise.resolve(null)
            }
        })
}

const TPLSearch = (search_name) => {
    let key = {}
    search_name = removeInfraSpeciesRank(getSpeciesName(search_name))
    key[language_Entry.search_name] = search_name
    
    return db.TPL.findOne(key).then(data => {
        if (data) {
            return Promise.resolve(data)
        } else {
            return _TPLSearch(search_name)
                .then(data => {       

                    if (data){
                        console.log("TPL >--- " + search_name)
                        return TPLInsertOrUpdate(data)
                    }
                })
        }
    })
};

const TPLfind = async (obj) => {
    return db.TPL.findOne(obj)
}

const TPLget = async (search_name) => {
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

        db.TPL.findOne(key)
            .then(item => {
                if (item) {                                        
                    new_accept[language_Entry.search_name] = item[language_Entry.search_name]
                    new_accept[language_Entry.found_name] = item[language_Entry.found_name]
                    new_accept[language_Entry.accepted_name] = item[language_Entry.accepted_name]

                    new_accept[language_Entry.taxonomic_status] = (item[language_Entry.accepted_name] !== item[language_Entry.found_name]) 
                        ? language_Entry.is_synonym 
                        : language_Entry.is_accept

                    if (item[language_Entry.synonyms].length > 0){
                        new_accept[language_Entry.synonyms] = item[language_Entry.synonyms]
                    }                    
                    new_accept[language_Entry.family] = item[language_Entry.family] 
                }
                resolve(new_accept)              
            })
    })
}

export {
    TPLSearch, TPLget, TPLfind
}
