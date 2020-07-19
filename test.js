var obj = { 0: [], 1: [2,4], 2: [1] };

console.log(Object.values(obj).reduce((a,b)=>{
    return a.concat(b)
})); // ['a', 'b', 'c']
