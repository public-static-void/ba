/**
 * this module completes the mapping of dwd and mosmix station ids by reading
 * in the file provided with the missing station ids.
 *  
 * run this module before get-metadata.js but after setup-stat-idmap.js.
 * make sure, missing-stations.txt is in ../cfg/ and has mapping of the 
 * missing station ids in the form "dwd_id: mosmix_id".
 */

/**
* ---------------
* --- IMPORTS ---
* ---------------
*/

'use strict'
// custom library imports.
const parser = require('../lib/universal-parser/universal-parser.js');
const writeArrFile = require('./write-arr-file.js');

/**
 * ------------------------
 * --- GLOBAL VARIABLES ---
 * ------------------------
 */

// data paths.
const cfgPath = "../cfg/";

const missingStations = "missing-stations.txt";
const matchedStations = "matched.txt"

/**
 * ------------------------
 * --- HELPER FUNCTIONS ---
 * ------------------------
 */

/**
 * helper function. maps stations on dwd and mosmix ids by splitting at "<==>".
 * 
 * @param {Array}   arr array of dwd and mos ids and station names mapped to 
 *                      each other separated with "<==>".
 * 
 * @returns {Array} array containing a mapping of only dwd and mos station ids.
 */
const mapStations = async (arr) => {
    try {

        var statIdMapArr = [];
        for (let i in arr) {
            statIdMapArr.push(arr[i].substring(0, 5) + ": "
                + arr[i].split("<==>").pop().substring(1, 6));
        } // endfor
        return statIdMapArr;

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
 * main function. reads in the file containing the missing station ids to map
 * dwd and mosmix station ids and writes it to a file on the local harddrive.
 */
const main = async () => {
    try {

        // read mapping of missing station ids to array.
        const missStatArr = parser.parseTxt(cfgPath + missingStations, "miss", 0);

        // read already mapped station ids to array.
        const matchedArr = parser.parseTxt(cfgPath + matchedStations, "match", 0);

        //make a full station id mapping.
        const mappedArr = matchedArr
            .then((matchedArr) => { return mapStations(matchedArr) });

        //merge resultArray with missStatArray and write to file.
        Promise.all([mappedArr, missStatArr])
            .then((mapMissArr) => { return mapMissArr[0].concat(mapMissArr[1]) })
            .then((mergedArr) => { writeArrFile.writeArrToFile(mergedArr, cfgPath + "station-id-map.txt") })

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

// ----------------
// --- RUN MAIN ---
// ----------------

main();