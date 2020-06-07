const mimir = require('mimir')
const brain = require('brain.js')


function vec_result(res, num_classes) {
    var i = 0,
        vec = [];
    for (i; i < num_classes; i += 1) {
        vec.push(0);
    }
    vec[res] = 1;
    return vec;
}

function maxarg(array) {
    return array.indexOf(Math.max.apply(Math, array));
}


function most_accurate(result, taxon) {
    let str2 = taxon.replace(/[0-9`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
    str2 = str2.replace('  ', ' ');
    str2 = str2.split(" ")


    let data = result.map(i => {
        let str = i.replace(/[0-9`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
        str = str.replace('  ', ' ');
        str = str.split(" ")

        let a = str2.map((a) => str.includes(a)).filter(a => a === true).length
        let b = str.map((a) => str2.includes(a)).filter(a => a === true).length
        return (b + a) / (str2.length + str.length)
    })
    let index = maxarg(data.map(value => isNaN(value) ? 0 : value))
    return index
}

module.exports = most_accurate
