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
                    <th scope="row">{{ (items[item][0].found_name.trim() === '' ) ? items[item][0].entry_name + " [" + items[item][0]["base de dados"] + "]" :  items[item][0].entry_name }}</th>
                    <th scope="row">{{ items[item][0].found_name }}</th>
                    <th scope="row">{{ items[item][0].accepted_name }}</th>
                    <th scope="row">{{ itemsCount[item] }}</th>
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
    import {downloadOcorrenceGBIF, dropDBGBIF} from "../../api/GBIF";
    import {downloadOcorrenceSPLINK, dropSpLDB} from "../../api/Splink";
    import { language_Entry } from '../../language/PTBR';


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
                itemsCount: {},
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
                let items = Object.values(this.items)
                    .reduce((a, b) => {
                        return a.concat(b)
                    }).filter(item => item.found_name !== '')

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
                var blob = new Blob([csv], { type: 'data:text/csv;charset=utf-8;' }) //type: "octet/stream"
                var url = URL.createObjectURL(blob);

                hiddenElement.href = URL.createObjectURL(blob);
                hiddenElement.target = '_blank';
                hiddenElement.style.visibility = 'hidden';
                hiddenElement.download = "Ocorrencias _" + this.csv.replace(".csv", "") + "_.csv";
                document.body.appendChild(hiddenElement)
                hiddenElement.click();
                document.body.removeChild(hiddenElement)
                URL.revokeObjectURL(blob) 
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
                var blob = new Blob([encodeURI(csv)], { type: 'data:text/csv;charset=utf-8;' });
                var url = URL.createObjectURL(blob);

                hiddenElement.href = URL.createObjectURL(blob);
                hiddenElement.target = '_blank';
                hiddenElement.style.visibility = 'hidden';
                hiddenElement.download = "Ocorrencias _" + name + "_.csv";
                document.body.appendChild(hiddenElement)
                hiddenElement.click();
                document.body.removeChild(hiddenElement)
                URL.revokeObjectURL(blob)           
            },
            loadPage(csv) {
                getEntries({fileName: csv})
                    .then(data => {                                      
                        this.spTotal = 0
                        this.spFeitas = 0

                        getSpDown(data)
                            .then(sp_list => {
                                if (this.header.length === 0)
                                    this.header = ["Nome procurado", "Nome encontrado", "Nome aceito", "Numero de ocorrencias", "Baixar"];
                                this.spTotal = sp_list.length * 2
                                
                                let down_gbif =  sp_list.reduce((accumulatorPromise, single_sp) =>{
                                    return accumulatorPromise
                                        .then(() => {
                                            return sleep(1000)
                                        })    
                                        .then(() => {                                            
                                            return downloadOcorrenceGBIF(single_sp)   
                                        })                                          
                                        .then(results => {                                              
                                            this.statusProces = "Download de ocorrências de " + single_sp[language_Entry.search_name] + " no GBIF realizado com sucesso!"
                                            results
                                                .filter(e => e !== undefined)
                                                .map(single_ocur => {       
                                                    this.occurFeitas += 1 
                                                    delete single_ocur._id;
                                                    delete single_ocur.updatedAt;
                                                    delete single_ocur.createdAt;

                                                    if (single_ocur.found_name.trim() === ''){
                                                         if (this.items[single_ocur.entry_name + ' [GBIF]'] === undefined){
                                                            this.items[single_ocur.entry_name + ' [GBIF]'] = []         
                                                            this.itemsCount[single_ocur.entry_name + ' [GBIF]'] = 0                                                                                            
                                                        }
                                                        this.items[single_ocur.entry_name + ' [GBIF]'].push(single_ocur)
                                                    }
                                                    else {
                                                        if (this.items[single_ocur.found_name] === undefined){
                                                            this.items[single_ocur.found_name] = []         
                                                            this.itemsCount[single_ocur.found_name] = 0                                                                                            
                                                        }
                                                        this.items[single_ocur.found_name].push(single_ocur)
                                                        this.itemsCount[single_ocur.found_name] = this.itemsCount[single_ocur.found_name] + 1
                                                    }
                                                })   
                                            return Promise.resolve(true)                                                     
                                        })
                                        .catch(error => {
                                                    this.spError.push(single_sp.search_name)
                                                    this.mostrarAlerta = true
                                                    console.log("Erro download de ocorrências!")
                                                    console.log(error)
                                                    return Promise.resolve(false)    
                                                }) 
                                        .finally(() => {
                                            this.spFeitas += 1
                                        })
                                }, Promise.resolve())
                                                              
                                let new_sp_list = []                            
                                for (var i = 0; i<sp_list.length; i+=10){
                                    new_sp_list[i/10] = sp_list.slice(i, (i+10))
                                }         
        
                                let down_spl = new_sp_list.reduce((accumulatorPromise, multiple_sp) => {
                                    return accumulatorPromise
                                        .then(() => {
                                            return sleep(5000)
                                        })
                                        .then(() => {
                                            return downloadOcorrenceSPLINK(multiple_sp)
                                        })
                                        .then(results => {                                            
                                            this.statusProces = "Download de ocorrências de " + multiple_sp.length + " éspécies no SpLink realizado com sucesso!"
                                            results.forEach(ocor_sp =>{
                                                    ocor_sp.map(single_ocur => {    
                                                        this.occurFeitas += 1                                                        
                                                        delete single_ocur._id;
                                                        delete single_ocur.updatedAt;
                                                        delete single_ocur.createdAt;
                                                        
                                                        if (single_ocur.found_name.trim() === ''){
                                                            if (this.items[single_ocur.entry_name + ' [SPL]'] === undefined){
                                                                this.items[single_ocur.entry_name + ' [SPL]'] = []         
                                                                this.itemsCount[single_ocur.entry_name + ' [SPL]'] = 0                                                                                                
                                                            }
                                                            this.items[single_ocur.entry_name + ' [SPL]'].push(single_ocur)
                                                        }
                                                        else {
                                                            if (this.items[single_ocur.found_name] === undefined){
                                                                this.items[single_ocur.found_name] = []         
                                                                this.itemsCount[single_ocur.found_name] = 0                                                                                               
                                                            }
                                                            this.items[single_ocur.found_name].push(single_ocur) 
                                                            this.itemsCount[single_ocur.found_name] = this.itemsCount[single_ocur.found_name] + 1
                                                        }
                                                    }) 
                                                })
                                            return Promise.resolve(true)                                                    
                                        })                                               
                                        .catch(error => {
                                                    this.spError = this.spError.concat(multiple_sp.map(e => e.search_name + ", "))
                                                    this.mostrarAlerta = true
                                                    console.log("Erro download de ocorrências!")
                                                    console.log(error)
                                                    return Promise.reject(false)
                                                }) 
                                        .finally(() => {
                                            this.spFeitas += multiple_sp.length
                                        })                                          
                                }, Promise.resolve())

                                Promise.all([down_gbif, down_spl])
                                    .then(e => {
                                        if (e){
                                            this.statusProces = "Todas as ocorrências foram baixadas com sucesso!"
                                        } else {
                                            this.statusProces = "Problemas no download!"
                                        }
                                    })
                            })                                   
                })
            }
        }
    }
</script>

<style scoped>

</style>
