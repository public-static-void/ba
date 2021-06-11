/**
 * firebase version.
 * 
 * this is the main frontend javascript of the project. it handles the 
 * communication with the database, processing the data and injecting it into 
 * the index.html.
 */

// TODO: choose whether to use 1 or 10 min rr. (atm 10min in use)

/**
* ---------------
* --- IMPORTS ---
* ---------------
*/

'use strict';

// firebase setup.
const firebaseConfig = {
    apiKey: "AIzaSyD4j789xl5-r_Sol4FAzhJTftn4XXhB9e8",
    authDomain: "ezwwa-fb.firebaseapp.com",
    databaseURL: "https://ezwwa-fb-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "ezwwa-fb",
    storageBucket: "ezwwa-fb.appspot.com",
    messagingSenderId: "759033600041",
    appId: "1:759033600041:web:ee0c590148587e12312438",
    measurementId: "G-4ME19B1DF0"
};
firebase.initializeApp(firebaseConfig);
firebase.analytics();

/**
 * ------------------------
 * --- GLOBAL VARIABLES ---
 * ------------------------
 */

// firebase database.
const fbDatabase = firebase.database();

// colors (for charts)
const redColor = 'rgba(255, 40, 40, 0.8)';
const blueColor = 'rgba(30, 100, 255, 0.5)';
const lightRedColor = 'rgba(255, 100, 130, 0.4)';
const lightBlueColor = 'rgba(50, 140, 190, 0.2)';

// charts canvas contexts.
const r101Context = document.getElementById("r-101").getContext('2d');
const rsContext = document.getElementById("rs-01").getContext('2d');
const ffContext = document.getElementById("ff-10").getContext('2d');
const ddContext = document.getElementById("dd-10").getContext('2d');
const ppContext = document.getElementById("pp-10").getContext('2d');
const ttContext = document.getElementById("tt-10").getContext('2d');

// declare chart options.
let r101ChartConfig;
let rsChartConfig;
let ffChartConfig;
let ddChartConfig;
let ppChartConfig;
let ttChartConfig;

// declare charts.
let r101Chart;
let rsChart;
let ffChart;
let ddChart;
let ppChart;
let ttChart;

// dataset labels.
//const rsLabel = "Niederschlagshöhe der letzten 1 Minute in mm";
const rsLabel = "Niederschlagshöhe der letzten 10 Minuten in mm";
const r101Label = "Niederschlagswahrscheinlichkeit in %";
const ffLabel = "10min-Mittel der Windgeschwindigkeit";
const ddLabel = "10min-Mittel der Windrichtung";
const ppLabel = "Luftdruck";
const ttLabel = "Lufttemperatur";

//const mosR101Label = "Niederschlagshöhe der letzten 1 Minute in mm";
const mosR101Label = "Niederschlagshöhe der letzten 10 Minuten in mm";
const mosRrl1cLabel = "Niederschlagswahrscheinlichkeit in %";
const mosFfLabel = "10min-Mittel der Windgeschwindigkeit";
const mosDdLabel = "10min-Mittel der Windrichtung";
const mosPpppLabel = "Luftdruck";
const mosTttLabel = "Lufttemperatur";

const dwdLabel = "Messwerte"
const mosLabel = "Vorhersagen"

const timeLabels = [];

// current state of selected time and stations.
let currentTimeIntervals = [];

let currentDwdId = "";
let currentMosId = "";

// constants.
const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * ------------------------
 * --- HELPER FUNCTIONS ---
 * ------------------------
 */

/**
 * helper function. converts precipitation forecast value format to 
 * measurement format. the conversion formula is as follows:
 * RS_01 -> RRL1c:
 *	-> mm/1min in kg/m2 / 1h
 *	-> 1kg/m2 ~ 1l/m2 ~ 1mm
 *	-> mm/1min in mm/h
 *	=> RS_01 ~ RRL1c / 60
 * 
 * @param {Number}   rrl1c value to convert.
 * 
 * @returns {Number} the rrl1c value converted to rs01.
 */
