/**
 * this module initializes the database with stations data.
 * 
 * run this module before main.js but after get-metadata.js.
 */

/**
 * ---------------
 * --- IMPORTS ---
 * ---------------
 */

'use strict';
// custom library imports.
const parser = require('../lib/universal-parser/universal-parser.js');


/**
 * ------------------------
 * --- GLOBAL VARIABLES ---
 * ------------------------
 */

// data paths.
const cfgPath = "../cfg/";
const metaFile = "metadata.txt";

// Firebase Admin SDK setup.
var fbAdmin = require("firebase-admin");
var serviceAccount = require("../cfg/firebaseAdminKey.json");
fbAdmin.initializeApp({
    credential: fbAdmin.credential.cert(serviceAccount),
    databaseURL: "https://ezwwa-fb-default-rtdb.europe-west1.firebasedatabase.app/"
});

/**
 * ------------------------
 * --- HELPER FUNCTIONS ---
 * ------------------------
 */

/**
 * helper function. iterates through the provided array which contains metadata
 * and posts every entry as a child of the index of the array, so we get 
 * something like: stations { 0 { dwd_id: id0, geo_lat: lat0, geo_lon: lon0,
 *                                mos_id: id0, name: name0 }, 
 *                            1 { dwd_id: id1, geo_lat: lat1, geo_lon: lon1, 
 *                                mos_id: id1, name: name1 }, 
 *                          ... }
 * 
 * @param {Array} arr array containing the data to insert into the database.
 */
const initDbFb = async (arr) => {
    try {

        // get a database reference.
        var fbDatabase = fbAdmin.database();
        let ref = fbDatabase.ref("stations");

        for (let i in arr) {

            // split each entry at "; ".
            let line = arr[i].toString().split("; ");

            // create new stations object.
            let station = ref.child(i);
            await station.set({

                // set the properties.
                dwd_id: line[0],
                mos_id: line[1],
                name: line[2],
                geo_lat: line[3],
                geo_lon: line[4]

            }, (error) => {
                if (error) {
                    console.log("Data could not be saved." + error);
                } // endif
            });
        } // endfor
        // close connection to database.
        fbDatabase.app.delete()

    } catch (err) {
        console.log(err);
    } // endtry
} //endfun

/**
 * ----------------------
 * --- MAIN FUNCTIONS ---
 * ----------------------
 */

/**
 * main function. gets data from file from local storage and inserts it into
 * the database.
 */
const main = async () => {
    try {

        // get metadata from file.
        const statMetaArray = parser.parseTxt(cfgPath + metaFile, "init", 0);

        // insert meta data into the firebase realtime database and close 
        // connection afterwards.
        statMetaArray
            .then((arr) => initDbFb(arr));

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

// ----------------
// --- RUN MAIN ---
// ----------------

main();
