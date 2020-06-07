<template>
    <div>
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <a class="navbar-brand left" v-on:click.stop="$router.back()" href="#">Voltar</a>
            <div class="navbar-nav justify-content-center">
                <a class="nav-item nav-link active text-center" href="#">{{csv}} <span class="sr-only">(current)</span></a>
                <a class="nav-item nav-link active text-center" href="#" v-on:click.stop="toCSV">Clique para Baixar
                    Planilha</a>
            </div>
        </nav>
        <div class="pt5 nb5" id="standard-sizes" v-if="completedSteps !== totalSteps">

            <div :class="box_cls" :style="box_style">
                <div :class="label_cls" class="text-center">Loading data<strong></strong></div>
                <progress-bar size="tiny" :val="(completedSteps/totalSteps )*100"
                              :text="'Completo: '+ completedSteps +' de ' + totalSteps"/>
            </div>

        </div>
        <div class="table-responsive-lg">

            <table class="table text-center" v-if="completedSteps > 0">
                <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col" v-for="(item, index) in header">{{item}}</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(item, index) in items" :key="index">
                    <th scope="row">{{ index }}</th>
                    <th scope="row" v-for="(item2, index) in item" v-if="item">{{item2}}</th>

                </tr>
                </tbody>
            </table>
        </div>

    </div>
</template>

