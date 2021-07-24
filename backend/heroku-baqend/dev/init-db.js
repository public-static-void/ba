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
        await db.connect('ezwwa-be-v6');
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

            // PP_10
            let pp_10 = await new db.PP_10();
            // set the properties.
            pp_10.id = line[0];
            pp_10.readings = [];
            // insert object into database.
            await pp_10.save({ force: true });

            // TT_10
            let tt_10 = await new db.TT_10();
            // set the properties.
            tt_10.id = line[0];
            tt_10.readings = [];
            // insert object into database.
            await tt_10.save({ force: true });

            // FF_10
            let ff_10 = await new db.FF_10();
            // set the properties.
            ff_10.id = line[0];
            ff_10.readings = [];
            // insert object into database.
            await ff_10.save({ force: true });

            // DD_10
            let dd_10 = await new db.DD_10();
            // set the properties.
            dd_10.id = line[0];
            dd_10.readings = [];
            // insert object into database.
            await dd_10.save({ force: true });

            // RWS_10
            let rws_10 = await new db.RWS_10();
            // set the properties.
            rws_10.id = line[0];
            rws_10.readings = [];
            // insert object into database.
            await rws_10.save({ force: true });

            // create new forecasts objects.

            // PPPP
            let pppp = await new db.PPPP();
            // set the properties.
            // remove whitespace from mos id.
            pppp.id = line[1].replace(/\s/g, "");
            pppp.readings = [];
            // insert object into database.
            await pppp.save({ force: true });

            // TTT
            let ttt = await new db.TTT();
            // set the properties.
            // remove whitespace from mos id.
            ttt.id = line[1].replace(/\s/g, "");
            ttt.readings = [];
            // insert object into database.
            await ttt.save({ force: true });

            // FF
            let ff = await new db.FF();
            // set the properties.
            // remove whitespace from mos id.
            ff.id = line[1].replace(/\s/g, "");
            ff.readings = [];
            // insert object into database.
            await ff.save({ force: true });

            // DD
            let dd = await new db.DD();
            // set the properties.
            // remove whitespace from mos id.
            dd.id = line[1].replace(/\s/g, "");
            dd.readings = [];
            // insert object into database.
            await dd.save({ force: true });

            // RRL1c
            let rrl1c = await new db.RRL1c();
            // set the properties.
            // remove whitespace from mos id.
            rrl1c.id = line[1].replace(/\s/g, "");
            rrl1c.readings = [];
            // insert object into database.
            await rrl1c.save({ force: true });

            // R101
            let r101 = await new db.R101();
            // set the properties.
            // remove whitespace from mos id.
            r101.id = line[1].replace(/\s/g, "");
            r101.readings = [];
            // insert object into database.
            await r101.save({ force: true });

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
        // PP_10
        db.PP_10.find().resultList((result) => {
            result.forEach(async (measurement) => {
                // ...and delete them.
                measurement.delete({ force: true });
            });
        });

        // TT_10
        db.TT_10.find().resultList((result) => {
            result.forEach(async (measurement) => {
                // ...and delete them.
                measurement.delete({ force: true });
            });
        });
        // FF_10
        db.FF_10.find().resultList((result) => {
            result.forEach(async (measurement) => {
                // ...and delete them.
                measurement.delete({ force: true });
            });
        });
        // DD_10
        db.DD_10.find().resultList((result) => {
            result.forEach(async (measurement) => {
                // ...and delete them.
                measurement.delete({ force: true });
            });
        });
        // RWS_10
        db.RWS_10.find().resultList((result) => {
            result.forEach(async (measurement) => {
                // ...and delete them.
                measurement.delete({ force: true });
            });
        });

        // find all forecasts...
        // PPPP
        db.PPPP.find().resultList((result) => {
            result.forEach(async (forecast) => {
                // ...and delete them.
                forecast.delete({ force: true });
            });
        });
        // TTT
        db.TTT.find().resultList((result) => {
            result.forEach(async (forecast) => {
                // ...and delete them.
                forecast.delete({ force: true });
            });
        });
        // FF
        db.FF.find().resultList((result) => {
            result.forEach(async (forecast) => {
                // ...and delete them.
                forecast.delete({ force: true });
            });
        });
        // DD
        db.DD.find().resultList((result) => {
            result.forEach(async (forecast) => {
                // ...and delete them.
                forecast.delete({ force: true });
            });
        });
        // RRL1c
        db.RRL1c.find().resultList((result) => {
            result.forEach(async (forecast) => {
                // ...and delete them.
                forecast.delete({ force: true });
            });
        });
        // R101
        db.R101.find().resultList((result) => {
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
