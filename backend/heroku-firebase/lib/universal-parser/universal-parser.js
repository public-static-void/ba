/**
 * this module handles parsing different kinds of files to arrays.
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
const { DOMParser } = require('xmldom');
// promisified imports.
const pfsr = { readFile: util.promisify(fs.readFile) };

/**
 * ----------------------
 * --- MAIN FUNCTIONS ---
 * ----------------------
 */

/**
 * reads a text file (like .txt file of dwd weather station metadata or a .cfg 
 * file of mosmix forecast system network) and parses it into an array of a 
 * format like: ['value0 0: value1 0', 'value0 1: value1 1', ...].
 * 
 * @param {String}  filePath path to input file.
 * @param {String}  type supported types are: init, cfg, dwd, meta, miss, match, 
 *                  dwdid, mosid, 1minrr, 10minrr, 10minff, 10mintu.
 * @param {Number}  n number of lines to skip before parsing.
 * 
 * @returns {Array} array containing the parsed information. format is depending 
 *                  on the type of the input.
 */
exports.parseTxt = async (filePath, type, n) => {
    try {

        // initialize result array.
        let resultArray = [];
        // initialize encoding.
        let enc = "";

        // sometimes latin1 encoding is needed instead of utf-8 for 
        // proper 'umlauts' encoding.
        if (type == "init") {
            enc = 'utf-8';
        } else {
            enc = 'latin1';
        } // endif

        // read file.
        let data = await pfsr.readFile(filePath, enc);

        // split file at line breaks.
        let lineArray = data.toString().split("\n");
        for (let i in lineArray) {

            // skip first n lines.
            if (i < n)
                continue;

            // check input type.
            if (type == "cfg") {

                // start indices of fields : 0 6 12 18 23 44 51 59 65 72 eol:76
                // 12-17: station_id
                // 23-43: name
                // if station_id has 4 characters, fill up to 5 with whitespace.
                resultArray.push(lineArray[i].slice(12, 17) + ": "
                    + lineArray[i].slice(23, 43).toLowerCase().trim());

            } else if (type == "dwd") {

                // start indices of fields : 0 6 15 24 39 51 61 102 eol:200
                // 0-5    id
                // 39-50  geo breite
                // 51-60  geo laenge
                // 61-101 name
                resultArray.push(lineArray[i].slice(0, 5) + ": "
                    + lineArray[i].slice(61, 101).toLowerCase().trim());

            } else if (type == "meta") {

                // start indices of fields : 0 6 15 24 39 51 61 102 eol:200
                // 0-5    id
                // 39-50  geo breite
                // 51-60  geo laenge
                // 61-101 name
                resultArray.push(lineArray[i].slice(0, 5) + "; "
                    + lineArray[i].slice(61, 101).trim() + "; "
                    + lineArray[i].slice(39, 50).trim() + "; "
                    + lineArray[i].slice(51, 60).trim());

            } else if (type == "miss") {

                // 0-5  station_id
                // 7-12 id
                resultArray.push(lineArray[i].slice(0, 5) + ": "
                    + lineArray[i].slice(7, 12));

            } else if (type == "match") {

                // just push line for line.
                resultArray.push(lineArray[i]);

            } else if (type == "init") {

                // split lines at ", " and make an array of arrays
                let sliceArray = lineArray[i].split(", ");
                let interimArray = [];
                for (let j in sliceArray) {
                    interimArray.push(sliceArray[j]);
                } // endfor
                resultArray.push(interimArray);

            } else if (type == "dwdid") {

                // dwd_id starts at index 0 and ends at index 5
                resultArray.push(lineArray[i].slice(0, 5));

            } else if (type == "mosid") {

                // mos_id starts at index 7 and ends at index 12
                resultArray.push(lineArray[i].slice(7, 12));

            } else if (type == "1minrr") {

                // STATIONS_ID;MESS_DATUM;QN;RS_01;RS_IND_01;eor
                // 0-11  id
                // 12-24 date
                // 25-30 qn
                // 31-38 rs_01
                // 39-41 rs_ind_01
                // we only want id, date and rs_01.
                // make an array of arrays.
                let interimArray = [];
                // fill up id value with leading zeros.
                interimArray.push(("00000" + lineArray[i].slice(0, 11).trim()).slice(-5));
                interimArray.push(lineArray[i].slice(12, 24).trim());
                interimArray.push(lineArray[i].slice(31, 38).trim());
                resultArray.push(interimArray);

            } else if (type == "10minrr") {

                // STATIONS_ID;MESS_DATUM;  QN;RWS_DAU_10;RWS_10;RWS_IND_10;eor
                // 0-11  id
                // 12-24 date
                // 25-30 qn
                // 31-35 rws_dau_10
                // 39-43 rws_10
                // 44-48 rws_ind
                // we only want id, date and rws_10.
                // make an array of arrays.
                let interimArray = [];
                // fill up id value with leading zeros.
                interimArray.push(("00000" + lineArray[i].slice(0, 11).trim()).slice(-5));
                interimArray.push(lineArray[i].slice(12, 24).trim());
                interimArray.push(lineArray[i].slice(39, 43).trim());

                resultArray.push(interimArray);

            } else if (type == "10minff") {

                // STATIONS_ID;MESS_DATUM;  QN;FF_10;DD_10;eor
                // 0-11  id
                // 12-24 date
                // 25-30 qn
                // 31-37 ff_10
                // 38-42 dd_10
                // we only want id, date, ff_10 and dd_10.
                // make an array of arrays.
                let interimArray = [];
                // fill up id value with leading zeros.
                interimArray.push(("00000" + lineArray[i].slice(0, 11).trim()).slice(-5));
                interimArray.push(lineArray[i].slice(12, 24).trim());
                interimArray.push(lineArray[i].slice(31, 37).trim());
                interimArray.push(lineArray[i].slice(38, 42).trim());

                resultArray.push(interimArray);

            } else if (type == "10mintu") {

                // STATIONS_ID;MESS_DATUM;  QN;PP_10;TT_10;TM5_10;RF_10;TD_10;eor
                // 0-11  id
                // 12-24 date
                // 25-30 qn
                // 31-38 pp_10
                // 39-45 tt_10
                // 46-52 tm5_10
                // 53-59 rf_10
                // 60-66 td_10
                // we only want id, date, pp_10 and tt_10.
                // make an array of arrays.
                let interimArray = [];
                // fill up id value with leading zeros.
                interimArray.push(("00000" + lineArray[i].slice(0, 11).trim()).slice(-5));
                interimArray.push(lineArray[i].slice(12, 24).trim());
                interimArray.push(lineArray[i].slice(31, 38).trim());
                interimArray.push(lineArray[i].slice(39, 45).trim());

                resultArray.push(interimArray);

            } // endif
        } // endfor

        // remove artefact at the end of the array resulting from last line
        // of file beeing parsed as empty string.
        resultArray.pop();
        return resultArray;

    } catch (err) {
        console.log(err);
    } // endtry
} //endfun

