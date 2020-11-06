import * as db from "../db";
import axios from "axios";
import Papa from "papaparse";
import most_accurate from '../classifying_input'
import {language_Entry} from "../language/PTBR";

const JSSoup = require('jssoup').default;

const TPLInsertOrUpdate = async (entry_name, obj) => {
    return db.TPL.findOne({entry_name: entry_name}).then(data => {
        if (!data) {
            return db.TPL.insert(obj)
        } else {
            return db.TPL.update({entry_name: entry_name}, obj).then(d => {
                return db.TPL.findOne({entry_name: entry_name}).then(data => {
                    return data
                })
            })
        }
    })


};


const _TPLCorrection = (entry_name) => {
    const consulta_taxon_name = "http://www.theplantlist.org/tpl1.1/search?q=" + entry_name + "&csv=true"

    return axios.get(consulta_taxon_name)
        .then(response => {
            let data = Papa.parse(response.data, {
                header: true
            });
            
            let result = data.data
                .filter(e => (e.ID !== "" && (e["Taxonomic status in TPL"] === "Accepted" || e["Taxonomic status in TPL"] === "Synonym")))
                
            let index = most_accurate(result.map(e => {
                return e['Genus'] + " " + e['Species'] + " " + e['Authorship']
            }), entry_name)

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

const _TPLSearch = (entry_name) => {
    return _TPLCorrection(entry_name)
        .then(result => {
            if (result){
                if (result["Taxonomic status in TPL"] === "Accepted") {                    
                    let consulta_taxon_fixa_publica = 'http://www.theplantlist.org/tpl1.1/record/' + result['ID'] + '?ref=tpl2'
                    return axios.get(consulta_taxon_fixa_publica)
                        .then(response => {
                            let soup = new JSSoup(response.data)
                            let syn_list = soup.find('tbody').contents.map(item => {                                     
                                var _last_one = item.contents[0].contents[0].contents[0].contents.length - 1
                                var _name = item.contents[0].getText(' ')                                        
                                var _author = item.contents[0].contents[0].contents[0].contents[_last_one].getText(' ')
                                _name = _name.replace(_author, "(" + _author.trim() + ")")                                
                                return {
                                    entry_name: entry_name,
                                    accept: _name,
                                    synonym: item.contents[1].getText() ? entry_name : item.contents[1].getText(),
                                    result: null
                                }
                            })

                            let infra_epi = result['Infraspecific epithet'].trim().length > 0 
                                ? (result['Infraspecific rank'].trim() + " " + result['Infraspecific epithet'].trim() + " ")
                                : ""                            
                            syn_list.push({
                                entry_name: entry_name,
                                accept: result['Genus'] + " " + result['Species'] + " " + infra_epi + result['Authorship'],
                                synonym: null,
                                result: result
                            })                            
                            return Promise.resolve(syn_list)
                        })
                } else {
                    let consulta_taxon_fixa_publica = 'http://www.theplantlist.org/tpl1.1/record/' + result['Accepted ID'] + '?ref=tpl2'
                    return axios.get(consulta_taxon_fixa_publica)
                        .then(response => {
                            let soup = new JSSoup(response.data)

                            let complete_name = soup.findAll('h1')[1].find('span', {'class': 'name'}).getText(' ')
                            let infra_epi = result['Infraspecific epithet'].trim().length > 0 
                                ? (result['Infraspecific rank'].trim() + " " + result['Infraspecific epithet'].trim() + " ")
                                : ""   
                            
                            return Promise.resolve(
                                [{
                                    entry_name: entry_name,
                                    accept: result['Genus'] + " " + result['Species'] + " " + infra_epi + result['Authorship'],
                                    synonym: complete_name,
                                    result: result
                                }]
                            )
                        })                
                }
            }
            else {
                return Promise.resolve(null)
            }
        })
}

const TPLSearch = (entry_name) => {
    return db.TPL.findOne({entry_name: entry_name}).then(data => {
        if (data) {
            return Promise.resolve(data)
        } else {
            return _TPLSearch(entry_name)
                .then(data => {                    
                    if (data){
                        return TPLInsertOrUpdate(entry_name, {...data, entry_name: entry_name})
                    }
                    else {
                        return Promise.resolve(null)
                    }
                })
        }
    })
};

const TPLfind = async (obj) => {
    return db.TPL.findOne(obj)
}
const TPLget = async (entry_name) => {
    return new Promise(resolve => {
        let new_accept = {
            [language_Entry.scientific_name]: '',
            [language_Entry.taxonomic_status]: '',
            [language_Entry.scientific_name_authorship]: '',
            [language_Entry.family]: '',
            [language_Entry.synonym]: ''
        };
        db.TPL.findOne(entry_name).then(item => {
            if (item) {
                new_accept[language_Entry.synonym] = item.record.map(e => e.name).join(', ');

                new_accept[language_Entry.family] = item.accept.Family;

                new_accept[language_Entry.scientific_name] = item.accept['Genus'] + " " + item.accept['Species'];
                new_accept[language_Entry.scientific_name_authorship] = item.accept['Authorship'];
                new_accept[language_Entry.search] = new_accept[language_Entry.search] + " [" + (item.synonym ? language_Entry.is_synonym : language_Entry.is_accept) + "]"
                new_accept[language_Entry.taxonomic_status] = (item.synonym == null)? language_Entry.is_accept: language_Entry.is_synonym;
            }
            resolve(new_accept)
        })
    })
}

export {
    TPLSearch, TPLget, TPLfind
}
