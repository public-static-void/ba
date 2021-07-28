/**
 * this module handles downloads from the dwd ftp server.
 */

/**
* ---------------
* --- IMPORTS ---
* ---------------
*/

// additional library imports.
const ftp = require("basic-ftp")

/**
 * ----------------------
 * --- MAIN FUNCTIONS ---
 * ----------------------
 */

/**
 * downloads a file from the opendata.dwd.de ftp server.
 * 
 * @param {String} sourcePath the full file path on the ftp server.
 * @param {String} targetPath the full path to store file on local harddrive.
 */
exports.basicFtpDown = async (sourcePath, targetPath) => {
    try {

        // initialize and configure connection properties.
        const client = new ftp.Client();
        client.ftp.verbose = false;

        // connect to ftp server.
        await client.access({
            //host: "opendata.dwd.de",
            host: "141.38.2.22",
            user: "anonymous",
            password: "",
            secure: false
        });

        await client.downloadTo(targetPath, sourcePath);

        // close connection.
        client.close()

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun

/**
 * downloads all files specified in the array from the opendata.dwd.de ftp server.
 * 
 * @param {String} sourcePath the full directory path on the ftp server.
 * @param {Array}  sourceArr  array of file names on the ftp server.
 * @param {String} targetPath the directory to store files on local harddrive.
 * 
 */
exports.basicFtpDownArr = async (sourcePath, sourceArr, targetPath) => {
    try {

        // initialize and configure connection properties.
        const client = new ftp.Client();
        client.ftp.verbose = false;

        // connect to ftp server.
        await client.access({
            //host: "opendata.dwd.de",
            host: "141.38.2.22",
            user: "anonymous",
            password: "",
            secure: false
        });
        // construct paths and download.
        for (let i in sourceArr) {
            // check for mos filepaths as those need special treatment.
            // more specific, the array containing mos filenames actually also
            // includes the paths, since the mos forecasts for each station 
            // are stored in separate folders on ftp server. but we want to 
            // make sure all files are downloaded to the same folder.
            if (sourceArr[i].includes("MOSMIX")) {
                await client.downloadTo(targetPath + i + ".zip", sourcePath + sourceArr[i]);
            } else {
                await client.downloadTo(targetPath + sourceArr[i], sourcePath + sourceArr[i]);
            } // endif
        } // endfor

        // close connection.
        client.close();

    } catch (err) {
        console.log(err)
        client.close();
    } // endtry
} // endfun