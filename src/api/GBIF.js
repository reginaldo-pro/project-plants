// Corrector GBIF
import axios from "axios";
import * as db from "../db";

const insertCorrectorGBIF = async (entry) => {
    return await db.correctorGBIF.insert(entry)
}

const getCorrectorGBIF = async (cond) => {
    return await db.correctorGBIF.find(cond)
}
// search
const loadCorrection = async (obj) => {
    return new Promise(resolve => {
        try {
            if (!obj.name) {
                resolve({})
            } else {

                getCorrectorGBIF(obj).then((data) => {
                    if (data.length > 0) {
                        resolve(data[0])
                    } else {
                        let url = "https://api.gbif.org/v1/species/match?name=" + obj.name;

                        axios
                            .get(url)
                            .then(response => {
                                insertCorrectorGBIF({name: obj.name, correction: response.data}).then((data) => {
                                    resolve(data)
                                }).catch(() => {
                                    resolve(null)
                                })
                            }).catch(() => {
                            resolve(null)
                        })


                    }
                }).catch(() => {
                    resolve(null)
                })
            }
        } catch (e) {
            resolve(null)
        }
    })
}
const loadCorrectionOffline = async (obj) => {
    return new Promise(resolve => {
        try {
            getCorrectorGBIF({name: obj.name}).then((data) => {
                if (data.length > 0) {
                    resolve(data[0])
                } else {
                    resolve({})
                }
            })
        } catch (e) {
            return null
        }
    })
}
export {
    loadCorrection,
    loadCorrectionOffline
}
