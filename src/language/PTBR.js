const utf8_to_latin1 = function (s) {
    return unescape(encodeURIComponent(s));
};
const latin1_to_utf8 = function (s) {
    return decodeURIComponent(escape(s));
};
const language_TPL = {
    site: "The Plant List",
}
const language_FDB = {
    site: "Flora do Brasil",
    life_form: "Forma de Vida",
    substrate: 'Substrato',
    taxonomic_group: ("Grupo Taxonómico"),
    source: 'Origem',
    endemism: 'Endemismo',
    distribution: ("Distribuição"),
    possible_distribution: ("Possível Distribuição"),
    phytogeographic_domains: ("Domínios Fitogeográfico"),
    vegetation: ("Vegetação")
}

const language_Entry = {
    search: "NOME PESQUISADO",
    scientific_name: ("Nome científico"),
    scientific_name_authorship: ("Autor aceito"),
    taxonomic_status: ("Status taxonômico"),
    family: ("Família"),
    synonym: ("Sinônimos"),
    is_synonym: ("Sinônimo"),
    is_accept: ("Taxonômico Aceito"),
}

export {
    language_FDB, language_Entry, language_TPL
}
