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
        await db.connect('ezwwa-be-v10');
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
            await station.save({ force: true });

            // create new measurements objects.
            let measurements = await new db.Measurements();

            // set the properties.
            measurements.id = line[0];
            measurements.dwd_id = line[0];
            measurements.PP_10 = [];
            measurements.TT_10 = [];
            measurements.FF_10 = [];
            measurements.DD_10 = [];
            measurements.RWS_10 = [];

            // insert object into database.
            await measurements.save({ force: true });

            // create new forecasts objects.

            // today.
            let today = await new db.Today();
            // set the properties.
            // remove whitespace from mos id.
            today.id = line[1].replace(/\s/g, "");
            today.mos_id = line[1].replace(/\s/g, "");
            today.PPPP = [];
            today.TTT = [];
            today.FF = [];
            today.DD = [];
            today.RRL1c = [];
            today.R101 = [];
            // insert object into database.
            await today.save({ force: true });

            // tomorrow.
            let tomorrow = await new db.Tomorrow();
            // set the properties.
            // remove whitespace from mos id.
            tomorrow.id = line[1].replace(/\s/g, "");
            tomorrow.mos_id = line[1].replace(/\s/g, "");
            tomorrow.PPPP = [];
            tomorrow.TTT = [];
            tomorrow.FF = [];
            tomorrow.DD = [];
            tomorrow.RRL1c = [];
            tomorrow.R101 = [];
            // insert object into database.
            await tomorrow.save({ force: true });

            // the day after tomorrow.
            let dayafter = await new db.Dayafter();
            // set the properties.
            // remove whitespace from mos id.
            dayafter.id = line[1].replace(/\s/g, "");
            dayafter.mos_id = line[1].replace(/\s/g, "");
            dayafter.PPPP = [];
            dayafter.TTT = [];
            dayafter.FF = [];
            dayafter.DD = [];
            dayafter.RRL1c = [];
            dayafter.R101 = [];
            // insert object into database.
            await dayafter.save({ force: true });

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
            result.forEach(async (station) => {
                // ...and delete them.
                station.delete({ force: true });
            });
        });

        // find all measurements...
        db.Measurements.find().resultList((result) => {
            result.forEach(async (measurement) => {
                // ...and delete them.
                measurement.delete({ force: true });
            });
        });

        // find all forecasts...
        db.Forecasts.find().resultList((result) => {
            result.forEach(async (forecast) => {
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
        //await deleteDbBe();

        // get metadata from file.
        const statMetaArray = parser.parseTxt(cfgPath + metaFile, "init", 0);

        // insert stations meta data into the database.
        statMetaArray
            .then((arr) => { return initDbBe(arr) })

            // disconnect.
            .then(() => disconnectFromDbBe());

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

// ----------------
// --- RUN MAIN ---
// ----------------

main();
