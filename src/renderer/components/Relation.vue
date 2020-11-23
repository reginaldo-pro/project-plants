<template>
    <div>
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <a class="navbar-brand left" v-on:click.stop="$router.push({name: 'Functions', params: {csv: csv}})" href="#">Voltar</a>
            <div class="navbar-nav justify-content-center">
                <a class="nav-item nav-link active text-center" href="#">{{csv.fileName}} <span class="sr-only">(current)</span></a>
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
        <h4 class="text-center" v-if="completedSteps >0">Tabela de cruzamento de dados entre a base de dados
            {{getName(this.site_a)}}({{this.site_a}}) e a base de dados {{getName(this.site_b)}}({{this.site_b}})</h4>
        <table class="table text-center" v-if="completedSteps > 0">
            <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col" v-if="items.length" v-for="(item, index) in items[0]">{{index}}</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(item, index) in items" :key="index">
                <th scope="row">{{ index }}</th>
                <th scope="row" v-for="(item, index) in item">{{item}}</th>

            </tr>
            </tbody>
        </table>

    </div>
</template>

<script>
    import vue2Dropzone from "vue2-dropzone";
    import ProgressBar from "vue-simple-progress";
    import {getEntries, loadFDBOffline, loadGBIFOffline, loadTPLOffline} from "../../api";
    import Papa from "papaparse";
    import {getTPLxFDB} from "../../api/TPLxFDB";

    export default {
        name: "Relation",
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
                synonym: "Sinonimo",
                accept: "Taxon aceito"
            }
        }, computed: {
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
                let eqNone = a.status === b.status && a.status === '';
                let cond = eqTrue || (eqFalse && a.name === b.name);
                return eqNone ? '' : cond ? "Igual" : "Diferente"
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
            load_FDB(obj) {
                return loadFDBOffline({
                    name: obj.name
                }).then((item) => {
                    if (!item || !item.synonym && !item.accept) return {
                        status: "",
                        name: ""
                    };
                    return {
                        status: item.synonym ? this.synonym : (!item.synonym && !item.accept) ? "" : this.accept,
                        name: item.accept ? item.accept['scientificname'] : ""
                    }
                })

            },
            load_TPL(obj) {
                return loadTPLOffline({
                    name: obj.name
                }).then((item) => {
                    if (!item || !item.synonym && !item.accept) return {
                        status: "",
                        name: ""
                    };
                    return {
                        status: item.synonym ? this.synonym : (!item.synonym && !item.accept) ? "" : this.accept,
                        name: item.accept ? item.accept['Genus'] + " " + item.accept['Species'] + " " + item.accept['Authorship'] : ""
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
                        name: item.accept ? item.accept['scientificName'] : ""
                    }
                })
            },
            loadPage(csv) {
                let _entries = getEntries({fileName: csv.fileName})
                this.totalSteps = _entries.length;
                _entries.forEach(entry => {
                    getTPLxFDB(entry.entry_name).then(item => {
                        this.completedSteps += 1;
                        this.items.push(item)
                    })

                })
            }
        }
    }
</script>

<style scoped>

</style>
