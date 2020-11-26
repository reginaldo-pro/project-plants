const levenshtein = require('js-levenshtein');
import { getSpeciesAndAuthor, getSpeciesAndAuthorNames, getSpeciesName, removeInfraSpeciesRank } from "./api/index";

function minArg(array) {
    //return array.indexOf(Math.min.apply(Math, array));
    return Math.min(...array)
}

function most_accurate(result, taxon) {   
    let [_taxonName, _taxonAuthor] =  getSpeciesAndAuthor(removeInfraSpeciesRank(taxon))
    let _spName = getSpeciesAndAuthorNames(taxon)

    result = result
        .reduce((a, c) =>{
            if (_taxonName === getSpeciesName(removeInfraSpeciesRank(c))) {
                a.push(removeInfraSpeciesRank(getSpeciesAndAuthorNames(c)))    
            }
            return a
        }, [])

    if (result.length == 1) {
        return result[0]
    } 
    else if (result.length > 1){
        if (_taxonAuthor && _taxonAuthor !== '') {
            let levDist = result
                .map(e => {
                    return levenshtein(_spName, e)
                })
            return result[minArg(levDist)]
        }
        else {
            return result[0]
        }
    }
    else {
        return null
    }
}

export { 
    most_accurate
}
