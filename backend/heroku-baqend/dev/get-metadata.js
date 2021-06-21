/**
 * this module combines dwd and mosmix metadata and writes it to harddisk.
 * 
 * run this module before init-db.js but after stat-idmap.js.
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
const metaPath = "../data/meta/";
const cfgPath = "../cfg/";

const fileEinMinRR = "ein_now_rr_Beschreibung_Stationen.txt";
const idMap = "station-id-map.txt"

/**
 * ------------------------
 * --- HELPER FUNCTIONS ---
 * ------------------------
 */

/**
 * helper function. computes array of metadata information from the two 
 * previously computed arrays, mapping them to each other on the id field.
 * result array has the form: 
 * ['dwd_id0, mos_id0', name0, lon0, lat0',
 *  'dwd_id1, mos_id1', name1, lon1, lat1', ... ]
 * 
 * @param {Array}   arr array containing two arrays, the first on being an 
 *                      array containing a mapping of dwd and mosmix station 
 *                      ids, and the second one containing station metadata.
 * 
 * @returns {Array} array of metadata information mapped to station ids.
 */
const matchIds = async (arr) => {
    try {

        const idMapArray = arr[0];
        const statMetaArray = arr[1];

        let resultArray = [];
        let uniqueArray = [];
        for (let i in idMapArray) {
            for (let j in statMetaArray) {
                // check if id property is equal, which starts at position 0
                // and ends at index 5, thus the substring(0, 5).
                if (idMapArray[i].substring(0, 5)
                    === statMetaArray[j].substring(0, 5)) {
                    // gather the desired metadata from idMapArray and appends 
                    // it onto statMetaArray, stripping it from the redundant 
                    // data. some mosmix stations have multiple entries with 
                    // different ids, so remove duplicates, while were at it.
                    if (!uniqueArray.includes(idMapArray[i].substring(0, 5))) {
                        uniqueArray.push(idMapArray[i].substring(0, 5));
                        resultArray.push(idMapArray[i].substring(0, 5) + "; "
                            + idMapArray[i].substring(7, 12) + "; "
                            + statMetaArray[j].substring(7));
                    }
                } // endif
            } // endfor
        } // endfor    

        return resultArray;

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
 * main function. reads in dwd and mosmix station id mapping and station 
 * metadata mapping both together and writing it to a file on local harddrive.
 */
const main = async () => {
    try {

        // read mapping of station ids to array.
        const idMapArray = parser.parseTxt(cfgPath + idMap, "miss", 0);

        // get station name, geo long. and geo lat. from a dwd meta file.
        const statMetaArray =
            parser.parseTxt(metaPath + fileEinMinRR, "meta", 2);

        // combine all metadata into one array and write it to file.
        Promise.all([idMapArray, statMetaArray])
            .then((unmatchedArr) => { return matchIds(unmatchedArr) })
            .then((matchedArr) => {
                writeArrFile.writeArrToFile(matchedArr, cfgPath + "metadata.txt")
            });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

// ----------------
// --- RUN MAIN ---
// ----------------

main();