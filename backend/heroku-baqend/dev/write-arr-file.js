/**
 * this module handles writing arrays to files.
 */

/**
* ---------------
* --- IMPORTS ---
* ---------------
*/

'use strict';
// standard library imports.
const util = require('util');
const fs = require('fs');
// promisified imports.
const pfsw = { writeFile: util.promisify(fs.writeFile) };
const pfsa = { appendFile: util.promisify(fs.appendFile) };

/**
 * ----------------------
 * --- MAIN FUNCTIONS ---
 * ----------------------
 */

/**
 * writes an array to a file on local harddrive.
 * 
 * @param {Array} arr       array containing information to write to file.
 * @param {String} filePath might be needed for further operations.
 */
exports.writeArrToFile = async (arr, filePath) => {
    try {

        // overwrite in case file exists.
        await pfsw.writeFile(filePath, "", { encoding: 'utf8', flag: 'w' });
        for (let i in arr) {
            try {
                // write input to file.
                pfsa.appendFile(filePath, arr[i] + "\n")
                // file written successfully.
            } catch (err) {
                console.error(err)
            } // endtry
        } // endfor

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun
