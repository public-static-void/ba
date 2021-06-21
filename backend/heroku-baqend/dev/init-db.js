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

// baqend setup.
const { db } = require('baqend');

/**
 * ------------------------
 * --- HELPER FUNCTIONS ---
 * ------------------------
 */

/**
 * helper function. connects to the baqend realtime database.
 */
const connectToDbBe = async () => {
    try {

        // get a database reference.
        await db.connect('ezwwa-be');
        await db.ready();

        // login with a user who has admin permissions.
        await db.User.login("admin", "admin");

    } catch (err) {
        console.log(err);
    } // endtry
} //endfun

/**
 * helper function. disconnects from the baqend realtime database.
 */
const disconnectFromDbBe = async () => {
    try {

        // log out user.
        await db.User.logout();

    } catch (err) {
        console.log(err);
    } // endtry
} //endfun

/**
 * helper function. iterates through the provided array which contains stations
 * metadata, creates instances of entity classes and initializes them with data
 * from the array.
 * 
 * baqend version.
 * 
 * @param {Array} arr array containing the data to insert into the database.
 */
const initDbBe = async (arr) => {
    try {

        for (let i in arr) {

            // split each entry at "; ".
            let line = arr[i].toString().split("; ");

            // create new station object.
            let station = await new db.Station();

            // set the properties.
            station.id = i;
            station.dwd_id = line[0];
            station.mos_id = line[1];
            station.name = line[2];
            let lat = parseFloat(line[3]);
            let lon = parseFloat(line[4]);
            station.location = await new db.GeoPoint(lat, lon);

            // insert object into database.
            //station.insert();
            station.save({ force: true });

            // create new measurements object.
            let measurements = await new db.Measurements();
            // set the properties.
            measurements.id = i;
            measurements.dwd_id = line[0];
            measurements.PP_10 = [];
            measurements.TT_10 = [];
            measurements.DD_10 = [];
            measurements.FF_10 = [];
            measurements.RWS_10 = [];

            // insert object into database.
            //measurements.insert();
            measurements.save({ force: true });

            // create new forecasts object.
            let forecasts = await new db.Forecasts();
            // set the properties.
            forecasts.id = i;
            // remove whitespace from mos id.
            forecasts.mos_id = line[1].replace(/\s/g, "");
            forecasts.PPPP = [];
            forecasts.TTT = [];
            forecasts.DD = [];
            forecasts.FF = [];
            forecasts.RRL1c = [];
            forecasts.R101 = [];

            // insert object into database.
            //forecasts.insert();
            forecasts.save({ force: true });

        } // endfor

    } catch (err) {
        console.log(err);
    } // endtry
} //endfun

/**
 * helper function. whipes the database.
 */
const deleteDbBe = async () => {
    try {

        // find all stations...
        db.Station.find().resultList((result) => {
            result.forEach((station) => {
                // ...and delete them.
                station.delete({ force: true });
            });
        });

        // find all measurements...
        db.Measurements.find().resultList((result) => {
            result.forEach((measurement) => {
                // ...and delete them.
                measurement.delete({ force: true });
            });
        });

        // find all forecasts...
        db.Forecasts.find().resultList((result) => {
            result.forEach((forecast) => {
                // ...and delete them.
                forecast.delete({ force: true });
            });
        });

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

        // establish a connection.
        await connectToDbBe();

        // whipe database in case it has already existed.
        await deleteDbBe();

        // get metadata from file.
        const statMetaArray = parser.parseTxt(cfgPath + metaFile, "init", 0);

        // insert stations meta data into the database.
        statMetaArray
            .then((arr) => initDbBe(arr));

        // disconnect.
        await disconnectFromDbBe();

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

// ----------------
// --- RUN MAIN ---
// ----------------

main();
