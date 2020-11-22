import { db } from "../db";

const insertOrUpdateEntry = (entries) => {
    let _res = db.entry
        .insert(entries)
        .sync()    
        .getContents()

    return _res
};

export {
    insertOrUpdateEntry
}
