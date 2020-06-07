<template>
    <div>

        <vue-dropzone :options="dropzoneOptions" :useCustomSlot=true id="dropZ"
                      @vdropzone-file-added="vfileAdded" @vdropzone-success="vfileSuccess">
            <div class="dropzone-custom-content">
                <h3 class="dropzone-custom-title">Arraste e solte o arquivo csv!</h3>
                <div class="subtitle">...o click aqui e selecione o arquivo</div>
            </div>
        </vue-dropzone>

        <table class="table text-center">
            <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col" v-if="items" v-for="(item, index) in items[0]">{{index}}</th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="(item, index) in items" :key="index" style="cursor:pointer;"
                v-on:click.stop="go({name: 'Functions', params: {csv: item['fileName']}})">
                <th scope="row" class="pointer">{{ index }}</th>
                <th scope="row" v-for="(item, index) in item" class="pointer">{{item}}</th>

            </tr>
            </tbody>
        </table>


    </div>

</template>

<script>
    import vue2Dropzone from 'vue2-dropzone'
    import 'vue2-dropzone/dist/vue2Dropzone.min.css'
    import Papa from 'papaparse'
    import {getCSV, insertOrUpdateCSV} from "../../api";
    import {EntryInsertOrUpdate} from "../../api/Entry";

    export default {
        name: 'Entries',
        components: {
            vueDropzone: vue2Dropzone
        },
        created() {
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
            vfileSuccess: function (){
                alert("Ok")
            },
            vfileAdded: function vfileAdded(files) {

                try{
                    new Promise(resolve => {
                        Papa.parse(files, {
                            download: true,
                            worker: true,
                            step: row => {
                                try{
                                    if (row.data) {
                                        let entry = {name: row.data[0], fileName: files.name}
                                        EntryInsertOrUpdate(entry.name, entry)
                                    }
                                }
                                catch (e) {
                                    alert("")
                                }
                            },
                            complete: () => {
                                try {
                                    insertOrUpdateCSV({fileName: files.name}).then(()=>{
                                        resolve(files.name)
                                    })
                                } catch (e) {
                                    alert(e)
                                }
                            }

                        })
                    }).then(data =>{
                        this.go({name: "Functions", params: {csv: data}})
                    })

                }
                catch (e) {
                    this.$router.go()
                }


            },
            go: function (obj) {
                this.$router.push(obj)
            },
            loadFiles: function () {

                try {
                    getCSV({}).then((data) => {
                        this.items = data
                    })
                }
                catch (e) {
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
