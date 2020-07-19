import * as db from "../db";
import axios from "axios";
import Papa from "papaparse";
import most_accurate from '../classifying_input'
import {language_Entry} from "../language/PTBR";

const JSSoup = require('jssoup').default;

const TPLInsertOrUpdate = async (entry_name, obj) => {
    return db.plantsTPL.findOne({entry_name: entry_name}).then(data => {
        if (!data) {
            return db.plantsTPL.insert(obj)
        } else {
            return db.plantsTPL.update({entry_name: entry_name}, obj).then(d => {
                return db.plantsTPL.findOne({entry_name: entry_name}).then(data => {
                    return data
                })
            })
        }
    })


};
const _TPLSearch = async (entry_name2, entry_name, correction, synonym = null, filter = false) => {
    return new Promise((resolve, reject) => {
        try {
            if (entry_name) {

                const consulta_taxon_name = "http://www.theplantlist.org/tpl1.1/search?q=" + entry_name + "&csv=true"


                axios.get(consulta_taxon_name)
                    .then(response => {
                        let data = Papa.parse(response.data, {
                            header: true
                        });

                        let result = data.data;
                        let index = most_accurate(result.map(item => {
                            return item['Genus'] + " " + item['Species'] + " " + item['Authorship']
                        }), entry_name2);

                        if (result.length > 0) {
                            let item = result[index];

                            if (item["Taxonomic status in TPL"] === "Accepted") {
                                const consulta_taxon_fixa_publica = 'http://www.theplantlist.org/tpl1.1/record/' + item['ID'] + '?ref=tpl2'

                                axios.get(consulta_taxon_fixa_publica).then(response => {
                                    let soup = new JSSoup(response.data)
                                    let record = soup.find('tbody').contents.map(item => {
                                        return {
                                            name: item.contents[0].getText(' '),
                                            status: item.contents[1].getText(' '),
                                            source: item.contents[3].getText(' '),
                                        }
                                    });

                                    let obj = {
                                        entry_name: entry_name,
                                        accept: item,
                                        synonym: synonym,
                                        record: record
                                    };
                                    resolve(obj)
                                }).catch(err => {
                                    resolve(null)
                                })
                            } else {
                                _TPLSearch(entry_name2, item['Accepted ID'], null, item, true).then(data => {
                                    resolve(data)
                                }).then(e => {
                                    resolve(null)
                                })
                            }
                        } else {
                            if (correction) {
                                _TPLSearch(entry_name2, correction).then(data => {
                                    if (data) {
                                        resolve(data)
                                    } else {
                                        resolve(null)
                                    }
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

const TPLSearch = async (entry_name2, entry_name, correction = null, synonym = null) => {
    return db.plantsTPL.findOne({entry_name: entry_name2}).then(data => {
        if (data) {
            return new Promise(resolve => {
                resolve(data)
            })
        } else {
            return _TPLSearch(entry_name2, entry_name, correction, synonym).then(data => {
                if (data)
                    return TPLInsertOrUpdate(entry_name2, {...data, entry_name: entry_name2})
            })
        }
    })
};

const TPLget = async (entry_name) => {
    return new Promise(resolve => {
        let new_accept = {
            [language_Entry.search]: entry_name,
            [language_Entry.scientific_name]: '',
            [language_Entry.taxonomic_status]: '',
            [language_Entry.scientific_name_authorship]: '',
            [language_Entry.family]: '',
            [language_Entry.synonym]: ''
        };
        db.plantsTPL.findOne({entry_name: entry_name}).then(item => {
            if (item) {
                new_accept[language_Entry.synonym] = item.record.map(e => e.name).join(', ');

                new_accept[language_Entry.family] = item.accept.Family;

                new_accept[language_Entry.scientific_name] = item.accept['Genus'] + " " + item.accept['Species'];
                new_accept[language_Entry.scientific_name_authorship] = item.accept['Authorship'];
                new_accept[language_Entry.search] = new_accept[language_Entry.search] + " [" + (item.synonym ? language_Entry.is_synonym : language_Entry.is_accept) + "]"
                new_accept[language_Entry.taxonomic_status] = language_Entry.is_accept;
            }
            resolve(new_accept)
        })
    })
}

export {
    TPLSearch, TPLget
}
