<template>
    <div>
        <nav class="navbar navbar-expand-lg navbar-light bg-light">
            <a class="navbar-brand left" v-on:click.stop="$router.back()" href="#">Voltar</a>
            <div class="navbar-nav justify-content-center">
                <a class="nav-item nav-link active text-center" href="#">{{csv.filename}} <span class="sr-only">(current)</span></a>
            </div>
        </nav>
        <div class="container">
            <h4>Arquivos Fontes Externas</h4>
            <P>Na tabela a seguir mostramos o progresso de download das bases de dados externas</P>
            <hr/>
            <table class="table text-center">
                <thead>
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Site</th>
                    <th scope="col">Progresso</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(item, index) in items" :key="index">
                    <th scope="row">{{ index }}</th>
                    <th scope="row">{{item.initials}}: {{ item.site }}</th>
                    <th scope="row">
                        <div class="pt5 nb5" v-if="item.completedSteps !== item.totalSteps">

                            <div :class="box_cls" :style="box_style">
                                <div :class="label_cls" class="text-center">Loading data <strong><a href="#" v-on:click.stop="reloadPage">Travou? clique para recarregar</a></strong></div>
                                <progress-bar size="tiny" :val="(item.completedSteps/item.totalSteps )*100"
                                              :text="'Completo: '+ item.completedSteps +' de ' + item.totalSteps"/>
                            </div>

                        </div>
                        <div v-else>
                            Download completo
                        </div>
                    </th>

                </tr>
                </tbody>
            </table>
            <div :key="graph">

                <graph-bar
                        :height="400"
                        :axis-min="0"
                        :axis-max="items[0].totalSteps"
                        :labels="status.labels"
                        :values="status.values">
                    <note :text="'Tabela de plantas com status do taxon'"></note>
                    <tooltip :names="status.names" :position="'left'"></tooltip>
                    <legends :names="status.names" :filter="true"></legends>
                </graph-bar>
            </div>
            <hr/>
            <h4>Exemplo de cruzamento de dados entre duas Base de dados</h4>
            <p>
                Verificamos entre duas Base de dados se a Planta pesquisa e aceita nas duas bases, se a planta e um
                sinônimo ele mostra a planta aceita, se duas plantas for sinônimo ele verifica se as plantas aceita retornada são
                iguais.
            </p>
            <hr/>
            <table class="table text-center">
                <thead>
                <tr>
                    <th scope="col">Dados Cruzados</th>
                    <th scope="col">Visualizar</th>
                </tr>
                </thead>

                <tbody>
                     <tr>
                        <th scope="row">Flora do Brazil x The Plant List</th>
                        <th scope="row">
                            <a href="#"
                            v-on:click.stop="$router.push({name:'Relation', params:{csv: csv, site_a:'FDB', site_b:'TPL'}})">Visualizar</a>
                        </th>
                    </tr>
                </tbody>
            </table>

            <div :key="graph2" v-if="items[0].completedSteps>0 && items[1].completedSteps>0">

                <graph-pie
                        :width="500"
                        :height="500"
                        :padding-top="75"
                        :padding-right="75"
                        :padding-bottom="75"
                        :padding-left="75"
                        :values="relation.values"
                        :names="relation.names"
                        :active-index="[ 0, 2 ]"
                        :active-event="'click'"
                        :show-text-type="'outside'"
                        :data-format="dataFormat"
                        :shape="'donut'"
                        :show-total-value="true">
                    <note :text="'Grafico de igualdade entre FDB e TPL'"></note>
                    <legends :names="relation.names"></legends>
                    <tooltip :names="relation.names"></tooltip>
                </graph-pie>
            </div>
            <h4>Tabela de informações site </h4>
            Tabela de informações dos sinônimos.

            <table class="table text-center">
                <thead>
                <tr>
                    <th scope="col">Tabela</th>
                    <th scope="col">Visualizar</th>
                </tr>
                </thead>
                <tbody>

                <tr>
                    <th scope="row">Flora do Brasil</th>
                    <th scope="row">
                        <a href="#"
                           v-on:click.stop="$router.push({name:'BaseOnline', params:{csv: csv, site_a:'FDB', site_b:'None'}})">Visualizar</a>
                    </th>
                </tr>
                <tr>
                    <th scope="row">The Plant List</th>
                    <th scope="row">
                        <a href="#"
                           v-on:click.stop="$router.push({name:'BaseOnline', params:{csv: csv, site_a:'TPL', site_b:'None'}})">Visualizar</a>
                    </th>
                </tr>
                <tr>
                    <th scope="row">Não encontrados em Flora do Brasil e The Plant List.</th>
                    <th scope="row">
                        <a href="#"
                           v-on:click.stop="$router.push({name:'BaseOnline', params:{csv: csv, site_a:'FDB', site_b:'TPL'}})">Visualizar</a>
                    </th>
                </tr>
                </tbody>
            </table>

            <hr/>
            <h4> Baixar ocorrencias</h4>

            <a href="#" v-on:click.stop="$router.push({name:'Ocorrencias', params:{csv: csv}})"> clique para iniciar a
                busca
                de ocorrencias</a>

        </div>
        <hr/>


    </div>
</template>

