/**
 * firebase version.
 * 
 * this is the main backend module of the project. it runs continuesly in the 
 * background on the server and performs its tasks, which consist of:
 * 
 * - reading in the config file from local harddrive, containing the station 
 * ids.
 * 
 * for each type of measurement and forecast:
 * - reading in the mapping of timestamps to filenames, creating it in case it
 *   doesnt exist.
 * - looking for updates on ftp server by comparing the timestamps with those
 *   of the values stored in realtime-database.
 * - marking files for download in case a more recent file is detected.
 * - updating the mapping of timestamps to filenames.
 * - downloading marked files to local harddrive.
 * - unzipping files after download.
 * - parsing files to arrays after unzipping.
 * - inserting/updating the new values into the realtime-database.
 * - cleaning up the local directories.
 * 
 * make sure /cfg/metadata.txt exists before running this module.
 */

// TODO: implement rate limiter to avoid write per second limit.

// TODO: choose whether to use 1 or 10 min rr. (atm 10min in use)

/**
 * ---------------
 * --- IMPORTS ---
 * ---------------
 */

'use strict'

// standard library imports.
const fs = require('fs');
const util = require('util');

// promisified imports.
const readDir = util.promisify(fs.readdir);

// additional library imports.
const Zip = require("adm-zip");

// custom library imports.
const parser = require('./lib/universal-parser/universal-parser.js');
const timeConv = require('./lib/time-conv/time-conv.js');
const basicFtpLastMod = require('./lib/basic-ftp-wrapper/basic-ftp-last-mod.js');
const basicFtpDown = require('./lib/basic-ftp-wrapper/basic-ftp-down.js');
const measurements = require('./lib/data-objects/measurements.js');
const forecasts = require('./lib/data-objects/forecasts.js');

// firebase admin sdk setup.
const fbAdmin = require("firebase-admin");
const serviceAccount = require("./cfg/firebaseAdminKey.json");
fbAdmin.initializeApp({
    credential: fbAdmin.credential.cert(serviceAccount),
    databaseURL: "https://ezwwa-fb-default-rtdb.europe-west1.firebasedatabase.app/"
});

/**
 * ------------------------
 * --- GLOBAL VARIABLES ---
 * ------------------------
 */

// config paths.
const cfgPath = "./cfg/";
const metaFile = "metadata.txt";

// ftp source paths.
// TODO: choose whether to use 1 or 10 min rr.
const tenMinRRSourcePath = "/climate_environment/CDC/observations_germany/climate/10_minutes/precipitation/now/";
const oneMinRRSourcePath = "/climate_environment/CDC/observations_germany/climate/1_minute/precipitation/now/";
const tenMinFFSourcePath = "/climate_environment/CDC/observations_germany/climate/10_minutes/wind/now/";
const tenMinTUSourcePath = "/climate_environment/CDC/observations_germany/climate/10_minutes/air_temperature/now/";
const mosSourcePath = "/weather/local_forecasts/mos/MOSMIX_L/single_stations/";

// local target paths.
// TODO: choose whether to use 1 or 10 min rr.
const tenMinRRTargetPath = "./data/raw/10minrr/"
const oneMinRRTargetPath = "./data/raw/1minrr/";
const tenMinFFTargetPath = "./data/raw/10minff/";
const tenMinTUTargetPath = "./data/raw/10mintu/";
const mosTargetPath = "./data/raw/mos/";

// mappings of timestamps to filenames.
// TODO: choose whether to use 1 or 10 min rr.
let tenMinRRTime = [];
let oneMinRRTime = [];
let tenMinFFTime = [];
let tenMinTUTime = [];
let mosTime = [];

// put station ids into arrays.
const dwdIdsArr = parser.parseTxt(cfgPath + metaFile, "dwdid", 0);
const mosIdsArr = parser.parseTxt(cfgPath + metaFile, "mosid", 0);

// constants.
const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * ------------------------
 * --- HELPER FUNCTIONS ---
 * ------------------------
 */

/**
 * helper function. ensures that a folder exists. create it if it doesnt.
 * 
 * @param {String} folderPath the path to the desired folder.
 */
const ensureFolder = async (folderPath) => {
    try {

        // check wheteher the directory already exists.
        if (!fs.existsSync(folderPath)) {

            // in case it doesnt, create it.
            fs.mkdirSync(folderPath);

        } // endif

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. reads in array with mapping of timestamps to station ids 
 * and construct array of files that need to be downloaded due to updates.
 * 
 * @param {Array}   timeMapArr array of mapping of station ids and timestamps.
 * @param {String}  type       input type of the files, e.g. "1minrr" for 
 *                             precipitation data in one minute intervals.
 * 
 * @returns {Array} array with the mapping of station ids and timestamps.
 */
const prepCheckTimes = async (timeMapArr, type) => {
    try {

        // prepare array of correct ids (dwd or mos).
        let idsArr = [];
        if (type == "mos") {
            idsArr = await mosIdsArr;
        } else {
            idsArr = await dwdIdsArr;
        } // endif

        // initialize result array.
        const resultArr = [];

        // if timestamp mapping is not availible yet, construct it.
        if (timeMapArr.length == 0) {

            //iterate through all stations.
            for (let i in idsArr) {
                // check input type and construct filenames accordingly. also, 
                // map to long gone timestamp to ensure ftp server file is 
                // recognized as updated.
                if (type == "1minrr") {

                    resultArr.push("1minutenwerte_nieder_" + idsArr[i] + "_now.zip" + ": " + "0000000000000");

                    // TODO: choose whether to use 1 or 10 min rr.
                } else if (type == "10minrr") {

                    resultArr.push("10minutenwerte_nieder_" + idsArr[i] + "_now.zip" + ": " + "0000000000000");

                } else if (type == "10minff") {

                    resultArr.push("10minutenwerte_wind_" + idsArr[i] + "_now.zip" + ": " + "0000000000000");

                } else if (type == "10mintu") {

                    resultArr.push("10minutenwerte_TU_" + idsArr[i] + "_now.zip" + ": " + "0000000000000");

                } else if (type == "mos") {

                    // remove whitespace from mos_id. also, add specific paths to 
                    // each file as forecasts for each station are located in 
                    // separated folders.
                    resultArr.push(idsArr[i].replace(/\s/g, "") + "/kml/MOSMIX_L_LATEST_" + idsArr[i].replace(/\s/g, "") + ".kmz" + ": " + "0000000000000");

                } // endif
            } // endfor

            return resultArr;

        } else {

            // else just return the already existing mapping.
            return timeMapArr;

        } // endif

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. constructs an array of filenames depending on type.
 * 
 * @param {String}  type input type of the files, e.g. "1minrr" for 
 *                       precipitation data in one minute intervals.
 * 
 * @returns {Array} array of filenames.
 */
const prepFileNameArr = async (type) => {
    try {

        // prepare array of correct ids (dwd or mos).
        let idsArr = [];
        if (type == "mos") {
            idsArr = await mosIdsArr;
        } else {
            idsArr = await dwdIdsArr;
        } // endif

        // initialize result array.
        const resultArr = []

        // iterate through all stations.
        for (let i in idsArr) {
            // check input type and construct filenames accordingly.
            if (type == "1minrr") {

                resultArr.push("1minutenwerte_nieder_" + idsArr[i] + "_now.zip");

                // TODO: choose whether to use 1 or 10 min rr.
            } else if (type == "10minrr") {

                resultArr.push("10minutenwerte_nieder_" + idsArr[i] + "_now.zip");

            } else if (type == "10minff") {

                resultArr.push("10minutenwerte_wind_" + idsArr[i] + "_now.zip");

            } else if (type == "10mintu") {

                resultArr.push("10minutenwerte_TU_" + idsArr[i] + "_now.zip");

            } else if (type == "mos") {

                // remove whitespace from mos_id. also, add specific paths to 
                // each file as forecasts for each station are located in 
                // separated folders.
                resultArr.push(idsArr[i].replace(/\s/g, "") + "/kml/MOSMIX_L_LATEST_" + idsArr[i].replace(/\s/g, "") + ".kmz");

            } // endif
        } // endfor

        return resultArr;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. gets timestamps of last updates of all files specified in 
 * the input array from ftp server and maps those timestamps to filenames.
 * 
 * @param {String}  ftpPath     path to directory on ftp server.
 * @param {Array}   fileNameArr array of filenames.
 * 
 * @returns {Array} array containing a mapping of timestamps to filenames.
 */
const checkArrUpdOnFtp = async (ftpPath, fileNameArr) => {
    try {

        // basically just wrap the following external helper function.
        const timestamps = basicFtpLastMod.basicFtpLastModArr(ftpPath, fileNameArr);

        return timestamps;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. prepares an array of files to download by comparing
 * timestamps of files on ftp server with locally stored mapping.
 * 
 * @param {Array}  localTimeMapArr array containing a mapping of timestamps to
 *                                 filenames. local version.
 * @param {Array}  ftpTimeMapArr   array containing a mapping of timestamps to
 *                                 filenames. ftp version.
 * 
 * @returns {Array} array containing names of files that got updated on ftp 
 *                  server.
 */
const prepArrDown = async (localTimeMapArr, ftpTimeMapArr) => {
    try {

        // initialize result array.
        const resultArr = []

        // iterate through all local...
        for (let i in localTimeMapArr) {
            // ... and remote timestamps.
            for (let j in ftpTimeMapArr) {

                // slice at ": " to separate filenames from timestamps.
                let localSliceArr = localTimeMapArr[i].split(": ");
                let ftpSliceArr = ftpTimeMapArr[j].split(": ");

                // if filenames are equal and if ftp timestamp is fresher...
                if ((localSliceArr[0] == ftpSliceArr[0]) && (localSliceArr[1] < ftpSliceArr[1])) {
                    // ...add filename to the result array.
                    resultArr.push(localSliceArr[0]);

                } // endif
            } // endfor
        } // endfor

        return resultArr;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. downloads measurement values specified in the type 
 * argument from all stations provided in the input array.
 * 
 * @param {Array}  sourceArr array of filenames to download.
 * @param {String} type      input type of the files, e.g. "1minrr" for 
 *                           precipitation data in one minute intervals.
 */
const downloadArr = async (sourceArr, type) => {
    try {

        // check input type and construct paths accordingly.
        if (type == "1minrr") {

            await basicFtpDown.basicFtpDownArr(oneMinRRSourcePath, sourceArr, oneMinRRTargetPath);

            // TODO: choose whether to use 1 or 10 min rr.
        } else if (type == "10minrr") {

            await basicFtpDown.basicFtpDownArr(tenMinRRSourcePath, sourceArr, tenMinRRTargetPath);

        } else if (type == "10minff") {

            await basicFtpDown.basicFtpDownArr(tenMinFFSourcePath, sourceArr, tenMinFFTargetPath);

        } else if (type == "10mintu") {

            await basicFtpDown.basicFtpDownArr(tenMinTUSourcePath, sourceArr, tenMinTUTargetPath);

        } else if (type == "mos") {

            await basicFtpDown.basicFtpDownArr(mosSourcePath, sourceArr, mosTargetPath);

        } // endif

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. unzips all content in a specified directory.
 * 
 * @param {String} dirPath path to local directory with files to unzip.
 */
const unzipDir = async (dirPath) => {
    try {

        // read content of the specified directory.
        const dirContent = await readDir(dirPath);
        for (let fileName in dirContent) {
            // only unzip .zip files, ignore the rest.
            if (dirContent[fileName].substr(dirContent[fileName].length - 4) === '.zip') {
                new Zip(dirPath + dirContent[fileName]).extractAllTo(dirPath);
            }// endif
        } // endfor

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. parses all content in a specified directory to an array of arrays.
 * 
 * @param {String}  dirPath path to local directory with files to parse.
 * 
 * @returns {Array} array with measurements.
 */
const parseDir = async (dirPath) => {
    try {

        // initialize result array.
        const resultArr = [];
        // read content of the specified directory.
        const dirContent = await readDir(dirPath);

        for (let fileName in dirContent) {
            // only parse .txt or .kml files, ignore the rest.
            if (dirContent[fileName].substr(dirContent[fileName].length - 4) === '.txt' ||
                dirContent[fileName].substr(dirContent[fileName].length - 4) === '.kml') {
                // check input type and construct input config for parser.
                if (dirPath.substring(dirPath.length - 7) == "1minrr/") {

                    resultArr.push(await parser.parseTxt(dirPath + dirContent[fileName], "1minrr", 1));

                    // TODO: choose whether to use 1 or 10 min rr.
                } else if (dirPath.substring(dirPath.length - 8) == "10minrr/") {

                    resultArr.push(await parser.parseTxt(dirPath + dirContent[fileName], "10minrr", 1));

                } else if (dirPath.substring(dirPath.length - 8) == "10minff/") {

                    resultArr.push(await parser.parseTxt(dirPath + dirContent[fileName], "10minff", 1));

                } else if (dirPath.substring(dirPath.length - 8) == "10mintu/") {

                    resultArr.push(await parser.parseTxt(dirPath + dirContent[fileName], "10mintu", 1));

                } else if (dirPath.substring(dirPath.length - 4) == "mos/") {

                    resultArr.push(await parser.parseKml(dirPath + dirContent[fileName]));

                } // endif
            } // endif
        } // endfor

        return resultArr;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. transforms input array of arrays into array of js object.
 * 
 * @param {Array}   arr  input array of arrays containing measurements, 
 *                       forecasts, radar.
 * @param {String}  type type of input, e.g. measurements (1minrr, 10minff,...),
 *                       forecasts, radar...
 * 
 * @returns {Array} array of objects containing  measurements, forecasts, radar.
 */
const transformObjArr = async (arr, type) => {
    try {

        // initialize result array.
        let resultArr = [];

        // check input type and construct objects accordingly.
        if (type == "1minrr") {

            // for each station...
            for (let series in arr) {

                // get the id, just from the first measurement in the first 
                // series, since it doesnt change.
                let id = arr[series][0][0];
                // initialize measurement array for next step.
                let rsMeasuresArr = [];

                // ...for each series of measurements...
                for (let measure in arr[series]) {

                    // convert timestamps to javascript timestamp format. 
                    // index 1 is the date of the measurement.
                    const convTs = timeConv.convertTime(arr[series][measure][1], "dwd", "js");

                    // fill measurement array with mappings of times and 
                    // measurements. index 2 is the value.
                    let rsMapping = {
                        date: convTs,
                        value: arr[series][measure][2]
                    }
                    rsMeasuresArr.push(rsMapping);

                } // endfor

                // create object for each station and push it to result array.
                let resultObj = new measurements.OneMinRR(id, rsMeasuresArr);
                resultArr.push(resultObj);

            } // endfor            

            // TODO: choose whether to use 1 or 10 min rr.
        } else if (type == "10minrr") {

            // for each station...
            for (let series in arr) {

                // get the id, just from the first measurement in the first 
                // series, since it doesnt change.
                let id = arr[series][0][0];
                // initialize measurement array for next step.
                let rwsMeasuresArr = [];

                // ...for each series of measurements...
                for (let measure in arr[series]) {

                    // convert timestamps to javascript timestamp format. 
                    // index 1 is the date of the measurement.
                    const convTs = timeConv.convertTime(arr[series][measure][1], "dwd", "js");

                    // fill measurement array with mappings of times and 
                    // measurements. index 2 is the value.
                    let rwsMapping = {
                        date: convTs,
                        value: arr[series][measure][2]
                    }
                    rwsMeasuresArr.push(rwsMapping);

                } // endfor

                // create object for each station and push it to result array.
                let resultObj = new measurements.TenMinRR(id, rwsMeasuresArr);
                resultArr.push(resultObj);

            } // endfor      

        } else if (type == "10minff") {

            // for each station...
            for (let series in arr) {

                // get the id, just from the first measurement in the first 
                // series, since it doesnt change.
                let id = arr[series][0][0];
                // initialize measurement array for next step.
                let ffMeasuresArr = [];
                let ddMeasuresArr = [];

                // ...for each series of measurements...
                for (let measure in arr[series]) {

                    // convert timestamps to javascript timestamp format.
                    // index 1 is the date of the measurement.
                    const convTs = timeConv.convertTime(arr[series][measure][1], "dwd", "js");

                    // fill measurement array with mappings of times and 
                    // measurements. index 2 is the value.
                    let ffMapping = {
                        date: convTs,
                        value: arr[series][measure][2]
                    }
                    ffMeasuresArr.push(ffMapping);
                    // index 3 is the value.
                    let ddMapping = {
                        date: convTs,
                        value: arr[series][measure][3]
                    }
                    ddMeasuresArr.push(ddMapping);

                } // endfor

                // create object for each station and push it to result array.
                let resultObj = new measurements.TenMinFF(id, ffMeasuresArr, ddMeasuresArr);
                resultArr.push(resultObj);

            } // endfor

        } else if (type == "10mintu") {

            // for each station...
            for (let series in arr) {

                // get the id, just from the first measurement in the first 
                // series, since it doesnt change.
                let id = arr[series][0][0];
                // initialize measurement array for next step.
                let ppMeasuresArr = [];
                let ttMeasuresArr = [];

                // ...for each series of measurements...
                for (let measure in arr[series]) {

                    // convert timestamps to javascript timestamp format.
                    // index 1 is the date of the measurement.
                    const convTs = timeConv.convertTime(arr[series][measure][1], "dwd", "js");

                    // fill measurement array with mappings of times and 
                    // measurements. index 2 is the value.
                    let ppMapping = {
                        date: convTs,
                        value: arr[series][measure][2]
                    }
                    ppMeasuresArr.push(ppMapping);
                    // index 3 is the value.
                    let ttMapping = {
                        date: convTs,
                        value: arr[series][measure][3]
                    }
                    ttMeasuresArr.push(ttMapping);

                } // endfor

                // create object for each station and push it to result array.
                let resultObj = new measurements.TenMinTU(id, ppMeasuresArr, ttMeasuresArr);
                resultArr.push(resultObj);

            } // endfor

        } else if (type == "mos") {

            // for each station...
            for (let series in arr) {

                // get the id, just from the first forecast in the first 
                // series, since it doesnt change.
                let id = arr[series][0][0];
                // initialize forecasts array for next step.
                let ppppForecastsArr = [];
                let tttForecastsArr = [];
                let ffForecastsArr = [];
                let ddForecastsArr = [];
                let rrl1cForecastsArr = [];
                let r101ForecastsArr = [];

                // ...for each series of forecasts...
                for (let forecast in arr[series]) {

                    // convert timestamps to javascript timestamp format.
                    // index 1 is the date of the forecast
                    const convTs = timeConv.convertTime(arr[series][forecast][1], "mos", "js");

                    // fill forecasts array with mappings of times and 
                    // forecasts. index 2 is the value.
                    let ppppMapping = {
                        date: convTs,
                        value: arr[series][forecast][2]
                    }
                    ppppForecastsArr.push(ppppMapping);
                    //index 3 is the value.
                    let tttMapping = {
                        date: convTs,
                        value: arr[series][forecast][3]
                    }
                    tttForecastsArr.push(tttMapping);
                    //index 4 is the value.
                    let ffMapping = {
                        date: convTs,
                        value: arr[series][forecast][4]
                    }
                    ffForecastsArr.push(ffMapping);
                    //index 5 is the value.
                    let ddMapping = {
                        date: convTs,
                        value: arr[series][forecast][5]
                    }
                    ddForecastsArr.push(ddMapping);
                    //index 6 is the value.
                    let rrl1cMapping = {
                        date: convTs,
                        value: arr[series][forecast][6]
                    }
                    rrl1cForecastsArr.push(rrl1cMapping);
                    //index 7 is the value.
                    let r101Mapping = {
                        date: convTs,
                        value: arr[series][forecast][7]
                    }
                    r101ForecastsArr.push(r101Mapping);

                } // endfor

                // create object for each station and push it to result array.
                let resultObj = new forecasts.Mos(
                    id,
                    ppppForecastsArr,
                    tttForecastsArr,
                    ffForecastsArr,
                    ddForecastsArr,
                    rrl1cForecastsArr,
                    r101ForecastsArr);
                resultArr.push(resultObj);

            } // endfor

        } // endif

        return resultArr;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. inserts array of data into designated path on database.
 * 
 * firebase version.
 * 
 * @param {String} path    path to node in database to insert data into.
 * @param {Array}  dataArr array containing data objects to insert into database.
 * 
 */
const insertArrIntoDbFb = async (path, dataArr) => {
    try {

        // connect to database.
        const fbDatabase = fbAdmin.database();

        // get a reference to target path.
        const ref = fbDatabase.ref(path);

        // TODO: implement rate limiter.

        // insert data into designated path on database.
        for (let i in dataArr) {

            // create new measurement object.
            let entry = ref.child(dataArr[i].getId());
            await entry.update(dataArr[i].getValues(),

                (error) => {
                    if (error) {
                        console.log("Data could not be saved." + error);
                    } // endif
                });
        } // endfor

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. deletes all files in a specified local directory.
 * 
 * @param {String} dirPath path to local directory with files to delete.
 */
const cleanupDir = async (dirPath) => {
    try {

        // read content of the specified directory.
        const dirContent = await readDir(dirPath)

        // deletes all files in directory.
        for (let fileName in dirContent) {
            fs.unlink(dirPath + dirContent[fileName], (err => {
                if (err) console.log(err);
            }));
        } // endfor

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. deletes all database entries in a specified database path,
 * that are older than the specified amount of days.
 * 
 * @param {String} type     type of database entries to delete, e.g. 10minff.
 * @param {Number} keepDays the number of days prior to which everything will
 *                          be deleted.
 */
const cleanupDbFb = async (type, keepDays) => {
    try {

        // initialize variable for array of ids to be stored in.
        let idsArr = [];

        // get the date corresponding to so many days ago as as specified in 
        // the keepDate argument as js timestamp.
        const keepDate = new Date().getTime() - keepDays * DAY_IN_MS + "";

        // get a database reference.
        const fbDatabase = fbAdmin.database();

        // check type.
        if (type == "10minff") {
            idsArr = await dwdIdsArr;
            // for all dwd ids...
            for (let i in await idsArr) {
                // generate database path.
                const ddRef = fbDatabase.ref("/measurements/" + idsArr[i] + "/dd");
                const ffRef = fbDatabase.ref("/measurements/" + idsArr[i] + "/ff");
                // range query. get all children whos date property is bigger then
                // the keepDate specified above and remove them.
                ddRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    ddRef.child(snapshot.key).remove();
                });
                ffRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    ffRef.child(snapshot.key).remove();
                });
            } // endfor

        } else if (type == "10mintu") {
            idsArr = await dwdIdsArr;
            // for all dwd ids...
            for (let i in await dwdIdsArr) {
                // generate database path.
                const ppRef = fbDatabase.ref("/measurements/" + idsArr[i] + "/pp");
                const ttRef = fbDatabase.ref("/measurements/" + idsArr[i] + "/tt");

                // range query. get all children whos date property is bigger then
                // the keepDate specified above and remove them.
                ppRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    ppRef.child(snapshot.key).remove();
                });
                ttRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    ttRef.child(snapshot.key).remove();
                });
            } // endfor

            // TODO: split into batches or find another way to avoid Firebase 
            // RangeError: Maximum call stack size exceeded.
        } else if (type == "1minrr") {
            idsArr = await dwdIdsArr;
            // for all dwd ids...
            for (let i in await dwdIdsArr) {
                // generate database path.
                const rsRef = fbDatabase.ref("/measurements/" + idsArr[i] + "/rs");

                // range query. get all children whos date property is bigger then
                // the keepDate specified above and remove them.
                rsRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    rsRef.child(snapshot.key).remove();
                });
            } // endfor

            // TODO: choose whether to use 1 or 10 min rr.
        } else if (type == "10minrr") {
            idsArr = await dwdIdsArr;
            // for all dwd ids...
            for (let i in await dwdIdsArr) {
                // generate database path.
                const rwsRef = fbDatabase.ref("/measurements/" + idsArr[i] + "/rws");

                // range query. get all children whos date property is bigger then
                // the keepDate specified above and remove them.
                rwsRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    rwsRef.child(snapshot.key).remove();
                });
            } // endfor

        } else if (type == "mos") {
            idsArr = await mosIdsArr;
            // for all mos ids...
            for (let i in await idsArr) {
                // generate database paths.
                // remove whitespace.
                const ddRef = fbDatabase.ref("/forecasts/" + idsArr[i].replace(/\s/g, "") + "/dd");
                const ffRef = fbDatabase.ref("/forecasts/" + idsArr[i].replace(/\s/g, "") + "/ff");
                const ppppRef = fbDatabase.ref("/forecasts/" + idsArr[i].replace(/\s/g, "") + "/pppp");
                const tttRef = fbDatabase.ref("/forecasts/" + idsArr[i].replace(/\s/g, "") + "/ttt");
                const rrl1cRef = fbDatabase.ref("/forecasts/" + idsArr[i].replace(/\s/g, "") + "/rrl1c");
                const r101Ref = fbDatabase.ref("/forecasts/" + idsArr[i].replace(/\s/g, "") + "/r101");
                // range query. get all children whos date property is bigger then
                // the keepDate specified above and remove them.
                ddRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    ddRef.child(snapshot.key).remove();
                });
                ffRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    ffRef.child(snapshot.key).remove();
                });
                ppppRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    ppppRef.child(snapshot.key).remove();
                });
                tttRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    tttRef.child(snapshot.key).remove();
                });
                rrl1cRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    rrl1cRef.child(snapshot.key).remove();
                });
                r101Ref.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                    r101Ref.child(snapshot.key).remove();
                });
            } // endfor
        } // endif

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * ----------------------
 * --- TEST FUNCTIONS ---
 * ----------------------
 */

