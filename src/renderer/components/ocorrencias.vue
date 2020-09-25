<template>
    <div>
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <a class="navbar-brand left" v-on:click.stop="$router.back()" href="#">Voltar</a>
            <div class="navbar-nav justify-content-center">
                <a class="nav-item nav-link active text-center" href="#">{{csv}} <span class="sr-only">(current)</span></a>
                <a class="nav-item nav-link active text-center" href="#" v-on:click.stop="toCSVAll">Baixar todas as
                    ocorrencias '{{csv}}'</a>
            </div>
        </nav>
        <div class="pt5 nb5" id="standard-sizes" v-if="completedSteps !== totalSteps">

            <div :class="box_cls" :style="box_style">
                <div :class="label_cls" class="text-center">Loading data <strong><a href="#"
                                                                                    v-on:click.stop="reloadPage">Travou?
                    clique para recarregar</a></strong></div>
                <progress-bar size="tiny" :val="(completedSteps/totalSteps )*100"
                              :text="'Ocorrências válidas: ' + completedSteps + '. Ocorrências encontradas: ' + totalSteps + '.'"/>
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
                <tr v-for="(item, index) in Object.keys(items)" v-if="items[item].length >0" :key="index">
                    <th scope="row">{{ index }}</th>
                    <th scope="row">{{ item }}</th>
                    <th scope="row">{{ items[item][0].accept }}</th>
                    <th scope="row">{{ items[item].length }}</th>
                    <th scope="row"><a href="#" v-on:click.stop="toCSV(item)">Baixar apenas este</a></th>

                </tr>
                </tbody>
            </table>
        </div>

    </div>
</template>

<script>
    import vue2Dropzone from "vue2-dropzone";
    import ProgressBar from "vue-simple-progress";
    import {getEntries} from "../../api";
    import Papa from "papaparse";
    import {FDBget} from "../../api/FloraDoBrazil";
    import {TPLget} from "../../api/ThePlantList";
    import {language_Entry} from "../../language/PTBR";
    import {downloadOcorrenceGBIF, loadCorrection} from "../../api/GBIF";
    import {downloadOcorrenceSPLINK} from "../../api/Splink";

    const NodeGeocoder = require('node-geocoder');

    export default {
        name: "ocorrencias",
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
                items: {},
                prepared_items: [],
                header: []
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
            reloadPage() {
                window.location.reload()
            },
            toCSVAll: function () {
                let items = Object.values(this.items).reduce((a, b) => {
                    return a.concat(b)
                }).map(item => {
                    delete item.accept
                    return item
                }).filter(item => item);

                let csv = Papa.unparse(items, {
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
                hiddenElement.href = 'data:text/csv,' + encodeURI(csv);
                hiddenElement.target = '_blank';
                hiddenElement.download = "Todas as ocorrencias '" + this.csv + "'.csv";
                hiddenElement.click();
            },
            toCSV: function (name) {
                let csv = Papa.unparse(this.items[name], {
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
                hiddenElement.download = "Ocorrencias '" + name + "'.csv";
                hiddenElement.click();
            },
            load_FDB(obj) {
                return FDBget(obj.name)

            },
            load_TPL(obj) {
                return TPLget(obj.name)
            },
            loadPage(csv) {
                getEntries({fileName: csv}).then(data => {              
                    this.totalSteps = 0;
                    data.forEach(entry => {
                        let a = this.load_FDB({
                            name: entry.name,
                        })

                        let b = this.load_TPL({
                            name: entry.name,
                        })

                        Promise.all([a,b])
                            .then(results => {
                                let items = results
                                    .map(e => {
                                            let syns = e[language_Entry.synonym]    
                                            if (syns) {
                                                return e[language_Entry.synonym].split(', ').concat(e[language_Entry.scientific_name]) 
                                            } 
                                    })
                                    .reduce((new_items, e) => {
                                        if (e){
                                            new_items.concat(e)
                                        }
                                        return new_items
                                    })
                                
                                const set = new Set(items.map(item => JSON.stringify(item)));
                                items = [...set].map(item => JSON.parse(item));
                                
                                this.totalSteps = items.length
                                
                                items.forEach(item => {
                                    loadCorrection({name: item}).then(data => {
                                        debugger
                                        this.items[item] = []
                                        downloadOcorrenceGBIF(item, data['correction']['usageKey']).then(data => {
                                            this.totalSteps -= 1
                                            this.totalSteps += data.length

                                            data.map(item2 => {
                                                if (item2 instanceof Promise) {
                                                    return item2.then((item2) => {
                                                        delete item2._id;
                                                        delete item2.updatedAt;
                                                        delete item2.createdAt;
                                                        item2.accept = item.accept
                                                        this.items[item].push(item2)
                                                        this.completedSteps += 1
                                                    })
                                                } else {
                                                    delete item2._id;
                                                    delete item2.updatedAt;
                                                    delete item2.createdAt;
                                                    item2.accept = item.accept
                                                    this.items[item].push(item2)
                                                    this.completedSteps += 1
                                                }
                                            })

                                            if (this.header.length === 0)
                                                this.header = ["Nome cientifico", "Nome aceito", "Numero de ocorrencias", "Baixar"];

                                        })

                                        downloadOcorrenceSPLINK(item).then(data => {
                                            this.totalSteps -= 1
                                            this.totalSteps += data.length

                                            data.map(item2 => {
                                                if (item2 instanceof Promise) {
                                                    return item2.then((item2) => {
                                                        delete item2._id;
                                                        delete item2.updatedAt;
                                                        delete item2.createdAt;
                                                        item2.accept = item.accept
                                                        this.items[item].push(item2)
                                                        this.completedSteps += 1
                                                    })
                                                } else {
                                                    delete item2._id;
                                                    delete item2.updatedAt;
                                                    delete item2.createdAt;
                                                    item2.accept = item.accept
                                                    this.items[item].push(item2)
                                                    this.completedSteps += 1
                                                }
                                            })
                                            if (this.header.length === 0)
                                                this.header = ["Nome cientifico", "Nome aceito", "Numero de ocorrencias", "Baixar"];
                                        })
                                    })

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
