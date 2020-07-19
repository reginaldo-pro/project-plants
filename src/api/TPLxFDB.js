import {TPLget} from "./ThePlantList";
import {FDBget} from "./FloraDoBrazil";
import {language_Entry, language_FDB, language_TPL} from "../language/PTBR";

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

    item["Autores iguais"] = (FDB[language_Entry.scientific_name_authorship] === TPL[language_Entry.scientific_name_authorship]);

    item["Autores distintos"] = (FDB[language_Entry.scientific_name_authorship] !== TPL[language_Entry.scientific_name_authorship]);


    res = Object.filter(item, item => item === true)

    arr = Object.keys(res)
    return arr.join(", ")
}

const getTPLxFDB = (entry_name) => {
    return new Promise(resolve => {
        let new_accept = {
            [language_Entry.search]: entry_name,
            [language_Entry.scientific_name + ' ' + language_FDB.site]: '',
            [language_Entry.taxonomic_status + ' ' + language_FDB.site]: '',
            [language_Entry.scientific_name_authorship + ' ' + language_FDB.site]: '',
            [language_Entry.scientific_name + ' ' + language_TPL.site]: '',
            [language_Entry.taxonomic_status + ' ' + language_TPL.site]: '',
            [language_Entry.scientific_name_authorship + ' ' + language_TPL.site]: '',
        };


        let TPL = TPLget(entry_name);

        let FDB = FDBget(entry_name);

        FDB.then(item => {
            TPL.then(item2 => {
                new_accept[(language_Entry.scientific_name + ' ' + language_FDB.site)] = item[language_Entry.scientific_name];
                new_accept[(language_Entry.taxonomic_status + ' ' + language_FDB.site)] = item[language_Entry.taxonomic_status];
                new_accept[(language_Entry.scientific_name_authorship + ' ' + language_FDB.site)] = item[language_Entry.scientific_name_authorship];

                new_accept[(language_Entry.scientific_name + ' ' + language_TPL.site)] = item2[language_Entry.scientific_name];
                new_accept[(language_Entry.taxonomic_status + ' ' + language_TPL.site)] = item2[language_Entry.taxonomic_status];
                new_accept[(language_Entry.scientific_name_authorship + ' ' + language_TPL.site)] = item2[language_Entry.scientific_name_authorship];

                new_accept["FDB x TPL"] = relation(item, item2);

                resolve(new_accept)

            })
        })

    })
}

export {
    getTPLxFDB
}
