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
                <div :class="label_cls" class="text-center">Loading data <strong><a href="#" v-on:click.stop="reloadPage">Travou? clique para recarregar</a></strong></div>
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
    import {getEntries, loadGBIFOffline} from "../../api";
    import Papa from "papaparse";
    import {FDBget} from "../../api/FloraDoBrazil";
    import {TPLget} from "../../api/ThePlantList";

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
            reloadPage(){
                window.location.reload()
            },
            relationx2: function (a, b) {
                let eqTrue = a.status === b.status && a.status === this.accept;
                let eqFalse = a.status === b.status && a.status === this.synonym;
                let cond = eqTrue || (eqFalse && a.name === b.name);
                return cond ? "Igual" : "Diferente"
            },
            toCSV: function () {


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
                return FDBget(obj.name).then(item => {
                    this.header = Object.keys(item);
                    return item
                });

            },
            load_TPL(obj) {
                return TPLget(obj.name).then(item => {
                    this.header = Object.keys(item);
                    return item
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
