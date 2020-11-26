<template>
    <div>

        <vue-dropzone :options="dropzoneOptions" :useCustomSlot=true id="dropZ"
                      @vdropzone-file-added="vfileAdded" @vdropzone-success="vfileSuccess">
            <div class="dropzone-custom-content">
                <h3 class="dropzone-custom-title">Arraste e solte o arquivo csv!</h3>
                <div class="subtitle">...ou click aqui e selecione o arquivo.</div>
            </div>
        </vue-dropzone>

        <table class="table text-center">
            <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col">Arquivo CSV</th>
                <th scope="col">Ultima visualização</th>
                <th scope="col">Apagar</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(item, index) in items" :key="index" style="cursor:pointer;"
                v-on:click.stop="item.view()">
                <th scope="row" class="pointer">{{ index }}</th>
                <th scope="row" class="pointer">{{item.name}}</th>
                <th scope="row" class="pointer">{{moment(item.updatedAt).calendar()}}</th>
                <th scope="row" class="pointer"><a href="#" v-on:click.stop="item.remove()">{{item.removeText}}</a></th>

            </tr>
            </tbody>
        </table>


    </div>

</template>

<script>
    import vue2Dropzone from 'vue2-dropzone'
    import 'vue2-dropzone/dist/vue2Dropzone.min.css'
    import Papa from 'papaparse'
    import {deleteCSV, getCSV, insertOrUpdateCSV} from "../../api";
    import { insertOrUpdateEntry } from "../../api/Entry";
    import { getSpeciesAndAuthorNames, removeInfraSpeciesRank } from "../../api/index";

    export default {
        name: 'Entries',
        components: {
            vueDropzone: vue2Dropzone
        },
        created() {
            source.cancel('Operation canceled by the user.');

            this.loadFiles()
        },
        data() {
            return {
                dropzoneOptions: {
                    url: '/',
                    thumbnailWidth: 400,
                    addRemoveLinks: true
                },

                items: []
            }
        },
        methods: {
            vfileSuccess: function () {
                alert("Ok")
            },
            vfileAdded: function vfileAdded(files) {
                try {
                    new Promise(resolve => {
                        let sp_entries = []
                        Papa.parse(files, {
                            download: true,
                            worker: true,
                            step: row => {
                                try {
                                    if (row.data) {
                                        let entry = {entry_name: row.data[0], fileName: files.name}
                                        if (entry.entry_name.trim() !== "") {
                                            entry.entry_name = removeInfraSpeciesRank(getSpeciesAndAuthorNames(entry.entry_name))
                                            sp_entries.push(entry)                                         
                                        }
                                    }
                                } catch (e) {
                                    alert(e)
                                }
                            },
                            complete: () => {
                                try {                                     
                                    insertOrUpdateEntry(sp_entries)                                      
                                    resolve(insertOrUpdateCSV({fileName: files.name}))
                                } catch (e) {
                                    alert(e)
                                }
                            }
                        })
                    }).then(data => {
                        this.go({name: "Functions", params: {csv: data}})
                    })

                } catch (e) {
                    this.$router.go()
                }


            },
            go: function (obj) {
                this.$router.push(obj)
            },
            loadFiles: function () {
                try {
                    setTimeout(()=>{
                        getCSV({}).then((data) => {
                            this.items = data.map((item) => {
                                let ret = {
                                    ...item,
                                    removeText: "Apagar entrada"
                                    ,
                                    view: () => {
                                        this.go({name: 'Functions', params: {csv: item['name']}})
                                    }
                                }
                                ret.remove = () => {
                                    ret.removeText = "Apagado aguarde ..."
                                    deleteCSV(item).then(() => {
                                        ret.removeText = "Apagado com sucesso!"
                                    }).then(()=>{
                                        let index = this.items.findIndex((element) => {
                                            return element._id === item._id
                                        })
                                        this.items.splice(index, 1)
                                    })

                                }

                                return ret
                            })

                            setTimeout(this.loadFiles, 1000)
                        })
                    }, 100)

                } catch (e) {
                    alert("Explorer bloqueando aplicativo: sem acesso a pasta local")
                }
            }


        }
    }
</script>

<style scoped>
    .dropzone-custom-content {
        position: absolute;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
    }

    .dropzone-custom-title {
        margin-top: 0;
        color: #00b782;
    }

    .subtitle {
        color: #314b5f;
    }

    #lateral .v-btn--example {
        bottom: 0;
        position: absolute;
        margin: 0 0 16px 16px;
    }
</style>
