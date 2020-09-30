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
        <div class="pt5 nb5" id="standard-sizes" >
            <div :class="box_cls" :style="box_style">
                <progress-bar size="tiny" :val="spFeitas*100/spTotal"
                            :text="statusProces + ' Restando ' + (spTotal - spFeitas) + '.'"/>
                <b-alert v-model="mostrarAlerta" variant="danger" dismissible>
                    Problemas no download de: "{{ spError }}" 
                </b-alert>
            </div>

        </div>
        <div class="table-responsive-lg">
            <table class="table text-center" v-if="spFeitas > 0">
                <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col" v-for="(item, index) in header">{{item}}</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(item, index) in Object.keys(items)" v-if="items[item].length >0" :key="index">
                    <th scope="row">{{ index + 1}}</th>
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
    import {getEntries, getSpDown, sleep} from "../../api";
    import Papa from "papaparse";
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
                spTotal: 0,
                spFeitas: 0,
                mostrarAlerta: false,
                spError: [],
                statusProces: "Iniciando download de ocorrências.",
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
            loadPage(csv) {
                getEntries({fileName: csv}).then(data => {              
                    this.spTotal = 0
                    this.spFeitas = 0


                    getSpDown(data)
                        .then(sp_list => {
                            this.spTotal = sp_list.length
                            sp_list.reduce((accumulatorPromise, single_sp) =>{
                                return accumulatorPromise
                                    .then(() => {
                                        this.items[single_sp] = []  
                                        downloadOcorrenceGBIF(single_sp)
                                            .then(results => {
                                                this.statusProces = "Download de ocorrências de " + single_sp + " realizado com sucesso!"
                                                results
                                                    .filter(e => e !== undefined)
                                                    .map(single_ocur => {                                            
                                                            this.occurFeitas += 1                                                        
                                                            delete single_ocur._id;
                                                            delete single_ocur.updatedAt;
                                                            delete single_ocur.createdAt;
                                                            single_ocur.accept = single_sp
                                                            this.items[single_sp].push(single_ocur)
                                                    })                                                    
                                                if (this.header.length === 0)
                                                    this.header = ["Nome cientifico", "Nome aceito", "Numero de ocorrencias", "Baixar"];
                                            })
                                            .catch(error => {
                                                        this.spError.push(single_sp)
                                                        this.mostrarAlerta = true
                                                        console.log("Erro download de ocorrências!")
                                                        console.log(error)
                                                    }) 
                                            .finally(() => {
                                                this.spFeitas += 1
                                            })
                                    })
                            }, Promise.resolve())
                    })                                    
                })
            }
        }
    }
</script>

<style scoped>

</style>
