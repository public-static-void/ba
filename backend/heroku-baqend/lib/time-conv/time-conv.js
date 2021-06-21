'use strict';

/**
 * converts an input time format into an output time format.
 * 
 * examples of time formats supported:
 * dwd: 202101090330
 * mos: 2021-01-09T22:00:00.000Z
 * ftp: Jan 09 23:10
 * js:  1610233278236
 * 
 * examples of Date object use:
 * new Date(datestring)
 * new Date(year, month, date, hours, minutes, seconds, ms)
 * 
 * @param {String}   time       the input to convert.
 * @param {String}   inputType  dwd, mos, ftp or js.
 * @param {String}   outputType dwd, mos, ftp or js.
 * 
 * @returns {String} date in desired format.
 */
exports.convertTime = (time, inputType, outputType) => {
    try {

        // declare variables to assign results to.
        let interimDate = null;
        let outputDate = "";

        // check input type.
        if (inputType == "dwd") {

            // dwd-datestring doesnt get recognized by Data object,
            // further steps required!
            // transform from format: YYYYMMDDhhmm
            // example:               202101090330
            // into format:           YYYY-MM-DD hh:mm
            // example:               2021-01-09 03:30
            // slice string at: 0-4,4-6,6-8,8-10,10-12
            const reformattedDWDString = time.substring(0, 4) + "-" +
                time.substring(4, 6) + "-" +
                time.substring(6, 8) + " " +
                time.substring(8, 10) + ":" +
                time.substring(10, 12);

            interimDate = new Date(reformattedDWDString);

        } else if (inputType == "mos") {

            // mos-datestring gets recognized by Data object,
            // no further steps needed.
            interimDate = new Date(time);

        } else if (inputType == "ftp") {

            // ftp-datestring doesnt get recognized by Data object,
            // further steps required!
            // Jan 09 23:10
            // no year provided, so assume current year..
            const thisYear = new Date().getUTCFullYear();

            // MMM 0-3
            // DD  4-6
            // hh  7-9
            // mm 10-12
            const reformattedFTPString = thisYear + "-" +
                monthToNumHelper(time.substring(0, 3)) + "-" +
                time.substring(4, 6) + " " +
                time.substring(7, 9) + ":" +
                time.substring(10, 12);

            //console.log(reformattedFTPString);
            interimDate = new Date(reformattedFTPString);

        } else if (inputType == "js") {

            // js-date in milliseconds gets recognized by Data object,
            // just need to transform to int.
            interimDate = new Date(parseInt(time));

        } // endif

        // check output type
        if (outputType == "dwd") {

            // transform to format: YYYYMMDDhhmm
            // example:             202101090330
            // getMonth() yields months from 0 to 11 thus +1
            // '0' + ... .slice(-2) to get leading zeros if needed.
            outputDate = "" + interimDate.getUTCFullYear()
                + ('0' + interimDate.getUTCMonth() + 1).slice(-2)
                + ('0' + interimDate.getUTCDate()).slice(-2)
                + ('0' + interimDate.getUTCHours()).slice(-2)
                + ('0' + interimDate.getUTCMinutes()).slice(-2);

        } else if (outputType == "mos") {

            // transform to formart: YYYY-MM-DDThh:mm:ss.milZ
            // example:              2021-01-09T22:00:00.000Z
            // no transformation needed, 
            // as interimDate is already in this format
            // but we need it as a string, and toString() yields 
            // a different format. thus toISOString().    
            outputDate = interimDate.toISOString();

        } else if (outputType == "ftp") {

            // transform to format: Mon DD hh:mm
            // example:             Jan 09 23:10
            outputDate = ""
                + numToMonthHelper(('0' + interimDate.getUTCMonth() + 1).slice(-2)) + " "
                + ('0' + interimDate.getUTCDate()).slice(-2) + " "
                + ('0' + interimDate.getUTCHours()).slice(-2) + ":"
                + ('0' + interimDate.getUTCMinutes()).slice(-2);

        } else if (outputType == "js") {

            // transform to format: UNIX milliseconds
            // example:             1610233278236
            // getTime() gives us UNIX milliseconds,
            // and toString(), well, a string.
            outputDate = interimDate.getTime().toString();

        } // endif

        return outputDate;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. transforms month name to number.
 * 
 * @param   {String} month month name string from ftp time format 
 *                         e.g. Jan, Feb, Mar, Apr, May, ...
 * @returns {String} month number as string (01,02,03,04,05, ...)
 */
const monthToNumHelper = (month) => {
    try {

        let output = "";
        switch (month) {
            case "Jan": {
                output = "01";
                break;
            }
            case "Feb": {
                output = "02";
                break;
            }
            case "Mar": {
                output = "03";
                break;
            }
            case "Apr": {
                output = "04";
                break;
            }
            case "May": {
                output = "05";
                break;
            }
            case "Jun": {
                output = "06";
                break;
            }
            case "Jul": {
                output = "07";
                break;
            }
            case "Aug": {
                output = "08";
                break;
            }
            case "Sep": {
                output = "09";
                break;
            }
            case "Oct": {
                output = "10";
                break;
            }
            case "Nov": {
                output = "11";
                break;
            }
            case "Dec": {
                output = "12";
                break;
            }
        } //endswitch

        return output;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. transforms month number to bname.
 * 
 * @param   {String} month number as string (01,02,03,04,05, ...)
 * @returns {String} month name string from ftp time format 
 *                         e.g. Jan, Feb, Mar, Apr, May, ...
 */
const numToMonthHelper = (num) => {
    try {

        let output = "";
        switch (num) {
            case "01": {
                output = "Jan";
                break;
            }
            case "02": {
                output = "Feb";
                break;
            }
            case "03": {
                output = "Mar";
                break;
            }
            case "04": {
                output = "Apr";
                break;
            }
            case "05": {
                output = "May";
                break;
            }
            case "06": {
                output = "Jun";
                break;
            }
            case "07": {
                output = "Jul";
                break;
            }
            case "08": {
                output = "Aug";
                break;
            }
            case "09": {
                output = "Sep";
                break;
            }
            case "10": {
                output = "Oct";
                break;
            }
            case "11": {
                output = "Nov";
                break;
            }
            case "12": {
                output = "Dec";
                break;
            }
        } //endswitch

        return output;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun