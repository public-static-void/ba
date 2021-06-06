/**
 * this module maps station ids of dwd and mosmix, gathered from respective 
 * meta files, and write them to a file, up to the point where manual inter-
 * vention is required in the form of manually mapping missing station ids.
 *  
 * run this module before stat-idmap.js.
 */

/**
 * ---------------
 * --- IMPORTS ---
 * ---------------
 */

'use strict'
// additional library imports.
const _ = require('underscore');
// custom library imports.
const parser = require('../lib/universal-parser/universal-parser.js');
const writeArrFile = require('./write-arr-file.js');

/**
 * ------------------------
 * --- GLOBAL VARIABLES ---
 * ------------------------
 */

// data paths.
const metaPath = "../data/meta/";
const cfgPath = "../cfg/";

const fileEinMinRR = "ein_now_rr_Beschreibung_Stationen.txt";
const fileZehnMinRR = "zehn_now_rr_Beschreibung_Stationen.txt";
const fileZehnMinFF = "zehn_now_ff_Beschreibung_Stationen.txt";
const fileZehnMinTU = "zehn_now_tu_Beschreibung_Stationen.txt";

const cfgFile = "mosmix_stationskatalog.cfg";

/**
 * ------------------------
 * --- HELPER FUNCTIONS ---
 * ------------------------
 */

/**
 * helper function. computes intersection array of 4 provided arrays.
 * 
 * @param {Array}   arr array consisting of 4 arrays.
 * 
 * @returns {Array} intersection array.
 */
const getIntersec = async (arr) => {
    try {
        const result = _.intersection(
            arr[0],
            arr[1],
            arr[2],
            arr[3]);
        return result;
    } catch (err) {
        console.log(err);
    } // endfun
} // endfun

/**
 * helper function. computes array of dwd ids and mos ids from dwd and cfg 
 * metadata information, mapping them to each other on the name, separated by 
 * "<==>". returns an array consisting of two arrays, the second one is just 
 * the dwd ids, because it will be handy to have later on.
 *
 * @param {Array}   arr array consisting of two arrays: one containing the 
 *                      dwd stations, and the other the mos stations.
 * 
 * @returns {Array} array consisting of two results: first is an array mapping
 *                  dwd ids to mos ids, the other containing just the dwd ids.
 */
const matchNames = async (arr) => {
    try {
        let selStatArr = arr[0];
        let cfgArr = arr[1];
        let resultArr = [];
        let dwdArr = [];
        for (let i in selStatArr) {
            for (let j in cfgArr) {
                // check if name property is equal, which starts at position 7, 
                // thus the substring at index 7.
                if (selStatArr[i].substring(7) === cfgArr[j].substring(7)) {
                    resultArr.push(selStatArr[i] + " <==> " + cfgArr[j]);
                    dwdArr.push(selStatArr[i]);
                } // endif
            } // endfor
        } // endfor    
        return [resultArr, dwdArr];
    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. computes difference array of 2 provided arrays.
 * 
 * @param {Array}   arr array consisting of two arrays, the secound one in turn
 *                      consisting of two arrays again.
 * 
 * @returns {Array} difference array.
 */
const getDiff = async (arr) => {
    let arr0 = arr[0];
    let arr1 = arr[1];
    try {
        let result = _.difference(arr0, arr1[1]);
        return result;
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
 * main function. gets ids of all dwd stations providing all measurements, 
 * then maps dwd and mos station ids to each other by matching on the names
 * and writes this mapping to a local file. then finds all stations that 
 * couldnt get mapped this way and writes them to a file in local storage.
 */
const main = async () => {

    // parse dwd meta files.
    const einMinRRArr = parser.parseTxt(metaPath + fileEinMinRR, "dwd", 2);
    const zehnMinFFArr = parser.parseTxt(metaPath + fileZehnMinFF, "dwd", 2);
    const zehnMinRRArr = parser.parseTxt(metaPath + fileZehnMinRR, "dwd", 2);
    const zehnMinTUArr = parser.parseTxt(metaPath + fileZehnMinTU, "dwd", 2);

    // parse mosmix cfg file.
    const cfgArr = parser.parseTxt(metaPath + cfgFile, "cfg", 4);

    // only select stations which are present in all arrays, 
    // e.g. stations which provide all measurements.
    const selStatArr = Promise.all([
        einMinRRArr,
        zehnMinFFArr,
        zehnMinRRArr,
        zehnMinTUArr])
        .then((selStatArr) => { return getIntersec(selStatArr) });

    // get all dwd and mosmix station ids by matching on the name field.
    const matStatArr = Promise.all([selStatArr, cfgArr])
        .then((unmatStatArr) => { return matchNames(unmatStatArr) });

    // get all missing stations due to different naming and errors parsing names.
    Promise.all([selStatArr, matStatArr])
        .then((selMatArr) => { return getDiff(selMatArr) })
        // write all missing stations into a file.
        .then((missArr) => {
            writeArrFile.writeArrToFile(missArr, cfgPath + "remaining.txt")
        });

    // also, write the already matched stations to file.
    matStatArr
        // we want the array of selected stations which is at the 0th index 
        // of the result array of the matchNames() operation.
        .then((selMatArr) => { return selMatArr[0] })
        // write to file.
        .then((matArr) => {
            writeArrFile.writeArrToFile(matArr, cfgPath + "matched.txt")
        });

} // endfun

// ----------------
// --- RUN MAIN ---
// ----------------

main();

// at this point, remaining.txt in ../cfg/ will have a list of station ids.
// manual intervention is needed, to map missing station ids in the format 
// "dwd_id: mosmix_id" by hand to a file missing-stations.txt and put it in 
// ../cfg/ as well, then proceed with stat-idmap.js.
