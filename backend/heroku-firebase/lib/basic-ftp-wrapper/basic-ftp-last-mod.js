/**
 * this module handles getting timestamps of last modifications of files on 
 * dwd ftp server.
 */

/**
* ---------------
* --- IMPORTS ---
* ---------------
*/

// additional library imports.
const ftp = require("basic-ftp");

/**
 * ----------------------
 * --- MAIN FUNCTIONS ---
 * ----------------------
 */

/**
 * checks a file from the opendata.dwd.de ftp server for last modification.
 * 
 * @param {String} dirName the full dir or file path on the ftp server.
 * 
 * @return {String} timestamp of the last modification of the file.
 */
exports.basicFtpLastMod = async (filePath) => {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        // connect to ftp server.
        await client.access({
            //host: "opendata.dwd.de",
            host: "141.38.2.22",
            user: "anonymous",
            password: "",
            secure: false
        });

        let interim = await client.lastMod(filePath);
        let result = interim.getTime();

        client.close();
        return result;

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun

/**
 * checks a file from the opendata.dwd.de ftp server for last modification.
 * 
 * @param {String} dirPath the full dir path on the ftp server.
 * @param {String} fileNameArr array of filenames.
 * 
 * @return {Array} array containing a mapping of filenames to timestamps of 
 *                 last modifications separated by ": ".
 */
exports.basicFtpLastModArr = async (dirPath, fileNameArr) => {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    try {
        // connect to ftp server.
        await client.access({
            //host: "opendata.dwd.de",
            host: "141.38.2.22",
            user: "anonymous",
            password: "",
            secure: false
        });

        let resultArr = [];
        // for each filename in the provided array...
        for (let fileName in fileNameArr) {
            // ...get the timestamp of last modification and...
            let interim = await client.lastMod(dirPath + fileNameArr[fileName]);
            // ...add filename and corresponding timestamp to result array.
            resultArr.push(fileNameArr[fileName] + ": " + interim.getTime());
        } // endfor

        client.close();
        return resultArr;

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun