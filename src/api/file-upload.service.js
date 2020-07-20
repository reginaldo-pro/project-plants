import Papa from "papaparse";

function upload(formData) {
    const photos = formData.getAll('photos');
    const promises = photos.map((x) => processFile(x)
        .then(img => ({
            originalName: x.name,
            fileName: x.name,
            data: img.data
        })));
    return Promise.all(promises);
}

function processFile(file) {
    return new Promise((resolve, reject) => {
        const fReader = new FileReader();
        const img = document.createElement('div');

        fReader.onload = () => {
            Papa.parse(file, {
                download: true,
                worker: true,
                complete: function(result) {
                    resolve(result);
                }
            })


        }

        fReader.readAsDataURL(file);
    })
}

export { upload }