/**
 * test function. creates test data.
 */
const createTestData = async () => {
    try {

        let testArr = [];

        let testMapping1 = {
            id: "01",
            values:
                [
                    {
                        date: "012",
                        value: "a"
                    },
                    {
                        date: "123",
                        value: "b"
                    },
                    {
                        date: "234",
                        value: "c"
                    },
                ],
        }
        testArr.push(testMapping1);

        let testMapping2 = {
            id: "02",
            values:
                [
                    {
                        date: "345",
                        value: "d"
                    },
                    {
                        date: "456",
                        value: "e"
                    },
                    {
                        date: "567",
                        value: "f"
                    },
                ],
        }
        testArr.push(testMapping2);

        let testMapping3 = {
            id: "03",
            values:
                [
                    {
                        date: "678",
                        value: "g"
                    },
                    {
                        date: "789",
                        value: "h"
                    },
                    {
                        date: "890",
                        value: "i"
                    },
                ],
        }
        testArr.push(testMapping3);

        return testArr;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * test function. inserts test data into db.
 */
const insertTestData = async (dataArr) => {
    try {

        // connect to database.
        const fbDatabase = fbAdmin.database();

        // get a reference to target path.
        const ref = fbDatabase.ref("test");

        // insert data into designated path on database.
        for (let i in dataArr) {

            // create new measurement object.
            let entry = ref.child(dataArr[i].id);
            await entry.update(dataArr[i].values,

                (error) => {
                    if (error) {
                        console.log("Data could not be saved." + error);
                    } // endif
                });
        } // endfor

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * test function.
 */
const readTestData = async () => {
    try {

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * test function. removes test data from db.
 */
const deleteTestData = async () => {
    try {

        // initialize variable for array of ids to be stored in.
        let idsArr = [];

        const keepDate = "456";

        // get a database reference.
        const fbDatabase = fbAdmin.database();

        idsArr = ["01", "02", "03"];
        // for all test ids...
        for (let i in idsArr) {
            // generate database path.
            const testRef = fbDatabase.ref("/test/" + idsArr[i]);
            // range query. get all children whos date property is bigger then
            // the keepDate specified above and remove them.

            testRef.orderByChild("date").endAt(keepDate).on("child_added", (snapshot) => {
                testRef.child(snapshot.key).remove();
            });
        } // endfor

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * test function.
 */
const testCycle = async () => {
    try {

        //createTestData()
        //    .then((testDataArr) => insertTestData(testDataArr));
        //await readTestData();
        //await deleteTestData();

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * ----------------------
 * --- MAIN FUNCTIONS ---
 * ----------------------
 */

/**
 * repeating procedure for precipitation measurements in one minute intervals.
 */
const cycleOneMinRR = async () => {
    try {

        // make sure local storage folder structure exists.
        await ensureFolder(oneMinRRTargetPath);

        // prepare mapping of filenames and times.
        const times = prepCheckTimes(oneMinRRTime, "1minrr");

        // prepare array of files that got updated on ftp server.
        const files = prepFileNameArr("1minrr")
            .then((fileNameArr) => { return checkArrUpdOnFtp(oneMinRRSourcePath, fileNameArr) });

        // wait for the two operations above to complete before proceding.
        Promise.all([times, files])
            .then((timeMapArrs) => {
                // update mapping of filenames and times. 
                oneMinRRTime = timeMapArrs[1];
                // prepare an array of files to download.
                return prepArrDown(timeMapArrs[0], timeMapArrs[1])
            })
            // download files specified in the provided array.
            .then((sourceArr) => { return downloadArr(sourceArr, "1minrr") })
            // unzip all archives.
            .then(() => { return unzipDir(oneMinRRTargetPath) })
            // parse files to array.
            .then(() => { return parseDir(oneMinRRTargetPath) })
            // transform into array of objects to insert.
            .then(async (measuresArr) => { return transformObjArr(measuresArr, "1minrr") })
            // insert into database.
            .then((objArr) => { return insertArrIntoDbFb("measurements", objArr) })
            // clean up working directory.
            .then(() => { cleanupDir(oneMinRRTargetPath) });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * TODO: choose whether to use 1 or 10 min rr.
 * repeating procedure for precipitation measurements in ten minute intervals.
 */
const cycleTenMinRR = async () => {
    try {

        // make sure local storage folder structure exists.
        await ensureFolder(tenMinRRTargetPath);

        // prepare mapping of filenames and times.
        const times = prepCheckTimes(tenMinRRTime, "10minrr");

        // prepare array of files that got updated on ftp server.
        const files = prepFileNameArr("10minrr")
            .then((fileNameArr) => { return checkArrUpdOnFtp(tenMinRRSourcePath, fileNameArr) });

        // wait for the two operations above to complete before proceding.
        Promise.all([times, files])
            .then((timeMapArrs) => {
                // update mapping of filenames and times. 
                tenMinRRTime = timeMapArrs[1];
                // prepare an array of files to download.
                return prepArrDown(timeMapArrs[0], timeMapArrs[1])
            })
            // download files specified in the provided array.
            .then((sourceArr) => { return downloadArr(sourceArr, "10minrr") })
            // unzip all archives.
            .then(() => { return unzipDir(tenMinRRTargetPath) })
            // parse files to array.
            .then(() => { return parseDir(tenMinRRTargetPath) })
            // transform into array of objects to insert.
            .then(async (measuresArr) => { return transformObjArr(measuresArr, "10minrr") })
            // insert into database.
            .then((objArr) => { return insertArrIntoDbFb("measurements", objArr) })
            // clean up working directory.
            .then(() => { cleanupDir(tenMinRRTargetPath) });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * repeating procedure for wind measurements in ten minute intervals.
 */
const cycleTenMinFF = async () => {
    try {

        // make sure local storage folder structure exists.
        await ensureFolder(tenMinFFTargetPath);

        // prepare mapping of filenames and times.
        const times = prepCheckTimes(tenMinFFTime, "10minff");

        // prepare array of files that got updated on ftp server.
        const files = prepFileNameArr("10minff")
            .then((fileNameArr) => { return checkArrUpdOnFtp(tenMinFFSourcePath, fileNameArr) });

        // wait for the two operations above to complete before proceding.
        Promise.all([times, files])
            .then((timeMapArrs) => {
                // update mapping of filenames and times. 
                tenMinFFTime = timeMapArrs[1];
                // prepare an array of files to download.
                return prepArrDown(timeMapArrs[0], timeMapArrs[1])
            })
            // download files specified in the provided array.
            .then((sourceArr) => { return downloadArr(sourceArr, "10minff") })
            // unzip all archives.
            .then(() => { return unzipDir(tenMinFFTargetPath) })
            // parse files to array.
            .then(() => { return parseDir(tenMinFFTargetPath) })
            // transform into array of objects to insert.
            .then(async (measuresArr) => { return transformObjArr(measuresArr, "10minff") })
            // insert into database.
            .then((objArr) => { return insertArrIntoDbFb("measurements", objArr) })
            // clean up working directory.
            .then(() => { cleanupDir(tenMinFFTargetPath) });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * repeating procedure for temperature measurements in ten minute intervals.
 */
const cycleTenMinTU = async () => {
    try {

        // make sure local storage folder structure exists.
        await ensureFolder(tenMinTUTargetPath);

        // prepare mapping of filenames and times.
        const times = prepCheckTimes(tenMinTUTime, "10mintu");

        // prepare array of files that got updated on ftp server.
        const files = prepFileNameArr("10mintu")
            .then((fileNameArr) => { return checkArrUpdOnFtp(tenMinTUSourcePath, fileNameArr) });

        // wait for the two operations above to complete before proceding.
        Promise.all([times, files])
            .then((timeMapArrs) => {
                // update mapping of filenames and times. 
                tenMinTUTime = timeMapArrs[1];
                // prepare an array of files to download.
                return prepArrDown(timeMapArrs[0], timeMapArrs[1])
            })
            // downloads files specified in the provided array.
            .then((sourceArr) => { return downloadArr(sourceArr, "10mintu") })
            // unzip all archives.
            .then(() => { return unzipDir(tenMinTUTargetPath) })
            // parse files to array.
            .then(() => { return parseDir(tenMinTUTargetPath) })
            // transform into array of objects to insert.
            .then(async (measuresArr) => { return transformObjArr(measuresArr, "10mintu") })
            // insert into database.
            .then((objArr) => { return insertArrIntoDbFb("measurements", objArr) })
            // clean up working directory.
            .then(() => { cleanupDir(tenMinTUTargetPath) });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * repeating procedure for mosmix forecasts.
 */
const cycleMos = async () => {
    try {

        // make sure local storage folder structure exists.
        await ensureFolder(mosTargetPath);

        // prepare mapping of filenames and times.
        const times = prepCheckTimes(mosTime, "mos");

        // prepare array of files that got updated on ftp server.
        const files = prepFileNameArr("mos")
            .then((fileNameArr) => { return checkArrUpdOnFtp(mosSourcePath, fileNameArr) });

        // wait for the two operations above to complete before proceding.
        Promise.all([times, files])
            .then((timeMapArrs) => {
                // update mapping of filenames and times. 
                mosTime = timeMapArrs[1];
                // prepare an array of files to download.
                return prepArrDown(timeMapArrs[0], timeMapArrs[1])
            })
            // downloads files specified in the provided array.
            .then((sourceArr) => { return downloadArr(sourceArr, "mos") })
            // unzip all archives.
            .then(() => { return unzipDir(mosTargetPath) })
            // parse files to array.
            .then(() => { return parseDir(mosTargetPath) })
            // transform into array of objects to insert.
            .then(async (mosArr) => { return transformObjArr(mosArr, "mos") })
            // insert into database.
            .then((objArr) => { return insertArrIntoDbFb("forecasts", objArr) })
            // clean up working directory.
            .then(() => { cleanupDir(mosTargetPath) });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * main cycle. keeps database up to date with data from ftp server.
 * repeats once every 10 minutes.
 */
const mainCycle = async () => {
    try {

        // wait for all following procedures to terminate...
        Promise.all([
            // TODO: choose whether to use 1 or 10 min rr.
            //cycleOneMinRR(),
            cycleTenMinRR(),
            cycleTenMinFF(),
            cycleTenMinTU(),
            cycleMos()
        ])
            // ...then repeat every 10 min.
            .then(() => { setTimeout(mainCycle, 600000) });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * main cleanup routine. removes entries older than specified amount of days. 
 */
const mainCleanup = async () => {
    try {

        // set keepDays to 0 to wipe measurements and forecasts from db.
        const keepDays = 0;

        // wait for all following procedures to terminate...
        Promise.all([
            // TODO: choose whether to use 1 or 10 min rr.
            cleanupDbFb("1minrr", keepDays),
            cleanupDbFb("10minrr", keepDays),
            cleanupDbFb("10minff", keepDays),
            cleanupDbFb("10mintu", keepDays),
            cleanupDbFb("mos", keepDays)
        ])
            // ...then repeat every 24h.
            .then(() => { setTimeout(mainCleanup, 86400000) });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * main function. repeats main procedures in set intervals.
 */
const main = async () => {
    try {
        mainCycle();
        //mainCleanup();
        //testCycle();

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

// ----------------
// --- RUN MAIN ---
// ----------------

main();