<script>
    import vue2Dropzone from "vue2-dropzone";
    import ProgressBar from "vue-simple-progress";
    import {getEntries, loadFDBOffline, loadGBIFOffline, loadTPLOffline} from "../../api";
    import {loadCorrection} from "../../api/GBIF";
    import Papa from "papaparse";

    export default {
        name: "BaseOnline",
        components: {
            vueDropzone: vue2Dropzone,
            ProgressBar
        },
        created() {
            this.csv = this.$route.params.csv;
            this.site_a = this.$route.params.site_a;
            this.site_b = this.$route.params.site_b;
            this.loadPage(this.csv)
        },
        data() {
            return {
                totalSteps: 1,
                completedSteps: 0,
                csv: "",
                site_a: "",
                site_b: "",
                items: [],
                header: [],
                synonym: "Sinonimo",
                accept: "Taxon aceito"
            }
        },
        computed: {
            version() {
                return VERSION
            },
            header_cls() {
                return 'db mt5 pb3 dark-gray hover-blue lh-1 no-underline'
            },
            box_cls() {
                return 'db pt3 pb4 ph3 ph0-l relative'
            },
            box_style() {
                return 'min-height: 100px'
            },
            label_cls() {
                return 'mb4 f6 fw6 dark-gray'
            },
            cell_cls() {
                return 'ph1 pv1 ba b--moon-gray'
            }
        },
        methods: {
            relationx2: function (a, b) {
                let eqTrue = a.status === b.status && a.status === this.accept;
                let eqFalse = a.status === b.status && a.status === this.synonym;
                let cond = eqTrue || (eqFalse && a.name === b.name);
                return cond ? "Igual" : "Diferente"
            },
            toCSV: function () {
                console.log(this.items)
                let csv = Papa.unparse(this.items, {
                    quotes: true, //or array of booleans
                    quoteChar: '"',
                    escapeChar: '"',
                    delimiter: ";",
                    header: true,
                    newline: "\r\n",
                    skipEmptyLines: false,
                    columns: null
                });
                let hiddenElement = document.createElement('a');
                hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
                hiddenElement.target = '_blank';
                hiddenElement.download = this.$options.name + ".csv";
                hiddenElement.click();
            },
            getName(initials) {
                if (initials === "GBIF") return "Global Biodiversity Information Facility";
                else if (initials === "TPL") return "The Plant List";
                else return "Flora do Brasil"
            },
            load_None(obj) {
                return new Promise(resolve => {
                    resolve(null)
                })
            },
            load_FDB(obj) {
                let fail = {
                    "Nome Pesquisado": obj.name,
                    "Nome Cientifico": '',
                    "Status do Taxon": '',
                    'Familia': '',
                    "Sinonimos": '',
                    "Forma de Vida": '',
                    "Substrato": '',
                    'Grupo Taxonomico ': '',
                    "Origem": '',
                    "Endemismo": '',
                    "Distribuicao": '',
                    "Possivel Distribuicao": '',
                    "Dominios Fitogeografico": '',
                    "Vegetacao": ''
                }


                return loadFDBOffline({
                    name: obj.name
                }).then((item) => {
                    if (!item.entry_name) {
                        let new_accept = fail
                        if (this.header.length === 0) {
                            this.header = Object.keys(new_accept)
                        }
                        return new_accept
                    }
                    let new_accept;
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
                    })
                    let synonym = item.accept["SINONIMO"].map(item => item["scientificname"]);
                    let hierarchy = item.accept["higherclassification"].split(";")
                    let name = item.entry_name + " [" + (item.synonym ? this.synonym : this.accept) + "]"
                    new_accept = {
                        "Nome Pesquisado": name,
                        "Nome Cientifico": item.accept['scientificname'],
                        "Status do Taxon": this.accept,
                        'Familia': hierarchy[2].normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                        "Sinonimos": synonym.join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                        "Forma de Vida": item.ConsultaPublicaUC["formaVida"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                        "Substrato": item.ConsultaPublicaUC["substrato"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                        'Grupo Taxonomico ': hierarchy[1].normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                        "Origem": item.ConsultaPublicaUC["origem"] ? item.ConsultaPublicaUC["origem"].normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '',
                        "Endemismo": item.ConsultaPublicaUC["endemismo"] ? item.ConsultaPublicaUC["endemismo"].normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '',
                        "Distribuicao": distribuicao.join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                        "Possivel Distribuicao": distribuicao2.join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                        "Dominios Fitogeografico": item.ConsultaPublicaUC["dominioFitogeografico"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
                        "Vegetacao": item.ConsultaPublicaUC["tipoVegetacao"].join(", ").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                    }
                    this.header = Object.keys(new_accept)
                    return new_accept

                })

            },
            load_TPL(obj) {
                let fail = {
                    "Nome Pesquisado": obj.name,
                    "Nome Cientifico": '',
                    "Status do Taxon": '',
                    'Familia': '',
                    "Sinonimos": ''
                }
                return loadTPLOffline({
                    name: obj.name
                }).then((item) => {
                    if (!item.entry_name) {
                        let new_accept = fail
                        if (this.header.length === 0 && 'TPL' !== this.site_b) {
                            this.header = Object.keys(new_accept)
                        }
                        return new_accept
                    } else {
                        let name = item.entry_name + " [" + (item.synonym ? this.synonym : this.accept) + "]"
                        let new_accept = {
                            "Nome Pesquisado": name,
                            "Nome Cientifico": item.accept['Genus'] + " " + item.accept['Species'] + " " + item.accept['Authorship'],
                            "Status do Taxon": this.accept,
                            "Familia": item.accept.Family,
                            "Sinonimos": item.record.map(e => e.name).join(', ')
                        };
                        if ('TPL' !== this.site_b) {
                            this.header = Object.keys(new_accept);
                        }
                        return new_accept
                    }
                })


            },
            load_GBIF(obj) {
                return loadGBIFOffline(obj).then((item) => {
                    if (!item || !item.synonym && !item.accept) return {
                        status: "",
                        name: ""
                    };
                    return {
                        status: item.synonym ? this.synonym : (!item.synonym && !item.accept) ? "" : this.accept,
                        name: item.accept ? item.accept['scientificName'] : "",
                        ...item.accept
                    }
                })
            },
            loadPage(csv) {
                getEntries({fileName: csv}).then(data => {

                    this.totalSteps = data.length;
                    data.forEach(entry => {
                        let a = this["load_" + this.site_a]({
                            name: entry.name,
                        });

                        let b = this["load_" + this.site_b]({
                            name: entry.name,
                        });

                        a.then((SITE_A) => {
                            b.then(SITE_B => {
                                if (SITE_B === null) {
                                    this.items.push(SITE_A)
                                } else {
                                    if (SITE_A["Status do Taxon"].includes("Nao encontrado")) {
                                        if (SITE_B["Status do Taxon"].includes("Nao encontrado")) {
                                            this.items.push({
                                                "Nome Pesquisado": entry.name,
                                                "Status do Taxon": "[" + this.site_a + "] [" + this.site_b + "] Nao encontrado"
                                            })
                                        } else {
                                            this.items.push(SITE_B)
                                        }
                                    } else {
                                        this.items.push(SITE_A)
                                    }
                                }
                                this.completedSteps += 1;
                            })
                        })
                    })

                })


            }
        }
    }
</script>

<style scoped>

</style>
