<template>
    <div class="container">
        <!--UPLOAD-->
        <form enctype="multipart/form-data" novalidate v-if="isInitial || isSaving">
            <h2>Adicione seu arquivo</h2>
            <div class="dropbox">
                <input type="file" multiple :name="uploadFieldName" :disabled="isSaving"
                       @change="(event)=>{
                           this.filesChange(event.target.name, event.target.files);
                           this.fileCount = event.target.files.length
                       }"
                       accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                       class="input-file">
                <p v-if="isInitial">
                    Arraste seu arquivo aqui, <br> ou clique para encontra-lo.
                </p>
                <p v-if="isSaving">
                    Processando... {{ fileCount }} aguarde...
                </p>
            </div>
        </form>
        <!--SUCCESS-->
        <div v-if="isSuccess">
            <h2>Foram encontrados {{ uploadedFiles.length }} arquivo(s).</h2>
            <p>
                <a href="javascript:void(0)" @click="reset()">Voltar para a tela inicial</a>
            </p>
            <div class="row">
                <div class="col-sm-6" v-for="item in uploadedFiles">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">{{item.originalName}}</h5>
                            <p class="card-text">O arquivo possui {{item.data.length}} entradas</p>
                            <a href="javascript:void(0)" class="btn btn-primary"
                               @click="relation(item)">Clique para Continuar</a>
                        </div>
                    </div>
                </div>

            </div>

        </div>
        <!--FAILED-->
        <div v-if="isFailed">
            <h2>Falha ao carregar arquivo</h2>
            <p>
                <a href="javascript:void(0)" @click="reset()">Tente novamente</a>
            </p>
            <pre>{{ uploadError }}</pre>
        </div>

        <!--Processar requisições-->
        <div v-if="isProcess">
            <h2>Processamento do arquivo {{ csvFile.originalName }} Para a etapa 1</h2>
            <p>
                <a href="javascript:void(0)" @click="reset()">Voltar para a tela inicial</a>
            </p>
            <div class="row">
                <div class="col-sm-6">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Flora do Brasil</h5>
                            <p class="card-text" v-if="csvInfo.FDB">Processando {{csvInfo.FDB.Process.length}}</p>
                            <p class="card-text" v-if="csvInfo.FDB">Erro {{csvInfo.FDB.Erro.length}}</p>
                            <p class="card-text" v-if="csvInfo.FDB && csvInfo.file">Completo
                                {{csvInfo.FDB.Completo.length}} de {{csvInfo.file.data.length}}</p>

                            <progress-bar size="tiny"
                                          :val="(csvInfo.FDB.Completo.length/csvInfo.file.data.length )*100"/>
                        </div>
                    </div>
                </div>
                <div class="col-sm-6">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">The Plant List</h5>
                            <p class="card-text" v-if="csvInfo.TPL">Processando {{csvInfo.TPL.Process.length}}</p>
                            <p class="card-text" v-if="csvInfo.TPL">Erro {{csvInfo.TPL.Erro.length}}</p>
                            <p class="card-text" v-if="csvInfo.TPL && csvInfo.file">Completo
                                {{csvInfo.TPL.Completo.length}} de
                                {{csvInfo.file.data.length}}</p>
                            <progress-bar size="tiny"
                                          :val="(csvInfo.TPL.Completo.length/csvInfo.file.data.length )*100"/>
                        </div>
                    </div>
                </div>
                <div class="col-sm-6">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Dados baixaveis da relação entre The Plant List e Flora do
                                Brasil</h5>
                            <p class="card-text">
                                <a href="javascript:void(0)" @click="baixar(0)" :key="0">Baixar lista de erros Flora do
                                    Brasil</a>
                            </p>
                            <p class="card-text">
                                <a href="javascript:void(0)" @click="baixar(1)" :key="1">Baixar lista de erros The Plant
                                    List</a>
                            </p>

                            <p class="card-text">
                                <a href="javascript:void(0)" @click="baixar(2)" :key="0">Baixar dados Flora do
                                    Brasil</a>
                            </p>

                            <p class="card-text">
                                <a href="javascript:void(0)" @click="baixar(3)" :key="0">Baixar dados The Plant List</a>
                            </p>
                            <p class="card-text">
                                <a href="javascript:void(0)" @click="baixar(4)" :key="0">Baixar tabela de relação FDB x
                                    TPL</a>
                            </p>

                            <p class="card-text" v-if="!isOccorence">
                                <a href="javascript:void(0)" @click="baixar(5)" :key="0">Começar a baixar
                                    Occorrecias</a>
                            </p>
                        </div>
                    </div>
                </div>
                <div class="col-sm-6" v-if="isOccorence">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Baixar Occorrencias</h5>

                            <p class="card-text" v-if="csvInfo.TPL">Processando {{occorrence.Process.length}}</p>

                            <p class="card-text">
                                Baixando Occorrencias GBIF
                            </p>
                            <p class="card-text" v-if="csvInfo.TPL">Erro {{occorrence.Erro_GBIF.length}}</p>
                            <p class="card-text">Completo
                                {{occorrence.GBIF.length}} de
                                {{occorrence.all.length}}</p>

                            <p class="card-text">
                                Baixando Occorrencias SPLINK
                            </p>
                            <p class="card-text" v-if="csvInfo.TPL">Erro {{occorrence.Erro_SPLINK.length}}</p>
                            <p class="card-text">Completo
                                {{occorrence.SPLINK.length}} de
                                {{occorrence.all.length}}</p>


                            <p class="card-text">
                                <a href="javascript:void(0)" @click="baixar(6)" :key="0">Baixar Todas as
                                    occorrencias</a>
                            </p>
                        </div>
                    </div>


                </div>


                <div class="col-sm-12">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">Relação entre Flora do Brasil(FDB) e The Plant List(TPL)</h5>
                            <div class="card-body table-responsive">
                                <table class="table text-center">
                                    <thead>
                                    <tr>
                                        <th scope="col">#</th>
                                        <th scope="col">Nome pesquisado</th>
                                        <th scope="col">Buscando FDB</th>
                                        <th scope="col">Status: Flora do Brasil</th>
                                        <th scope="col">Nome Aceito: Flora do Brasil</th>
                                        <th scope="col">Autor Aceito: Flora do Brasil</th>
                                        <th scope="col">Buscando TPL</th>
                                        <th scope="col">Status: The Plant List</th>
                                        <th scope="col">Nome Aceito: The Plant List</th>
                                        <th scope="col">Autor Aceito: The Plant List</th>
                                        <th scope="col">FDB x TPL</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr v-for="(item, index) in Object.keys(csvFile)" :key="index">
                                        <th scope="row">{{ index }}</th>
                                        <th scope="row">{{ csvFile[item].name }}</th>
                                        <th scope="row">{{ csvFile[item]["FDB"] }}</th>
                                        <th scope="row">{{ csvFile[item]["FDB_status"] }}</th>
                                        <th scope="row">{{ csvFile[item]["FDB_name"] }}</th>
                                        <th scope="row">{{ csvFile[item]["FDB_autor"] }}</th>
                                        <th scope="row">{{ csvFile[item]["TPL"] }}</th>
                                        <th scope="row">{{ csvFile[item]["TPL_status"] }}</th>
                                        <th scope="row">{{ csvFile[item]["TPL_name"] }}</th>
                                        <th scope="row">{{ csvFile[item]["TPL_autor"] }}</th>
                                        <th scope="row">{{ csvFile[item]["FDBxTPL"] }}</th>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                </div>
            </div>


        </div>
    </div>