const rrl1cToRs = (rrl1c) => {
    try {

        // rs01.
        return rrl1c / 60;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. converts precipitation forecast value format to 
 * measurement format. the conversion formula is as follows:
 * RWS_10 -> RRL1c:
 *	-> mm/1min in kg/m2 / 1h
 *	-> 1kg/m2 ~ 1l/m2 ~ 1mm
 *	-> mm/1min in mm/h
 *	=> RWS_10 ~ RRL1c / 6
 * 
 * @param {Number}   rrl1c value to convert.
 * 
 * @returns {Number} the rrl1c value converted to rws10.
 */
const rrl1cToRws = (rrl1c) => {
    try {

        // rws10.
        return rrl1c / 6;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. converts pressure forecast value format to 
 * measurement format. the conversion formula is as follows:
 * PP_10 in PPPP
 * 	-> Pa in hPa
 *	-> 100Pa = 1hPa
 *	=> Pa ~ hPa / 100
 * 
 * @param {Number}   pppp value to convert.
 * 
 * @returns {Number} the pppp value converted to pp.
 */
const ppppToPp = (pppp) => {
    try {

        // pp.
        return pppp / 100;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. converts temperature forecast value format to 
 * measurement format. the conversion formula is as follows:
 * TT_10 in TTT
 * 	-> °C in K
 * 	-> t [°C] = T [K] - 273,15 
 * 	-> T [K] = t [°C] + 273,15 
 * 	=> °C ~ K - 273,15
 * 
 * @param {Number}   ttt value to convert.
 * 
 * @returns {Number} the ttt value converted to tt.
 */
const tttToTt = (ttt) => {
    try {

        // tt.
        return ttt - 273.15;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. tracks a single set of values on remote database for 
 * addition, changes and removal.
 * 
 * @param {Object} ref  database reference to track values at.
 * @param {String} type the type of the values to track
 */
const trackValues = async (ref, type) => {
    try {

        // get the start and end time interval limits from global variables.
        const startTime = "" + currentTimeIntervals[0];
        const endTime = "" + currentTimeIntervals[1];

        // check for type of values to track and perform appropriate steps.
        if (type == "mosRrl1c") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // TODO: if 1minrr use rrl1cToRs(), if 10minrr use rrl1cToRws().
            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(rsChart, mosLabel, { x: time, y: rrl1cToRws(data.val().value).toFixed(4) });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(rsChart, mosLabel, { x: time, y: rrl1cToRws(data.val().value).toFixed(4) });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(rsChart, mosLabel, { x: time, y: rrl1cToRws(data.val().value).toFixed(4) });
            });

        } else if (type == "mosR101") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.            
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(r101Chart, mosLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(r101Chart, mosLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(r101Chart, mosLabel, { x: time, y: data.val().value });
            });

        } else if (type == "mosFf") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(ffChart, mosLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(ffChart, mosLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(ffChart, mosLabel, { x: time, y: data.val().value });
            });

        } else if (type == "mosDd") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(ddChart, mosLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(ddChart, mosLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(ddChart, mosLabel, { x: time, y: data.val().value });
            });

        } else if (type == "mosPppp") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(ppChart, mosLabel, { x: time, y: ppppToPp(data.val().value).toFixed(1) });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(ppChart, mosLabel, { x: time, y: ppppToPp(data.val().value).toFixed(1) });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(ppChart, mosLabel, { x: time, y: ppppToPp(data.val().value).toFixed(1) });
            });

        } else if (type == "mosTtt") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(ttChart, mosLabel, { x: time, y: tttToTt(data.val().value).toFixed(1) });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(ttChart, mosLabel, { x: time, y: tttToTt(data.val().value).toFixed(1) });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(ttChart, mosLabel, { x: time, y: tttToTt(data.val().value).toFixed(1) });
            });


        } else if (type == "dwdRs") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(rsChart, dwdLabel, { x: time, y: data.val().value });
                // track the time of the last measurement.
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(rsChart, dwdLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(rsChart, dwdLabel, { x: time, y: data.val().value });
            });

            // TODO: decide whether to use 1 or 10 min rr.
        } else if (type == "dwdRws") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(rsChart, dwdLabel, { x: time, y: data.val().value });
                // track the time of the last measurement.
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(rsChart, dwdLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(rsChart, dwdLabel, { x: time, y: data.val().value });
            });

        } else if (type == "dwdFf") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(ffChart, dwdLabel, { x: time, y: data.val().value });
                // track the time of the last measurement.
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(ffChart, dwdLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(ffChart, dwdLabel, { x: time, y: data.val().value });
            });

        } else if (type == "dwdDd") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(ddChart, dwdLabel, { x: time, y: data.val().value });
                // track the time of the last measurement.
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(ddChart, dwdLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(ddChart, dwdLabel, { x: time, y: data.val().value });
            });

        } else if (type == "dwdPp") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(ppChart, dwdLabel, { x: time, y: data.val().value });
                // track the time of the last measurement.
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(ppChart, dwdLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(ppChart, dwdLabel, { x: time, y: data.val().value });
            });

        } else if (type == "dwdTt") {

            // reset possible listeners.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).off();

            // register new listeners for changes.
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_added', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartAddData(ttChart, dwdLabel, { x: time, y: data.val().value });
                // track the time of the last measurement.
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_changed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartUpdateData(ttChart, dwdLabel, { x: time, y: data.val().value });
            });
            ref.orderByChild("date").startAt(startTime).endAt(endTime).on('child_removed', async (data) => {
                // convert timestamp to date object.
                const time = new Date(parseInt(data.val().date));
                chartRemoveData(ttChart, dwdLabel, { x: time, y: data.val().value });
            });

        } // endif

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. adds data to a chart and repaints it.
 * 
 * @param {Object} chart  the chart object to add data to.
 * @param {String} label  the label of the dataset to add data to.
 * @param {String} entry  the data entry to add.
 */
const chartAddData = async (chart, label, entry) => {
    try {

        // initialize chart arrays that hold data.
        const dataArr = chart.data.datasets;

        // iterate through the array holding datasets.
        for (let i in dataArr) {
            // add y value to data array.
            chart.data.datasets.forEach((dataset) => {
                // only add data to dataset that matches the provided label.
                if (dataset.label == label) {
                    // avoid duplicates.
                    if (!dataset.data.includes(entry)) {
                        dataset.data.push(entry);
                    } // endif
                } // endif
            });
        } // endfor
        // repaint chart.
        chart.update();

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. updates a data entry in a chart and repaints it.
 * 
 * @param {Object} chart the chart object to update data in.
 * @param {String} label the label of the dataset to update.
 * @param {String} entry the entry to update in the dataset.
 */
const chartUpdateData = async (chart, label, entry) => {
    try {

        // initialize chart arrays that hold data.
        const dataArr = chart.data.datasets;

        // iterate through the array holding datasets.
        for (let i in dataArr) {
            // check whether if the label property matches the provided label.
            if (dataArr[i].label == label) {

                // iterate through the dataset that matches the provided label.
                for (let j in dataArr[i].data) {
                    // find data entries corresponding to provided x value.

                    // objects need to be stringified in order to be comparable.
                    if (JSON.stringify(dataArr[i].data[j].x) == JSON.stringify(entry.x)) {

                        // update the y value in the data array.
                        dataArr[i].data[j].y = entry.y;
                    } // endif
                } // endfor
            } // endif
        } // endfor
        // repaint chart.
        chart.update();

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. removes data from a chart and repaints it.
 * 
 * @param {Object} chart  the chart object to remove data from.
 * @param {String} label  the label of the dataset to remove data from.
 * @param {String} entry  the entry to remove from the dataset.
 */
const chartRemoveData = async (chart, label, entry) => {
    try {

        // initialize chart arrays that hold data.
        const dataArr = chart.data.datasets;

        // iterate through the array holding datasets.
        for (let i in dataArr) {
            // check whether if the label property matches the provided label.
            if (dataArr[i].label == label) {
                // iterate through the dataset that matches the provided label.
                for (let j in dataArr[i].data) {
                    // find data entries corresponding to provided x and y values.

                    // objects need to be stringified in order to be comparable.
                    if (JSON.stringify(dataArr[i].data[j].x) == JSON.stringify(entry.x) && dataArr[i].data[j].y == entry.y) {
                        // remove those values from the respective arrays.
                        dataArr[i].data.splice(j, 1);
                    } // endif
                } // endfor
            } // endif
        } // endfor
        // repaint chart.
        chart.update();

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. creates an configuration object for charts.
 *
 * @param {String} chartType   type of the chart, e.g. line or bar.
 * @param {String} chartLabel1 label for the first dataset of the chart.
 * @param {String} chartLabel2 label for the second dataset of the chart.
 * @param {Array}  dataArr1    array containing the data for the first 
 *                             dataset of the chart (y axis).
 * @param {Array}  dataArr2    array containing the data for the second 
 *                             dataset of the chart (y axis).
 * @param {Array}  xLabels1    array of labels for the x axis (time) of the 
 *                             first dataset.
 * @param {Array}  xLabels2    array of labels for the x axis (time) of the 
 *                             second dataset.
 * @param {String} bgColor1    color of for the first dataset the chart.
 * @param {String} bdColor1    color of for the first dataset the chart 
 *                             borders.
 * @param {String} bgColor2    color of for the second dataset the chart.
 * @param {String} bdColor2    color of for the second dataset the chart 
 *                             borders.
 * @param {String} minTick     minimum value to show on y axis.
 * @param {String} maxTick     maximum value to show on y axis.
 * @param {String} stepSize    interval of values between steps on y axis.
 * 
 * @returns {Object} chart configuration object.
 */
const createChartConfig = (chartType, chartLabel1, chartLabel2, dataArr1, dataArr2, xLabels1, xLabels2, bgColor1, bdColor1, bgColor2, bdColor2, minTick, maxTick, stepSize) => {
    try {

        // crate configuration object.
        const chartConfig = {
            type: chartType,
            data: {
                labels: xLabels1, xLabels2,
                datasets: [{
                    label: chartLabel1,
                    data: dataArr1,
                    fill: false,
                    backgroundColor: bgColor1,
                    borderColor: bdColor1,
                    borderWidth: 1,
                    pointRadius: 2.5,
                    pointHoverRadius: 4,
                    showLine: true,
                    borderWidth: 2,
                    lineTention: 3,
                    barThickness: 5,
                },
                {
                    label: chartLabel2,
                    data: dataArr2,
                    fill: false,
                    backgroundColor: bgColor2,
                    borderColor: bdColor2,
                    borderWidth: 1,
                    pointRadius: 2.5,
                    pointHoverRadius: 4,
                    showLine: true,
                    borderWidth: 2,
                    lineTention: 3,
                    barThickness: 5,
                }]
            },
            options: {
                responsive: true,

                scales: {
                    xAxes: [{
                        position: "bottom",
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Zeit'
                        },
                        type: 'time',
                        distribution: 'linear',
                        time: {
                            parser: 'MM/DD/YYYY HH:mm',
                            tooltipFormat: 'll HH:mm',
                            unit: 'hour',
                            displayFormats: {
                                'hour': 'HH:mm'
                            },
                        },
                        gridLines: {
                            display: true
                        },
                        display: true,
                        bounds: 'data',
                        ticks: {
                            source: 'auto',
                            beginAtZero: true
                        }

                    }],
                    yAxes: [{
                        position: "left",
                        display: true,
                        scaleLabel: {
                            display: true,
                            labelString: 'Werte'
                        },
                        ticks: {
                            min: minTick,
                            max: maxTick,
                            stepSize: stepSize,
                            source: 'data',
                            beginAtZero: false
                        }
                    }]
                },
                tooltips: {
                    bodyFontSize: 18,
                    position: "nearest"
                }
            },
        }
        // return the object created above.
        return chartConfig;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. resets charts by wrapping the chartRemoveAllData function.
 */
const resetCharts = () => {
    try {

        chartRemoveAllData(r101Chart);
        chartRemoveAllData(rsChart);
        chartRemoveAllData(ttChart);
        chartRemoveAllData(ppChart);
        chartRemoveAllData(ffChart);
        chartRemoveAllData(ddChart);

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. removes all data from a chart.
 * 
 * @param {Object} chart chart objectto remove data from. 
 */
const chartRemoveAllData = (chart) => {
    try {

        // remove dataset.
        chart.data.datasets.forEach((dataset) => {
            dataset.data = [];
        });
        // repaint chart.
        chart.update();

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. adds a station entry to the dropdown menu. does so by 
 * wrapping populateMenu function.
 * 
 * @param {Object} stationObj the station data object to add to the menu.
 */
const addStation = (stationObj) => {
    try {

        populateMenu("station-dropdown", stationObj)

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun

/**
 * helper function. computes the time interval limits of a specified day.
 * 
 * @param {String}  day the time requested, e.g. today, tomorrow or 
 *                              dayaftertomorrow.
 * 
 * @returns {Array} array containing starting and ending interval of a day.
 */
const getTimeLimits = (day) => {
    try {

        // time of the start of a day.
        const beginningOfToday = new Date();
        beginningOfToday.setHours(0);
        beginningOfToday.setMinutes(0);
        // begin early to make sure first measurement at 00:00 gets tracked.
        beginningOfToday.setSeconds(-1);

        // time of the end of a day.
        const endOfToday = new Date();
        endOfToday.setHours(24);
        endOfToday.setMinutes(0);
        endOfToday.setSeconds(0);

        let resultTime = [];

        if (day == "today") {
            resultTime.push(beginningOfToday.getTime(), endOfToday.getTime());
        } else if (day == "tomorrow") {
            resultTime.push(beginningOfToday.getTime() + DAY_IN_MS, endOfToday.getTime() + DAY_IN_MS);
        } else if (day == "dayaftertomorrow") {
            resultTime.push(beginningOfToday.getTime() + 2 * DAY_IN_MS, endOfToday.getTime() + 2 * DAY_IN_MS);
        }// endif

        return resultTime;

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun

/**
 * helper function. sets the global variables for time.
 * 
 * @param {String} day e.g. "today", "tomorrow" or "dayaftertomorrow".
 */
const setTimeIntervals = (day) => {
    try {

        currentTimeIntervals = getTimeLimits(day);

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun

/**
 * helper function. sets the global variables for station ids.
 * 
 * @param {String} dwdId dwd id as a string.
 * @param {String} mosId mos id as a string.
 */
const setCurrentIds = (dwdId, mosId) => {
    try {

        currentDwdId = dwdId;
        currentMosId = mosId;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. populates the time select menu with options.
 */
const populateTimeMenu = () => {
    try {

        // construct date objects for desired days.
        let today = new Date();
        let tomorrow = new Date();
        tomorrow = new Date(tomorrow.getTime() + DAY_IN_MS);
        let dayaftertomorrow = new Date();
        dayaftertomorrow = new Date(dayaftertomorrow.getTime() + 2 * DAY_IN_MS);

        // populate time menu with the dates constructed above.
        populateMenu("time-dropdown", today);
        populateMenu("time-dropdown", tomorrow);
        populateMenu("time-dropdown", dayaftertomorrow);

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun

/**
 * helper function. adds options specified in input array to a select menu.
 * 
 * @param {String} menuId id of the select menu to add options to.
 * @param {Object} obj    array containing options to add to select menu.
 */
const populateMenu = async (menuId, obj) => {
    try {

        // get the menu element from html dom.
        const menuElement = document.getElementById(menuId);
        // add option to select menu by creating an anchor element.
        const option = document.createElement('a');

        // append a function for each entry depending on the menu.
        if (menuId == "station-dropdown") {

            // display the station name as menu entry.
            option.text = obj.name;
            // construct function call and create onclick event.
            option.setAttribute("onclick", "toggleActiveStation(this); setCurrentIds('" + obj.dwd_id + "', '" + obj.mos_id + "'); resetCharts(); trackMeasurements(); trackForecasts(); setStationPlaceholder('" + obj.dwd_id + "');");

        } else if (menuId == "time-dropdown") {

            // construct some dates.
            let today = new Date();
            let tomorrow = new Date();
            tomorrow = new Date(tomorrow.getTime() + DAY_IN_MS);
            let dayaftertomorrow = new Date();
            dayaftertomorrow = new Date(dayaftertomorrow.getTime() + 2 * DAY_IN_MS);

            // check for date equality.
            if (obj.getDate() == today.getDate() &&
                obj.getMonth() == today.getMonth() &&
                obj.getFullYear() == today.getFullYear()) {
                // create a text description.
                option.text = obj.getDate() + "." + ("0" + (obj.getMonth() + 1)).slice(-2) + "." + obj.getFullYear() + " (Heute)";
                // construct function call and create onclick event.
                option.setAttribute("onclick", "toggleActiveTime(this); setTimeIntervals('today'); resetCharts(); trackMeasurements(); trackForecasts(); setTimePlaceholder('Heute');");

            } else if (obj.getDate() == tomorrow.getDate() &&
                obj.getMonth() == tomorrow.getMonth() &&
                obj.getFullYear() == tomorrow.getFullYear()) {
                // create a text description.
                option.text = obj.getDate() + "." + ("0" + (obj.getMonth() + 1)).slice(-2) + "." + obj.getFullYear() + " (Morgen)";
                // construct function call and create onclick event.
                option.setAttribute("onclick", "toggleActiveTime(this); setTimeIntervals('tomorrow'); resetCharts(); trackMeasurements(); trackForecasts(); setTimePlaceholder('Morgen');");

            } else if (obj.getDate() == dayaftertomorrow.getDate() &&
                obj.getMonth() == dayaftertomorrow.getMonth() &&
                obj.getFullYear() == dayaftertomorrow.getFullYear()) {
                // create a text description.
                option.text = obj.getDate() + "." + ("0" + (obj.getMonth() + 1)).slice(-2) + "." + obj.getFullYear() + " (Übermorgen)";
                // construct function call and create onclick event.
                option.setAttribute("onclick", "toggleActiveTime(this); setTimeIntervals('dayaftertomorrow'); resetCharts(); trackMeasurements(); trackForecasts(); setTimePlaceholder('Übermorgen');");

            } // endif

        } // endif
        // append the anchor as child to the menu.
        menuElement.appendChild(option)

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * search engine for text input field of dropdown menu.
 */
const filterMenu = (menu, dropdown) => {
    try {

        // get elements from html dom.
        const div = document.getElementById(dropdown);
        const a = div.getElementsByTagName("a");
        const input = document.getElementById(menu);
        // make search case insensitive.
        const filter = input.value.toUpperCase();
        // for each option in the menu...
        for (let i = 0; i < a.length; i++) {
            const txtValue = a[i].textContent || a[i].innerText;
            // check wether it contains the input. make search case
            // insensitive.
            if (txtValue.toUpperCase().indexOf(filter) > -1) {

                // if it does, keep option in dropdown (by not altering its
                // display property)
                a[i].style.display = "";

            } else {

                // if not, remove option from dropdown by hiding it.
                a[i].style.display = "none";

            } // endif
        } // endfor

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. finds the index of the smallest element in an array.
 * 
 * @param {Array}    arr array to search the index of the samllest element in.
 * @returns {Number} index of the smallest element.
 */
const indexOfSmallest = (arr) => {
    try {

        // extend the array prototype and invoke underlying Math.min method.
        return arr.indexOf(Math.min.apply(Math, arr));

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. calculates the distance in kilometers for two points on a
 * sphere represented by their given longitudes and latitudes using the 
 * haversine formula.
 * 
 * @param {Number}   lat1 latitude of point 1.
 * @param {Number}   lon1 latitude of point 1.
 * @param {Number}   lat2 longitude of point 2.
 * @param {Number}   lon2 longitude of point 2.
 * 
 * @returns {Number} distance of those two points in kilometers.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    try {

        // radius of the earth in km.
        const R = 6371;
        // convert degrees to radiants.
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        // apply the haversine formula.
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        // angle C of the haversine formula.
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        // distance in kilometers.
        const distance = R * c;

        return distance;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. converts degrees to radiants.
 * 
 * @param {Number}   deg degrees.
 * @returns {Number} radiants.
 */
const deg2rad = (deg) => {
    try {

        const rad = deg * (Math.PI / 180);

        return rad;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. sets the station select input field to a certain value.
 * 
 * @param {String} dwdId the id of the station to show the name of in the 
 *                       input field.
 */
const setStationPlaceholder = (dwdId) => {
    try {

        // initialize variable to store station name in.
        let stationName = "";

        // construct database path and get a reference to it.
        const statRef = fbDatabase.ref("/stations/");

        // query und alpabetically sort on name property.
        statRef.orderByChild("dwd_id").equalTo(dwdId).on('child_added', async (data) => {
            // assign station name.
            stationName = data.val().name;
        });

        // get reference to input element on html dom.
        const statMenu = document.getElementById("station-search-menu");

        // set the entry in the input field to station name.
        statMenu.value = stationName;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. finds closest station to the geolocation of the browser.
 * 
 * @param {Object}   position html5 position object.
 */
const geoQuery = (position) => {
    try {

        // initialize result array.
        let resultArr = [];

        // initialize variables for coordinates.
        const localLat = position.coords.latitude;
        const localLon = position.coords.longitude;
        let remoteLat = 0;
        let remoteLon = 0;

        // get database reference.
        const statRef = fbDatabase.ref("/stations/");

        // query stations and get station objects. query once since stations
        // are rather unlikely to change during query.
        statRef.once('value', (data) => {
            // store the station objects into an array.
            let statArr = data.val();

            // for each station object in the array...
            for (let i in statArr) {

                // get the coordinates.
                remoteLat = data.val()[i].geo_lat;
                remoteLon = data.val()[i].geo_lon;
                // compute distance to local coordinates and put them into an array.
                resultArr.push(calculateDistance(localLat, localLon, remoteLat, remoteLon));

            } // endfor

            // find closest station by determining the shortest distance and use 
            // its object from the array to set the global station id variables.
            const resultIndex = indexOfSmallest(resultArr);
            const dwdId = statArr[resultIndex].dwd_id;
            const mosId = statArr[resultIndex].mos_id;
            setCurrentIds(dwdId, mosId);

            // set placeholder text field to name of closest station.
            setStationPlaceholder(dwdId);

            // draw charts.
            trackMeasurements();
            trackForecasts();
        });

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. sets the time select input field to a certain value.
 * 
 * @param {String} time the value to show in the input field.
 */
const setTimePlaceholder = (time) => {
    try {

        // get reference to input element on html dom.
        const timeMenu = document.getElementById("time-search-menu");

        // set the entry in the input field to certain time.
        timeMenu.value = time;

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. toggles CSS active class of station menu dropdown DOM element.
 * 
 * @param {Object} entry DOM element of the station menu dropdown entry.
 */
const toggleActiveStation = (entry) => {
    try {

        // get references to elements on html dom.
        const menu = document.getElementById("station-dropdown");
        const entries = menu.children;

        // remove possible previously assigned active classes.
        for (let i = 0; i < entries.length; i++) {
            entries[i].classList.remove("active");
        } // endfor

        entry.classList.add("active");

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * helper function. toggles CSS active class of time menu dropdown DOM element.
 * 
 * @param {Object} entry DOM element of the time menu dropdown entry.
 */
const toggleActiveTime = (entry) => {
    try {

        // get references to elements on html dom.
        const menu = document.getElementById("time-dropdown");
        const entries = menu.children;

        // remove possible previously assigned active classes.
        for (let i = 0; i < entries.length; i++) {
            entries[i].classList.remove("active");
        } // endfor

        entry.classList.add("active");

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * ----------------------
 * --- MAIN FUNCTIONS ---
 * ----------------------
 */

// create chart configurations.
r101ChartConfig = createChartConfig("scatter", dwdLabel, mosLabel, [], [], timeLabels, timeLabels, blueColor, blueColor, lightBlueColor, lightBlueColor);
rsChartConfig = createChartConfig("bar", dwdLabel, mosLabel, [], [], timeLabels, timeLabels, blueColor, blueColor, lightBlueColor, lightBlueColor, 0);
ffChartConfig = createChartConfig("scatter", dwdLabel, mosLabel, [], [], timeLabels, timeLabels, redColor, redColor, lightRedColor, lightRedColor);
ddChartConfig = createChartConfig("scatter", dwdLabel, mosLabel, [], [], timeLabels, timeLabels, redColor, redColor, lightRedColor, lightRedColor, 0, 360, 60);
ppChartConfig = createChartConfig("scatter", dwdLabel, mosLabel, [], [], timeLabels, timeLabels, redColor, redColor, lightRedColor, lightRedColor);
ttChartConfig = createChartConfig("scatter", dwdLabel, mosLabel, [], [], timeLabels, timeLabels, redColor, redColor, lightRedColor, lightRedColor);

// create charts.
r101Chart = new Chart(r101Context, r101ChartConfig);
rsChart = new Chart(rsContext, rsChartConfig);
ffChart = new Chart(ffContext, ffChartConfig);
ddChart = new Chart(ddContext, ddChartConfig);
ppChart = new Chart(ppContext, ppChartConfig);
ttChart = new Chart(ttContext, ttChartConfig);

/**
 * continuesly tracks stations changes in the database.
 */
const trackStations = async () => {
    try {

        // construct database path and get a reference to it.
        const statRef = await fbDatabase.ref("/stations/");

        // query und alpabetically sort on name property.
        statRef.orderByChild("name").on('child_added', async (data) => {
            addStation(data.val());
        });
        statRef.orderByChild("name").on('child_removed', async (data) => {
            removeStation(data.key);
        });

    } catch (err) {
        console.log(err)
    } // endtry
} // endfun

/**
 * continuesly tracks changes of measurement data in the database and triggers 
 * further helper functions to process the new data in case of updates.
 */
const trackMeasurements = async () => {
    try {

        // construct database paths and get a references.
        // TODO: decide whether to use 1minrr or 10minrr.
        //const dwdRsRef = await firebase.database().ref("measurements/" + currentDwdId + "/rs/");
        const dwdRsRef = await firebase.database().ref("measurements/" + currentDwdId + "/rws/");
        const dwdFfRef = await firebase.database().ref("measurements/" + currentDwdId + "/ff/");
        const dwdDdRef = await firebase.database().ref("measurements/" + currentDwdId + "/dd/");
        const dwdPpRef = await firebase.database().ref("measurements/" + currentDwdId + "/pp/");
        const dwdTtRef = await firebase.database().ref("measurements/" + currentDwdId + "/tt/");

        // TODO: decide whether to use 1minrr or 10minrr.
        // rs (precipitation 1 min)
        //trackValues(dwdRsRef, "dwdRs");

        // rws (precipitation 10 min)
        trackValues(dwdRsRef, "dwdRws");

        // ff (wind force)
        trackValues(dwdFfRef, "dwdFf");

        // dd (wind dicection)
        trackValues(dwdDdRef, "dwdDd");

        // pp (pressure)
        trackValues(dwdPpRef, "dwdPp");

        // tt (temperature)
        trackValues(dwdTtRef, "dwdTt");

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * continuesly tracks changes of forecasts data in the database and triggers
 * further helper functions to process the new data in case of updates.
 */
const trackForecasts = async () => {
    try {

        // construct database paths and get a references.
        const mosRrl1cRef = await firebase.database().ref("/forecasts/" + currentMosId.replace(/\s/g, "") + "/rrl1c");
        const mosFfRef = await firebase.database().ref("/forecasts/" + currentMosId.replace(/\s/g, "") + "/ff");
        const mosDdRef = await firebase.database().ref("/forecasts/" + currentMosId.replace(/\s/g, "") + "/dd");
        const mosPpppRef = await firebase.database().ref("/forecasts/" + currentMosId.replace(/\s/g, "") + "/pppp");
        const mosTttRef = await firebase.database().ref("/forecasts/" + currentMosId.replace(/\s/g, "") + "/ttt");
        const mosR101Ref = await firebase.database().ref("/forecasts/" + currentMosId.replace(/\s/g, "") + "/r101");

        // rrl1c (precipitation 10 min)
        trackValues(mosRrl1cRef, "mosRrl1c");

        // r101 (precipitation chance)
        trackValues(mosR101Ref, "mosR101");

        // ff (wind force)
        trackValues(mosFfRef, "mosFf");

        // dd (wind dicection)
        trackValues(mosDdRef, "mosDd");

        // pppp (pressure)
        trackValues(mosPpppRef, "mosPppp");

        // ttt (temperature)
        trackValues(mosTttRef, "mosTtt");

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * gets the geolocation of the user and sets the station ids accordingly.
 */
const getGeoLocation = () => {
    try {

        // check browser for html5 geolocation support.
        if (navigator.geolocation) {

            // find geoposition of browser with html5.
            navigator.geolocation.getCurrentPosition(
                // calls the geoQuery function with the position found.
                (position) => { geoQuery(position) }
            );

        } else {

            // else, inform user that it doesnt work.
            alert("Geolocation is not supported by this browser.");

        } // endif

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * toggles visibility of the stations dropdown menu once the corresponding 
 * button is pressed.
 */
const toggleStationMenu = () => {
    try {

        // hide the other dropdown in case it is visible to avoid overlap.
        document.getElementById("time-dropdown").classList.remove("show-dropdown");
        // toggle visibility of dropdown menu.
        document.getElementById("station-dropdown").classList.toggle("show-dropdown");

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * toggles visibility of the time dropdown menu once the corresponding 
 * button is pressed.
 */
const toggleTimeMenu = () => {
    try {

        // hide the other dropdown in case it is visible to avoid overlap.
        document.getElementById("station-dropdown").classList.remove("show-dropdown");
        // toggle visibility of dropdown menu.
        document.getElementById("time-dropdown").classList.toggle("show-dropdown");

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * wrapper for the stations menu's text input field search engine.
 */
const filterStationMenu = () => {
    try {

        filterMenu("station-search-menu", "station-dropdown");

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * wrapper for the time menu's text input field search engine.
 */
const filterTimeMenu = () => {
    try {

        filterMenu("time-search-menu", "time-dropdown");

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

/**
 * main function. initializes menus and charts and tracks updates.
 */
const main = () => {
    try {

        // find geo location and determine closest station.
        getGeoLocation();

        // set time for today.
        setTimeIntervals("today");

        // populate time select menu.
        populateTimeMenu();

        // track stations.
        trackStations();

    } catch (err) {
        console.log(err);
    } // endtry
} // endfun

// ----------------
// --- RUN MAIN ---
// ----------------

window.onload = main();
