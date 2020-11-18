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
                    <th scope="col" v-for="(item, index) in header">{{ item }}</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(item, index) in Object.keys(items)" :key="index">
                    <th scope="row">{{ index + 1}}</th>
                    <th scope="row">{{ item }}</th>
                    <th scope="row">{{ items[item].accepted_name }}</th>
                    <th scope="row">{{ items[item].count }}</th>
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
    import {getEntries, getSpDown, getSpeciesAndAuthor, getSpeciesName, sleep, groupByArray} from "../../api";
    import Papa from "papaparse";
    import { downloadOcorrenceGBIF, getGBIFOccurrences } from "../../api/GBIF";
    import { downloadOcorrenceSPLINK, getSPLINKOccurrences } from "../../api/Splink";
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
                Promise.all([getGBIFOccurrences(), getSPLINKOccurrences()])
                    .then(occur => {
                        let allOccurrences = []
                        allOccurrences.push(...occur[0], ...occur[1])
                        
                        allOccurrences = allOccurrences 
                            .filter(e => e.found_name !== '')
                            .sort((currentElement, nextElement) => {
                                if (currentElement.entry_name > nextElement.entry_name)
                                    return 1 
                                else if (currentElement.entry_name < nextElement.entry_name) 
                                    return -1
                                else {
                                    if (currentElement.found_name > nextElement.found_name)
                                        return 1
                                    else if (currentElement.found_name > nextElement.found_name)
                                        return -1
                                    else {
                                        if (currentElement.accepted_name > nextElement.accepted_name)
                                            return 1
                                        else if (currentElement.accepted_name > nextElement.accepted_name)
                                            return -1
                                        else
                                            return 0
                                    }
                                }
                            })

                        const csv = Papa.unparse(allOccurrences, {
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
                        const blob = new Blob([csv], { type: 'data:text/csv;charset=utf-8;' }) //type: "octet/stream"
                        const url = URL.createObjectURL(blob);

                        hiddenElement.href = URL.createObjectURL(blob);
                        hiddenElement.target = '_blank';
                        hiddenElement.style.visibility = 'hidden';
                        hiddenElement.download = "Ocorrencias _" + this.csv.replace(".csv", "") + "_.csv";
                        document.body.appendChild(hiddenElement)
                        hiddenElement.click();
                        document.body.removeChild(hiddenElement)
                        URL.revokeObjectURL(blob) 
                    })
            },
            toCSV: function (name) {
                Promise.all([getGBIFOccurrences({entry_name:name}), getSPLINKOccurrences({entry_name:name})])
                    .then(occur => {
                        let allOccurrences = []
                        allOccurrences.push(...occur[0], ...occur[1])
                        
                        allOccurrences = allOccurrences 
                            .filter(e => e.found_name !== '')
                            .sort((currentElement, nextElement) => {
                                if (currentElement.entry_name > nextElement.entry_name)
                                    return 1 
                                else if (currentElement.entry_name < nextElement.entry_name) 
                                    return -1
                                else {
                                    if (currentElement.found_name > nextElement.found_name)
                                        return 1
                                    else if (currentElement.found_name > nextElement.found_name)
                                        return -1
                                    else {
                                        if (currentElement.accepted_name > nextElement.accepted_name)
                                            return 1
                                        else if (currentElement.accepted_name > nextElement.accepted_name)
                                            return -1
                                        else
                                            return 0
                                    }
                                }
                            })

                        const csv = Papa.unparse(allOccurrences, {
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
                        const blob = new Blob([csv], { type: 'data:text/csv;charset=utf-8;' }) //type: "octet/stream"
                        const url = URL.createObjectURL(blob);

                        hiddenElement.href = URL.createObjectURL(blob);
                        hiddenElement.target = '_blank';
                        hiddenElement.style.visibility = 'hidden';
                        hiddenElement.download = "Ocorrencias _" + getSpeciesName(name) + "_.csv";
                        document.body.appendChild(hiddenElement)
                        hiddenElement.click();
                        document.body.removeChild(hiddenElement)
                        URL.revokeObjectURL(blob) 
                    })
            },
            loadPage(csv) {
                getEntries({fileName: csv})
                    .then(data => {                                      
                        this.spTotal = 0
                        this.spFeitas = 0

                        getSpDown(data)
                            .then(sp_list => {
                                sp_list = sp_list.filter(e => e[language_Entry.accepted_name] !== '')
                                if (this.header.length === 0)
                                    this.header = ["Nome procurado", "Nome aceito", "Numero de ocorrencias", "Baixar"];
                                this.spTotal = sp_list.length * 2

                                let new_sp_list = []  
                                new_sp_list = groupByArray(sp_list, language_Entry.search_name)

                                let down_gbif =  new_sp_list.reduce((accumulatorPromise, multiple_sp) =>{
                                    let numberSPL = multiple_sp.values.length
                                    return accumulatorPromise
                                        .then(() => {
                                            return sleep(1000)
                                        })    
                                        .then(() => {                                            
                                            return downloadOcorrenceGBIF(multiple_sp)   
                                        })                                          
                                        .then(results => {                                 
                                            this.statusProces = "Download de ocorrências de " + multiple_sp.key + " no GBIF realizado com sucesso!"
                                            results
                                                .filter(e => e !== undefined)
                                                .map(single_ocur => {    
                                                    this.occurFeitas += 1 
                                                    if (single_ocur.found_name.trim() !== ''){
                                                         if (this.items[single_ocur.entry_name] === undefined){
                                                             this.items[single_ocur.entry_name] = { accepted_name: single_ocur.accepted_name, count: 0 }                                                                           
                                                         }                                                        
                                                         this.items[single_ocur.entry_name].count = this.items[single_ocur.entry_name].count + 1
                                                    }
                                                })   
                                            return Promise.resolve(true)                                                     
                                        })
                                        .catch(error => {
                                                    this.spError.push(multiple_sp.key)
                                                    this.mostrarAlerta = true
                                                    console.log("Erro download de ocorrências!")
                                                    console.log(error)
                                                    return Promise.resolve(false)    
                                                }) 
                                        .finally(() => {
                                            this.spFeitas += numberSPL
                                        })
                                }, Promise.resolve())
                                                 
                                sp_list = groupByArray(sp_list, language_Entry.accepted_name)
                                new_sp_list = []
                                const groupSize = 10                      
                                for (let i = 0; i<sp_list.length; i+=groupSize){
                                    new_sp_list[i/groupSize] = sp_list.slice(i, (i+groupSize))
                                }         
        
                                let down_spl = new_sp_list.reduce((accumulatorPromise, multiple_sp) => {
                                    let numberSPL = multiple_sp.reduce((a,c) => {return a + c.values.length}, 0)
                                    return accumulatorPromise
                                        .then(() => {
                                            return sleep(5000)
                                        })
                                        .then(() => {
                                            return downloadOcorrenceSPLINK(multiple_sp)
                                        })
                                        .then(results => {                                            
                                            this.statusProces = "Download de ocorrências de " + numberSPL + " espécies no SpLink realizado com sucesso!"
                                            results.forEach(ocor_sp =>{
                                                    ocor_sp.map(single_ocur => {    
                                                        this.occurFeitas += 1                                                        
                                                        if (single_ocur.found_name.trim() !== ''){
                                                            if (this.items[single_ocur.entry_name] === undefined){
                                                                this.items[single_ocur.entry_name] = { accepted_name: single_ocur.accepted_name, count: 0 }                                                                           
                                                            }                                                        
                                                            this.items[single_ocur.entry_name].count = this.items[single_ocur.entry_name].count + 1
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
                                            this.spFeitas += numberSPL
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