</template>

<script>
    // swap as you need
    // import {upload} from '../../api/file-upload.fake.service'; // fake service
    import {upload} from '../../api/file-upload.service'; // real service
    import {cancelAllRequests, refreshToken, wait} from '../../api/utils';
    import {FDBfind, FDBget, FDBSearch} from "../../api/FloraDoBrazil";
    import {TPLfind, TPLget, TPLSearch} from "../../api/ThePlantList";
    import {language_Entry} from "../../language/PTBR";
    import ProgressBar from "vue-simple-progress";
    import Papa from "papaparse";
    import {downloadOcorrenceGBIF, loadCorrection} from "../../api/GBIF";
    import {downloadOcorrenceSPLINK} from "../../api/Splink";

    const STATUS_INITIAL = 0, STATUS_SAVING = 1, STATUS_SUCCESS = 2, STATUS_FAILED = 3, PROCESS_FILE = 4,
        OCCORRENCE = 5;

    const BAIXAR_ERROS_FDB = 0, BAIXAR_ERROS_TPL = 1;

    export default {
        name: "Index",
        components: {
            ProgressBar
        },
        data() {
            return {
                uploadedFiles: [],
                uploadError: null,
                currentStatus: null,
                occorrenceStatus: null,
                uploadFieldName: 'photos',
                csvFile: {},
                occorrence: {all: [], SPLINK: [], GBIF: [], Process: [], Erro_SPLINK: [], Erro_GBIF: []},
                csvInfo: {
                    file: {},
                    FDB: {
                        Process: [],
                        Completo: [],
                        Erro: []
                    },
                    TPL: {
                        Process: [],
                        Completo: [],
                        Erro: []
                    }
                },
                items: {}
            }
        },
        computed: {
            isInitial() {
                return this.currentStatus === STATUS_INITIAL;
            },
            isOccorence() {
                return this.occorrenceStatus === OCCORRENCE;
            },
            isSaving() {
                return this.currentStatus === STATUS_SAVING;
            },
            isSuccess() {
                return this.currentStatus === STATUS_SUCCESS;
            },
            isFailed() {
                return this.currentStatus === STATUS_FAILED;
            },
            isProcess() {
                return this.currentStatus === PROCESS_FILE;
            }
        },
        methods: {
            baixar(element) {
                let data = {};
                let name = `FDBxTPL '${this.csvInfo.file.originalName}'`;
                switch (element) {
                    case 0: { // Não encontrados Flora do Brasil
                        data = this.csvInfo.FDB.Erro.map(item => {
                            return {"Plantas com busca resultada em erro site FDB": item}
                        });
                        name = `Platas não encontradas FDB -_- '${this.csvInfo.file.originalName}'`;
                        break
                    }
                    case 1: { // Não encontrados The Plant List
                        data = this.csvInfo.TPL.Erro.map(item => {
                            return {"Plantas com busca resultada em erro site TPL": item}
                        });
                        name = `Platas não encontradas TPL -_- '${this.csvInfo.file.originalName}'`;
                        break
                    }
                    case 2: { // Flora do brasil
                        data = Object.keys(this.csvFile).map(item => {
                            let obj = this.csvFile[item]
                            return {Pesquisado: item, busca: obj.FDB, ...obj.FDB_data}
                        });
                        name = `Dados FDB '${this.csvInfo.file.originalName}'`;
                        break
                    }
                    case 3: { // The Plant List
                        data = Object.keys(this.csvFile).map(item => {
                            let obj = this.csvFile[item]
                            return {Pesquisado: item, busca: obj.TPL, ...obj.TPL_data}
                        });
                        name = `Dados TPL '${this.csvInfo.file.originalName}'`;
                        break
                    }
                    case 4: { // The Plant List
                        data = Object.keys(this.csvFile).map(item => {
                            let obj = this.csvFile[item];
                            delete obj.TPL_data;
                            delete obj.FDB_data;
                            return obj
                        });
                        name = `Dados TPLXFDB '${this.csvInfo.file.originalName}'`;
                        break
                    }
                    case 5: {// Baixar ocorrencias
                        if (this.occorrenceStatus !== OCCORRENCE) {
                            this.occorrenceStatus = OCCORRENCE
                            this.occorrence.all.forEach(item => {
                                this.occorrence.Process.push(item)
                                loadCorrection({name: item}).then(data => {
                                    this.items[item] = [];
                                    return downloadOcorrenceGBIF(item, data['correction']['usageKey']).then(data => {

                                        data.map(item2 => {
                                            if (item2 instanceof Promise) {
                                                return item2.then((item2) => {
                                                    delete item2._id;
                                                    delete item2.updatedAt;
                                                    delete item2.createdAt;
                                                    this.items[item].push(item2)
                                                })
                                            } else {
                                                delete item2._id;
                                                delete item2.updatedAt;
                                                delete item2.createdAt;
                                                this.items[item].push(item2)
                                            }
                                        })
                                    }).then(() => {
                                        this.occorrence.GBIF.push(item)
                                    }).catch((e)=>{
                                        this.occorrence.Erro_GBIF.push(item)
                                    })
                                }).catch((e)=>{
                                    this.occorrence.Erro_GBIF.push(item)
                                }).then(() => {
                                    this.occorrence.Process.shift()
                                })

                                this.occorrence.Process.push(item)
                                downloadOcorrenceSPLINK(item).then(data => {
                                    data.map(item2 => {
                                        if (item2 instanceof Promise) {
                                            return item2.then((item2) => {
                                                delete item2._id;
                                                delete item2.updatedAt;
                                                delete item2.createdAt;
                                                this.items[item].push(item2)
                                            })
                                        } else {
                                            delete item2._id;
                                            delete item2.updatedAt;
                                            delete item2.createdAt;
                                            this.items[item].push(item2)
                                        }
                                    })
                                }).then(() => {
                                    this.occorrence.SPLINK.push(item)
                                }).catch((error => {
                                    this.occorrence.Erro_SPLINK.push(item)
                                })).then(() => {
                                    this.occorrence.Process.shift()
                                })
                            })

                        }

                    }
                    case 6: {
                        if(this.items.length >0){
                            let items = Object.values(this.items).reduce((a, b) => {
                                return a.concat(b)
                            }).filter(item => item);

                            name = `Todas as occorrencias '${this.csvInfo.file.originalName}'`;
                            data = items
                        }

                    }
                }
                if (element !== 5) {
                    let csv = Papa.unparse(data, {
                        quotes: false, //or array of booleans
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
                    hiddenElement.download = name + ".csv";
                    hiddenElement.click();
                }
            },
            reset() {
                // reset form to initial state
                this.currentStatus = STATUS_INITIAL;
                this.uploadedFiles = [];
                this.uploadError = null;

                cancelAllRequests(); // cancelling old requests
                refreshToken(); // new token for new requests
            },
            relation: function (item) {
                this.csvInfo.file = item;
                this.currentStatus = PROCESS_FILE;
                item.data.forEach((item, index) => {
                    this.csvFile[item[0]] = {
                        key: index,
                        name: item[0],
                        "FDB": "Processando",
                        "FDB_status": "",
                        "FDB_name": "",
                        "FDB_autor": "",
                        "TPL": "Processando",
                        "TPL_status": "",
                        "TPL_name": "",
                        "TPL_autor": "",
                        "FDBxTPL": ""
                    };

                    this.search_FDB(item[0]);
                    this.search_TPL(item[0])

                })
            },
            FDBxTPL: function (name) {
                let status = [];

                if (this.csvFile[name]['FDB_name'] !== this.csvFile[name]['TPL_name']) status.push("Nomes distito");
                if (this.csvFile[name]['FDB_autor'] !== this.csvFile[name]['TPL_autor']) status.push("Autor distito");
                if (this.csvFile[name]['FDB_status'] !== this.csvFile[name]['TPL_status']) status.push("Status distito");

                this.csvFile[name]["FDBxTPL"] = status.join(", ")
            },
            search_FDB: function (name) {
                this.csvInfo.FDB.Process.push(name);
                new Promise(resolve => {
                    FDBfind({entry_name: name}).then(data => {
                        if (data) {
                            FDBget(name).then((item) => {
                                resolve(item)
                            })
                        } else {
                            let tokens = name.split(" ");
                            let canonical = name;
                            if (tokens.length >= 2) canonical = [tokens[0], tokens[1]].join(" ");

                            FDBSearch(name, canonical).then(data => {
                                if (data) {
                                    FDBget(name).then((item) => {
                                        resolve(item)
                                    })
                                } else {
                                    this.csvInfo.FDB.Erro.push(name);

                                    resolve({})
                                }
                            })
                        }
                    })

                }).then((item) => {
                    this.csvInfo.FDB.Completo.push(name);
                    if (Object.keys(item).length === 0) {
                        this.csvFile[name].FDB = "Erro";
                    } else {
                        this.csvFile[name].FDB = "Ok";
                    }
                    this.csvFile[name]['FDB_status'] = item[language_Entry.taxonomic_status];
                    this.csvFile[name]['FDB_name'] = item[language_Entry.scientific_name];
                    this.csvFile[name]['FDB_autor'] = item[language_Entry.scientific_name_authorship];
                    this.csvFile[name]['FDB_data'] = item;

                    this.occorrence.all.push(item[language_Entry.scientific_name])
                    if(item[language_Entry.synonym]){

                        let syn = item[language_Entry.synonym].split(', ');
                        syn.forEach(name => {
                            this.occorrence.all.push(name)
                        });
                    }


                    if (this.csvFile[name].FDB !== "Processando" && this.csvFile[name].TPL !== "Processando") {
                        this.FDBxTPL(name)
                    }

                    this.csvInfo.FDB.Process.shift()
                })
            },
            search_TPL: function (name) {
                this.csvInfo.TPL.Process.push(name);
                new Promise(resolve => {
                    TPLfind({entry_name: name}).then(data => {
                        if (data) {

                            TPLget(name).then((item) => {
                                resolve(item)
                            })
                        } else {
                            let tokens = name.split(" ");
                            let canonical = name;
                            if (tokens.length >= 2) canonical = [tokens[0], tokens[1]].join(" ");

                            TPLSearch(name, canonical).then(data => {
                                if (data) {
                                    TPLget(name).then((item) => {
                                        resolve(item)
                                    })
                                } else {
                                    this.csvInfo.TPL.Erro.push(name);

                                    resolve({})
                                }
                            })
                        }
                    })

                }).then((item) => {
                    this.csvInfo.TPL.Completo.push(name);

                    if (Object.keys(item).length === 0) {
                        this.csvFile[name].TPL = "Erro";
                    } else {
                        this.csvFile[name].TPL = "Ok";
                    }

                    this.csvFile[name]['TPL_status'] = item[language_Entry.taxonomic_status];
                    this.csvFile[name]['TPL_name'] = item[language_Entry.scientific_name];
                    this.csvFile[name]['TPL_autor'] = item[language_Entry.scientific_name_authorship];
                    this.csvFile[name]['TPL_data'] = item;

                    this.occorrence.all.push(item[language_Entry.scientific_name])
                    if(item[language_Entry.synonym]){

                        let syn = item[language_Entry.synonym].split(', ');
                        syn.forEach(name => {
                            this.occorrence.all.push(name)
                        });
                    }

                    if (this.csvFile[name].FDB !== "Processando" && this.csvFile[name].TPL !== "Processando") {
                        this.FDBxTPL(name)
                    }
                    this.csvInfo.TPL.Process.shift()
                })
            },

            save(formData) {
                // upload data to the server
                this.currentStatus = STATUS_SAVING;
                upload(formData)
                    .then(wait(1500)) // DEV ONLY: wait for 1.5s
                    .then(x => {
                        this.uploadedFiles = [].concat(x);
                        this.currentStatus = STATUS_SUCCESS;
                    })
                    .catch(err => {
                        this.uploadError = err.response;
                        this.currentStatus = STATUS_FAILED;
                    });
            },
            filesChange(fieldName, fileList) {
                // handle file changes
                const formData = new FormData();
                if (!fileList.length) return;
                // append the files to FormData
                Array
                    .from(Array(fileList.length).keys())
                    .map(x => {
                        formData.append(fieldName, fileList[x], fileList[x].name);
                    });
                // save it
                this.save(formData);
            }
        },
        mounted() {
            this.reset();
        },
    }
</script>
<style lang="scss">
    .dropbox {
        outline: 2px dashed grey; /* the dash box */
        outline-offset: -10px;
        background: lightcyan;
        color: dimgray;
        padding: 10px 10px;
        min-height: 200px; /* minimum height */
        position: relative;
        cursor: pointer;
    }

    .input-file {
        opacity: 0; /* invisible but it's there! */
        width: 100%;
        height: 200px;
        position: absolute;
        cursor: pointer;
    }

    .dropbox:hover {
        background: lightblue; /* when mouse over to the drop zone, change color */
    }

    .dropbox p {
        font-size: 1.2em;
        text-align: center;
        padding: 50px 0;
    }
</style>
