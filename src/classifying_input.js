const levenshtein = require('js-levenshtein');
import { getSpeciesAndAuthorNames } from "./api/index";

function minArg(array) {
    return array.indexOf(Math.min.apply(Math, array));
}

function most_accurate(result, taxon) {   
    let strSearch = taxon.replace(/[0-9`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
    strSearch = getSpeciesAndAuthorNames(taxon)
    let data = result
        .map((e) =>{
            let strResult = e.replace(/[0-9`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
            strResult = getSpeciesAndAuthorNames(strResult)
            if (strResult.includes(strSearch)){
                return levenshtein(strSearch, strResult)
            }
        })
        .filter(e => e !== undefined)
    return minArg(data)
}

export { 
    most_accurate
}