<script>
    import ProgressBar from 'vue-simple-progress'
    import {getEntries, loadGBIF, sleep} from "../../api";
    import {loadCorrection} from "../../api/GBIF";
    import {FDBSearch} from "../../api/FloraDoBrazil";
    import {TPLSearch} from "../../api/ThePlantList";
    import {language_Entry} from "../../language/PTBR";

    export default {
        name: "Functions",
        components: {
            ProgressBar,
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
        created() {
            this.csv = this.$route.params.csv
            let _entries = getEntries({fileName: this.csv.fileName})
            let totalSteps = _entries.length;
            this.items.forEach(item => {
                item.totalSteps = totalSteps
            })

            _entries.reduce((accumulatorPromise, entry) =>{
                let _loadFDB  = null
                let _loadTPL = null
                return accumulatorPromise
                    .then(() =>{
                        return sleep(500)
                    })
                    .then(()=>{
                        _loadFDB =  this.load_FDB({ entry_name: entry.entry_name })
                        return _loadFDB
                    })
                    .then(() => {
                        _loadTPL = this.load_TPL({ entry_name: entry.entry_name })
                        return _loadTPL
                    })
                    .then(() => {
                        let _loadFDBResult = _loadFDB
                            .then(item =>{                                  
                                let status_tag = {[this.accept]: 0, [this.synonym]: 1, ['']: 2};
                                this.status.values[0][status_tag[item.status]] += 1;
                                this.graph += 1;
                                this.items[0].completedSteps += 1;
                                return item    
                            })
                        let _loadTPLResult =_loadTPL
                            .then(item =>{
                                let status_tag = {[this.accept]: 0, [this.synonym]: 1, ['']: 2};
                                this.status.values[1][status_tag[item.status]] += 1;
                                this.graph += 1;
                                this.items[1].completedSteps += 1;
                                return item    
                            })

                        return Promise.all([_loadFDBResult, _loadTPLResult])
                            .then(e => {
                                let [_fdb, _tpl] = e
                                let FDBxTPL = 0;

                                let a = this.relationx2(_fdb, _tpl);
                                for (let i = 0; i < a.length; i++)
                                    this.relation.values[i] += a[i];
                                this.graph2 += 1;

                                let condFDB = this.items[0].completedSteps === this.items[0].totalSteps;
                                let condTPL = this.items[1].completedSteps === this.items[1].totalSteps;

                                Promise.resolve(true)
                            })
                    })
            }, Promise.resolve())       
        },
        methods: {
            reloadPage(){
                window.location.reload()
            },
            dataFormat: function (a, b) {
                if (b) return Math.round((b / this.relation.values.reduce((a, b) => a + b, 0)) * 100) + "%";
                return a;
            },
            load_FDB(obj) {                
                return FDBSearch(obj.entry_name)
                    .then(item => {  
                        if (item) {
                            return {
                                status: (item[language_Entry.accepted_name] !== item[language_Entry.found_name] ? this.synonym : this.accept),
                                name: item[language_Entry.accepted_name] 
                            }
                        } else {
                            return {
                                status: "",
                                name: ""
                            }
                        }
                    })
            },
            load_TPL(obj) {                
                return TPLSearch(obj.entry_name)
                    .then(item => {
                        if (item) {
                            return {
                                status: (item[language_Entry.accepted_name] !== item[language_Entry.found_name] ? this.synonym : this.accept),
                                name: item[language_Entry.accepted_name]
                            }
                        } else {
                            return {
                                status: "",
                                name: ""
                            }
                        }
                    })                
            },
            relationx2: function (a, b) {       
                let eq = (a && b) ? a.status === b.status : false
                let eqSynonym = (a && b) ? eq && a.status === this.synonym : false
                let eqAccept = (a && b ) ? eq && a.status === this.accept : false
                let eqName = (a && b) ? a.name === b.name : false

                if (eqAccept || eqSynonym && eqName)
                    return [1, 0, 0, 0, 0];

                if (eqSynonym && !eqName)
                    return [1, 0, 0, 0, 0];

                if (!eq && a && b)
                    return [0, 1, 0, 0, 0];

                if (!eq && !a && b)
                    return [0, 0, 1, 0, 0];

                if (!eq && a && !b)
                    return [0, 0, 0, 1, 0];

                return [0, 0, 0, 0, 1]
            }
        },
        data() {
            return {
                status: {
                    names: ["FDB", "TPL"],
                    labels: ['Status aceito', 'Sinonimo', 'Não encontrado'],
                    values: [
                        [0, 0, 0],
                        [0, 0, 0]
                    ],
                },
                relation: {
                    names: ['Igual', 'Distinto', 'Apenas TPL', 'Apenas FDB', 'Nenhum'],
                    values: [0, 0, 0, 0, 0],
                },
                graph: 0,
                graph2: 10000,
                items: [
                    {
                        initials: "FDB",
                        site: "Flora do Brazil",
                        completedSteps: 0,
                        totalSteps: 1,
                        params: {csv: this.$route.params.csv, site: "FDB"}
                    },
                    {
                        initials: "TPL",
                        site: "The Plant List",
                        completedSteps: 0,
                        totalSteps: 1,
                        params: {csv: this.$route.params.csv, site: "TPL"}
                    }
                ],
                synonym: "Sinonimo",
                accept: "Taxon aceito",
                pages: [
                    {
                        site: "Flora do Brazil x The Plant List",
                        params: {csv: this.$route.params.csv, site_a: "FDB", site_b: "TPL"},
                        go_next: false
                    }
                ]
            }
        },
    }
</script>

<style scoped>

</style>