/**
 * reads a kml file of the mosmix forecast system network and parses it into 
 * an array of arrays containing the parsed information.
 * 
 * @param {String}  filePath path to input file.
 * 
 * @returns {Array} array containing the parsed information as arrays in the 
 *                  following order: timesteps, pppp, ttt, ff, dd, rrl1c, r101.
 */
exports.parseKml = async (filePath) => {
    try {

        // initialize result and interim arrays.
        let resultArray = [];
        // timesteps
        let tsArr = [];
        // pppp
        let ppppArr = [];
        // ttt
        let tttArr = [];
        // ff
        let ffArr = [];
        // dd
        let ddArr = [];
        // rrl1c
        let rrlArr = [];
        // r101
        let rArr = [];

        // get id from filename.
        const idStartIndex = filePath.lastIndexOf("_")
        const idEndIndex = filePath.lastIndexOf(".")
        const id = filePath.substring(idStartIndex + 1, idEndIndex);

        // set encoding.
        let enc = 'utf-8';

        // read file.
        let data = await pfsr.readFile(filePath, enc);

        // create a dom parser.
        let domParser = new DOMParser();
        // pass data to parser.
        let kml = domParser.parseFromString(data, "application/xml");

        // get nodelist of all timesteps of the forecast.
        const timesteps = kml.documentElement.getElementsByTagName('dwd:TimeStep');
        // for each node with the tag of timesteps...
        for (let i = 0; i < timesteps.length; i++) {
            // ...push the value of its first child node to corresponding 
            // intermediate result array.
            tsArr.push(timesteps[i].firstChild.nodeValue);
        } // endfor

        // get nodelist of all forecasts.
        const forecasts = kml.documentElement.getElementsByTagName('dwd:Forecast');
        for (let i = 0; i < forecasts.length; i++) {

            // check forecast element name.
            if ((forecasts[i].hasAttribute("dwd:elementName"))
                // pppp
                && (forecasts[i].getAttribute("dwd:elementName") == "PPPP")) {
                // get nodelist of all values.
                let pppps = forecasts[i].getElementsByTagName("dwd:value");
                // get the string representation of the actual values.
                let ppppStr = pppps[0].childNodes[0].nodeValue;
                // split string at whitespace and remove excessive whitespace.
                ppppArr = ppppStr.replace(/\s+/g, ' ').split(" ").slice(1);

            } else if ((forecasts[i].hasAttribute("dwd:elementName"))
                // ttt
                && (forecasts[i].getAttribute("dwd:elementName") == "TTT")) {
                // get nodelist of all values.
                let ttts = forecasts[i].getElementsByTagName("dwd:value");
                // get the string representation of the actual values.
                let tttStr = ttts[0].childNodes[0].nodeValue;
                // split string at whitespace and remove excessive whitespace.
                tttArr = tttStr.replace(/\s+/g, ' ').split(" ").slice(1);

            } else if ((forecasts[i].hasAttribute("dwd:elementName"))
                // ff
                && (forecasts[i].getAttribute("dwd:elementName") == "FF")) {
                // get nodelist of all values.
                let ffs = forecasts[i].getElementsByTagName("dwd:value");
                // get the string representation of the actual values.
                let ffStr = ffs[0].childNodes[0].nodeValue;
                // split string at whitespace and remove excessive whitespace.
                ffArr = ffStr.replace(/\s+/g, ' ').split(" ").slice(1);

            } else if ((forecasts[i].hasAttribute("dwd:elementName"))
                // dd
                && (forecasts[i].getAttribute("dwd:elementName") == "DD")) {
                // get nodelist of all values.
                let dds = forecasts[i].getElementsByTagName("dwd:value");
                // get the string representation of the actual values.
                let ddStr = dds[0].childNodes[0].nodeValue;
                // split string at whitespace and remove excessive whitespace.
                ddArr = ddStr.replace(/\s+/g, ' ').split(" ").slice(1);

            } else if ((forecasts[i].hasAttribute("dwd:elementName"))
                // rrl1c
                && (forecasts[i].getAttribute("dwd:elementName") == "RRL1c")) {
                // get nodelist of all values.
                let rrls = forecasts[i].getElementsByTagName("dwd:value");
                // get the string representation of the actual values.
                let rrlStr = rrls[0].childNodes[0].nodeValue;
                // split string at whitespace and remove excessive whitespace.
                rrlArr = rrlStr.replace(/\s+/g, ' ').split(" ").slice(1);

            } else if ((forecasts[i].hasAttribute("dwd:elementName"))
                // r101
                && (forecasts[i].getAttribute("dwd:elementName") == "R101")) {
                // get nodelist of all values.
                let rs = forecasts[i].getElementsByTagName("dwd:value");
                // get the string representation of the actual values.
                let rStr = rs[0].childNodes[0].nodeValue;
                // split string at whitespace and remove excessive whitespace.
                rArr = rStr.replace(/\s+/g, ' ').split(" ").slice(1);

            } // endif
        } // endfor

        // aggregate all interim results into one result array.
        for (let i in tsArr) {
            let interimArray = [];
            interimArray.push(id);
            interimArray.push(tsArr[i]);
            interimArray.push(ppppArr[i]);
            interimArray.push(tttArr[i]);
            interimArray.push(ffArr[i]);
            interimArray.push(ddArr[i]);
            interimArray.push(rrlArr[i]);
            interimArray.push(rArr[i]);
            resultArray.push(interimArray);
        } // endfor

        return resultArray;

    } catch (err) {
        console.log(err);
    } // endtry
} //endfun