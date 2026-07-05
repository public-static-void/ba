/**
 * Smoke test script for backend/heroku-baqend.
 * Verifies all core modules load without errors.
 */

'use strict';

const assert = require('assert');

let exitCode = 0;
const results = [];

function check(label, fn) {
    try {
        fn();
        results.push({ label, status: 'PASS' });
    } catch (err) {
        results.push({ label, status: 'FAIL', error: err.message });
        exitCode = 1;
    }
}

// Core library modules
check('adm-zip loads', () => { require('adm-zip'); });
check('@xmldom/xmldom loads', () => { require('@xmldom/xmldom'); });
check('underscore loads', () => { require('underscore'); });

// Custom lib modules
check('universal-parser loads', () => { require('./lib/universal-parser/universal-parser.js'); });
check('time-conv loads', () => { require('./lib/time-conv/time-conv.js'); });
check('basic-ftp-down loads', () => { require('./lib/basic-ftp-wrapper/basic-ftp-down.js'); });
check('basic-ftp-last-mod loads', () => { require('./lib/basic-ftp-wrapper/basic-ftp-last-mod.js'); });
check('measurements data-objects loads', () => { require('./lib/data-objects/measurements.js'); });
check('forecasts data-objects loads', () => { require('./lib/data-objects/forecasts.js'); });

console.log('\n=== Smoke Test Results ===\n');
for (const r of results) {
    const icon = r.status === 'PASS' ? '✓' : '✗';
    console.log(`  ${icon} ${r.status}: ${r.label}`);
    if (r.error) console.log(`       ${r.error}`);
}
console.log(`\n${results.filter(r => r.status === 'PASS').length}/${results.length} tests passed`);
process.exit(exitCode);
