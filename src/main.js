require('bulma');
require('./style.scss');
// var MyWorker = require('worker-loader?name=worker_name.worker.js!./worker.js');

// if any ajax is unable to get data if with throw this eror in console
const fetchErr = new Error(['unable to fetch data'])

async function appProccess() {
    dom.appBtn.addClass('is-loading');
    const masterJson = await fetchJson('https://raw.githubusercontent.com/everypolitician/everypolitician-data/master/countries.json')
    const countryObjs = getAllUrls(masterJson);
    const countryArr = await getCountry(countryObjs);
    const politicians = filterPoliticians(countryArr);
    const flattenedObjArr = flattenTop(politicians);
    const formattedArr = formatObjs(flattenedObjArr);
    const csvStr = convertToCSV(formattedArr);
    dom.convertMax.text(formattedArr.length);
    dom.info.css({'display': 'block'});
    dom.resultBtn.css({ 'display': 'block' });
    dom.resultBtn.click(() => download(csvStr));
    dom.appBtn.removeClass('is-loading');
}

// all requests go through here
function fetchJson(url) {
    return $.getJSON(url)
        .done(data => {
            return data;
        })
        .fail(() => {
            // decide how to handle failed fetches
            throw fetchErr;
        })
}

// gathers all popolo json url's in a single array and bundles up the iso code for the country with it
function getAllUrls(masterJson) {
    let countriesMap = masterJson.map(country => {
        let countryObj = {
            url: country.legislatures[0].popolo_url,
            code: country.code
        }
        return countryObj;
    });
    return countriesMap
}


// fetches ALL popolo jsons and gathers all data in one array and adds code key to each json
async function getCountry(urls) {
    let progress = $('.fetch');
    let current = 0;
    $('.fetch-max').text(urls.length);
    let fetchCurr = $('.fetch-curr')
    progress.attr('max', urls.length);
    let countryData = [];
    await Promise.all(urls.map(async url => {
        const contents = await fetchJson(url.url);
        current++;
        fetchCurr.text(current)
        progress.attr('value', current);
        contents.isoCode = url.code;
        contents.source_url = url.url;
        countryData.push(contents);
    }));
    return countryData;
};


function filterPoliticians(countryFiles) {
    let politicians = [];
    countryFiles.forEach(countryFile => {
        countryFile.persons.forEach(person => {
            person.nationality = countryFile.isoCode;
            person.source_url = countryFile.source_url;
            politicians.push(person);
        });
    })
    return politicians;
};

function flattenTop(objs) {
    let flattenedArr = [];
    objs.forEach(obj => {
        let flattenedObj = flatten(obj);
        for (let key in flattenedObj) {
            if (flattenedObj.hasOwnProperty(key)) {
                flattenedObj[key] = flattenedObj[key].replace(/,/g, '');
            }
        }
        flattenedArr.push(flattenedObj);
    });
    return flattenedArr;
}

function flatten(obj) {
    let toReturn = {};

    for (let i in obj) {
        if (!obj.hasOwnProperty(i)) continue;

        if ((typeof obj[i]) === 'object') {
            let flatObject = flatten(obj[i]);
            for (let x in flatObject) {
                if (!flatObject.hasOwnProperty(x)) continue;
                toReturn[i + x] = flatObject[x];
            }
        } else {
            toReturn[i] = obj[i];
        }
    }
    return toReturn;
};


function formatObjs(objs) {
    let keys = ['program', 'last_name', 'uid', 'updated_at', 'first_name', 'middle_name', 'source', 'date_of_birth',
        'publisher_url', 'type', 'function', 'source_url', 'nationality', 'publisher', 'name', 'gender', 'summary',
        'country_of_birth', 'place_of_birth', 'source_id', 'second_name'];
    let formattedObjs = objs.map(obj => {
        let formattedObj = new Object();
        keys.forEach(key => {
            formattedObj[key] = ''
        })
        if (obj.id) {
            formattedObj.uid = obj.id;
            delete obj.id;
        }
        if (obj.given_name) {
            formattedObj.first_name = obj.given_name;
            delete obj.given_name;
        }
        formattedObj.source = 'EveryPolitician.org';
        if (obj.birth_date) {
            formattedObj.date_of_birth = obj.birth_date;
        }
        delete obj.birth_date;
        formattedObj.type = 'individual';
        if (obj.source_url) {
            formattedObj.source_url = obj.source_url;
            delete obj.source_url;
        }
        if (obj.nationality) {
            formattedObj.nationality = obj.nationality;
            delete obj.nationality;
        }
        if (obj.name) {
            formattedObj.name = obj.name;
            delete obj.name;
        }
        if (obj.gender) {
            formattedObj.gender = obj.gender;
            delete obj.gender;
        }
        let str = '';
        for (let key in obj) {
            str += ' ' + obj[key];
        }
        formattedObj.summary = str;
        formattedObj.source_id = 'EVERY-POLITICIAN';
        return formattedObj;
    })
    return formattedObjs;
}

function convertToCSV(args) {
    var result, ctr, keys, columnDelimiter, lineDelimiter, data;
    data = args || null;
    if (data == null || !data.length) {
        return null;
    }

    columnDelimiter = args.columnDelimiter || ',';
    lineDelimiter = args.lineDelimiter || '\n';

    keys = Object.keys(data[0]);

    result = '';
    result += keys.join(columnDelimiter);
    result += lineDelimiter;

    data.forEach(function (item) {
        ctr = 0;
        keys.forEach(function (key) {
            if (ctr > 0) result += columnDelimiter;
            result += item[key];
            ctr++;
        });
        result += lineDelimiter;      
    });
    return result;
}

function download(data) {
    var a = document.createElement("a"),
        file = new Blob([data], { type: 'csv' });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, 'full.entities.csv');
    else { // Others
        var url = URL.createObjectURL(file);
        a.href = url;
        a.download = 'full.entities.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}


const dom = {
    appBtn: $('.test'),
    resultBtn: $('.result'),
    convertMax: $('.convert-max'),
    info: $('.info')
}

// button event listener
dom.appBtn.click(() => appProccess());