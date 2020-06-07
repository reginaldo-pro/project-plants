import * as db from "../db";

const EntryInsertOrUpdate = async (entry_name, obj) => {
    return db.entry.findOne({name: entry_name}).then(data => {
        if (!data) {
            return db.entry.insert(obj)
        } else {
            return db.entry.update({name: entry_name}, obj).then(d => {
                return db.entry.findOne({name: entry_name}).then(data => {
                    return data
                })
            })
        }
    })
};

export {
    EntryInsertOrUpdate
}
