import {TPLget} from "./ThePlantList";
import {FDBget} from "./FloraDoBrazil";
import {language_Entry, language_FDB, language_TPL} from "../language/PTBR";
import { getSpeciesAndAuthor } from ".";

Object.filter = (obj, predicate) =>
    Object.keys(obj)
        .filter(key => predicate(obj[key]))
        .reduce((res, key) => (res[key] = obj[key], res), {});

const relation = (FDB, TPL) => {
    let item = {
        "Apenas FDB": (FDB[language_Entry.taxonomic_status] && !TPL[language_Entry.taxonomic_status]) ? true : false,
        "Apenas TPL": (!FDB[language_Entry.taxonomic_status] && TPL[language_Entry.taxonomic_status]) ? true : false,
        "Nenhum": (!FDB[language_Entry.taxonomic_status] && !TPL[language_Entry.taxonomic_status])
    };
    let res = Object.filter(item, item => item === true);
    let arr = Object.keys(res);
    if (arr.length > 0)
        return arr.join(", ");

    item["Status igual"] = (FDB[language_Entry.taxonomic_status] === TPL[language_Entry.taxonomic_status]);

    item["Status distintos"] = (FDB[language_Entry.taxonomic_status] !== TPL[language_Entry.taxonomic_status]);

    item["Autores iguais"] = (getSpeciesAndAuthor(FDB[language_Entry.accepted_name])[1] === getSpeciesAndAuthor(TPL[language_Entry.accepted_name])[1]);

    item["Autores distintos"] = (getSpeciesAndAuthor(FDB[language_Entry.accepted_name])[1] !== getSpeciesAndAuthor(TPL[language_Entry.accepted_name])[1]);


    res = Object.filter(item, item => item === true)

    arr = Object.keys(res)
    return arr.join(", ")
}

const getTPLxFDB = (search_name) => {
    return new Promise(resolve => {        
        let new_accept = {
            [language_Entry.search_name]: search_name,
            [language_Entry.found_name + ' ' + language_FDB.site]: '',
            [language_Entry.found_name + ' ' + language_TPL.site]: '', 
            [language_Entry.accepted_name + ' ' + language_FDB.site]: '',
            [language_Entry.accepted_name + ' ' + language_TPL.site]: '',
            [language_Entry.taxonomic_status + ' ' + language_FDB.site]: '',
            [language_Entry.taxonomic_status + ' ' + language_TPL.site]: ''
        }

        let TPL = TPLget(search_name)
        let FDB = FDBget(search_name)

        FDB.then(item_fdb => {
            TPL.then(item_tpl => {
                new_accept[(language_Entry.accepted_name + ' ' + language_FDB.site)] = item_fdb[language_Entry.accepted_name];
                new_accept[(language_Entry.found_name + ' ' + language_FDB.site)] = item_fdb[language_Entry.found_name]; 
                new_accept[(language_Entry.taxonomic_status + ' ' + language_FDB.site)] = item_fdb[language_Entry.taxonomic_status];

                new_accept[(language_Entry.accepted_name + ' ' + language_TPL.site)] = item_tpl[language_Entry.accepted_name];
                new_accept[(language_Entry.found_name + ' ' + language_TPL.site)] = item_fdb[language_Entry.found_name]; 
                new_accept[(language_Entry.taxonomic_status + ' ' + language_TPL.site)] = item_tpl[language_Entry.taxonomic_status];
                

                new_accept["FDB x TPL"] = relation(item_fdb, item_tpl);

                resolve(new_accept)
            })
        })

    })
}

export {
    getTPLxFDB
}
