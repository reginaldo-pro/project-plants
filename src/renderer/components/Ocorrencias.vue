<template>
    <div>
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <a class="navbar-brand left" v-on:click.stop="$router.push({name: 'Functions', params: {csv: csv}})" href="#">Voltar</a>
            <div class="navbar-nav justify-content-center">
                <a class="nav-item nav-link active text-center" href="#">{{csv.fileName}} <span class="sr-only">(current)</span></a>
                <a class="nav-item nav-link active text-center" href="#" v-on:click.stop="toCSVAll">Gerar todas as
                    ocorrencias em CSV: '{{ csvLocal }}.'</a>
            </div>
        </nav>
        <div class="pt5 nb5" id="standard-sizes" >
            <div :class="box_cls" :style="box_style">
                <progress-bar size="tiny" :val="(baixadasSPL+baixadasGBIF)*100/(aBaixarSPL + aBaixarGBIF) "
                            :text="statusProces"/>
                <b-alert v-model="mostrarAlerta" variant="danger" dismissible>
                    Problemas no download de: "{{ spError }}".
                </b-alert>
                <b-alert v-model="mostrarFinalizado" variant="success" dismissible>
                    Arquivo CSV gerado com sucesso: " {{ csvLocal }} ".
                </b-alert>
            </div>

        </div>
        <div class="table-responsive-lg">
            <table class="table text-center" v-if="(aBaixarSPL + aBaixarGBIF) > 0">
                <thead>
                <tr>
                    <th scope="col">Inicio</th>
                    <th scope="col">Fim</th> 
                    <th scope="col">Site</th>
                    <th scope="col">Espécies à baixar</th>
                    <th scope="col">Espécies baixadas</th>
                    <th scope="col">Ocorrências baixadas</th>
                    <th scope="col">Última espécie baixada</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <th scope="row">{{ inicioSPL }}</th>
                    <th scope="row">{{ fimSPL }}</th>
                    <th scope="row"> SpeciesLink </th>
                    <th scope="row">{{ aBaixarSPL }}</th>
                    <th scope="row">{{ baixadasSPL }}</th>
                    <th scope="row">{{ ocorrenciasSPL }}</th>
                    <th scope="row">{{ ultimaBaixadaSPL }}</th> 
                </tr>
                <tr>
                    <th scope="row">{{ inicioGBIF }}</th>
                    <th scope="row">{{ fimGBIF }}</th>
                    <th scope="row"> GBIF </th>
                    <th scope="row">{{ aBaixarGBIF }}</th>
                    <th scope="row">{{ baixadasGBIF }}</th>
                    <th scope="row">{{ ocorrenciasGBIF }}</th>
                    <th scope="row">{{ ultimaBaixadaGBIF }}</th> 
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
    import { db } from '../../db';

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
                inicioSPL: 0,
                fimSPL: 0,
                aBaixarSPL: 0,
                baixadasSPL: 0,
                ocorrenciasSPL: 0,
                ultimaBaixadaSPL: '',
                inicioGBIF: 0,
                fimGBIF: 0,
                aBaixarGBIF: 0,
                baixadasGBIF: 0,
                ocorrenciasGBIF: 0,
                ultimaBaixadaGBIF: '',
                mostrarAlerta: false,
                mostrarFinalizado: false,
                csvLocal: db.ocorrencias.getCompleteFileName(),
                spError: [],
                statusProces: "Iniciando download de ocorrências.",
                csv: "",
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
                db.ocorrencias.addLevelupDB(db.ocorrenciasDB)
                this.mostrarFinalizado = true;
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
                        const blob = new Blob([csv], { type: "octet/stream" }) 
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
                let _entries = getEntries({fileName: csv.fileName})

                let dateNow = new Date(Date.now())
                this.inicioSPL = dateNow.getHours() + "h" + dateNow.getMinutes() + "m" + dateNow.getSeconds() + "s"
                this.inicioGBIF = this.inicioSPL
                this.statusProces = "Download de ocorrências em andamento!"
                getSpDown(_entries)
                    .then(sp_list => {
                        sp_list = sp_list.filter(e => e[language_Entry.accepted_name] !== '')
                        
                        this.aBaixarSPL = sp_list.length
                        this.aBaixarGBIF = sp_list.length

                        let new_sp_list = []  
                        new_sp_list = groupByArray(sp_list, language_Entry.search_name)
                        let down_gbif =  new_sp_list.reduce((accumulatorPromise, multiple_sp) =>{
                            return accumulatorPromise
                                .then(() => {
                                    return sleep(1000)
                                })    
                                .then(() => {                                         
                                    return downloadOcorrenceGBIF(multiple_sp)   
                                })                                          
                                .then(results => {                             
                                    results
                                        .filter(e => e !== undefined)
                                        .map(single_ocur => {    
                                            this.ocorrenciasGBIF += 1 
                                        })   
                                    this.baixadasGBIF += multiple_sp.values.length
                                    this.ultimaBaixadaGBIF = multiple_sp.key
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
                                    dateNow = new Date(Date.now())
                                    this.fimGBIF  = dateNow.getHours() + "h" + dateNow.getMinutes() + "m" + dateNow.getSeconds() + "s"
                                })
                        }, Promise.resolve())
                                            
                        sp_list = groupByArray(sp_list, language_Entry.accepted_name)
                        new_sp_list = []
                        const groupSize = 5                      
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
                                    results.forEach(ocor_sp =>{
                                            ocor_sp.map(single_ocur => {    
                                                this.ocorrenciasSPL += 1                                                       
                                            }) 
                                        })
                                    this.baixadasSPL += multiple_sp.reduce((a,c) => a + c.values.length, 0)
                                    this.ultimaBaixadaSPL = multiple_sp.map((e) => e.key).join(", ")
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
                                    dateNow = new Date(Date.now())
                                    this.fimSPL  = dateNow.getHours() + "h" + dateNow.getMinutes() + "m" + dateNow.getSeconds() + "s"
                                })                                          
                        }, Promise.resolve())

                        Promise.all([down_gbif, down_spl])
                            .then(() => {
                                if (this.spError.length==0){
                                    this.statusProces = "Todas as ocorrências foram baixadas com sucesso!"
                                } else {
                                    this.statusProces = "Problemas no download!"
                                }
                            })
                    })                                   
            }
        }
    }
</script>

<style scoped>

</style>
