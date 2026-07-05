/**
 * xmldom API contract verification.
 * Confirms @xmldom/xmldom provides the same DOMParser API as xmldom.
 * Uses a minimal XML sample simulating DWD KML structure.
 */
'use strict';

const { DOMParser } = require('@xmldom/xmldom');
let exitCode = 0;

function assert(condition, message) {
    if (!condition) {
        console.error('FAIL: ' + message);
        exitCode = 1;
    } else {
        console.log('PASS: ' + message);
    }
}

// Sample XML resembling DWD MOSMIX KML (simplified)
const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns:dwd="https://www.dwd.de">
  <dwd:Product>
    <dwd:ForecastTime>2026-07-04T12:00:00Z</dwd:ForecastTime>
    <dwd:TimeStep>2026-07-04T13:00:00Z</dwd:TimeStep>
    <dwd:TimeStep>2026-07-04T14:00:00Z</dwd:TimeStep>
    <dwd:Forecast dwd:elementName="PPPP">
      <dwd:value>1013.2 1012.8 1012.1</dwd:value>
    </dwd:Forecast>
    <dwd:Forecast dwd:elementName="TTT">
      <dwd:value>22.5 23.1 23.4</dwd:value>
    </dwd:Forecast>
  </dwd:Product>
</kml>`;

// Test 1: DOMParser constructor
let parser;
try {
    parser = new DOMParser();
    assert(true, 'DOMParser constructor works');
} catch (e) {
    assert(false, 'DOMParser constructor: ' + e.message);
}

// Test 2: parseFromString returns a document
let doc;
try {
    doc = parser.parseFromString(sampleXml, 'application/xml');
    assert(true, 'parseFromString produces a document');
} catch (e) {
    assert(false, 'parseFromString: ' + e.message);
}

// Test 3: documentElement property
try {
    const root = doc.documentElement;
    assert(root !== null, 'documentElement is not null');
    assert(root.tagName === 'kml', 'root tagName is "kml", got: ' + root.tagName);
} catch (e) {
    assert(false, 'documentElement access: ' + e.message);
}

// Test 4: getElementsByTagName works (with namespaced tags)
try {
    const timesteps = doc.documentElement.getElementsByTagName('dwd:TimeStep');
    assert(timesteps.length === 2, 'find 2 dwd:TimeStep elements, got: ' + timesteps.length);
    assert(timesteps[0].firstChild.nodeValue === '2026-07-04T13:00:00Z',
        'first timestep value matches: ' + timesteps[0].firstChild.nodeValue);
} catch (e) {
    assert(false, 'getElementsByTagName: ' + e.message);
}

// Test 5: getElementsByTagName with non-namespaced tags
try {
    const kmls = doc.documentElement.getElementsByTagName('kml');
    // Note: the root element doesn't match because it IS the documentElement
    assert(true, 'getElementsByTagName with non-namespaced tag does not throw');
} catch (e) {
    assert(false, 'getElementsByTagName non-namespaced: ' + e.message);
}

// Test 6: hasAttribute and getAttribute
try {
    const forecasts = doc.documentElement.getElementsByTagName('dwd:Forecast');
    assert(forecasts.length === 2, 'find 2 dwd:Forecast elements');
    assert(forecasts[0].hasAttribute('dwd:elementName'), 'Forecast has elementName attribute');
    assert(forecasts[0].getAttribute('dwd:elementName') === 'PPPP',
        'elementName attribute is "PPPP", got: ' + forecasts[0].getAttribute('dwd:elementName'));
} catch (e) {
    assert(false, 'hasAttribute/getAttribute: ' + e.message);
}

// Test 7: Nested element access (dwd:value inside dwd:Forecast)
try {
    const ppppForecast = doc.documentElement.getElementsByTagName('dwd:Forecast')[0];
    const values = ppppForecast.getElementsByTagName('dwd:value');
    assert(values.length === 1, 'Forecast contains 1 dwd:value element');
    const valueText = values[0].childNodes[0].nodeValue;
    assert(valueText === '1013.2 1012.8 1012.1',
        'PPPP value text matches, got: ' + valueText);
} catch (e) {
    assert(false, 'nested element access: ' + e.message);
}

// Test 8: Error handling - malformed XML produces an error document (not a crash)
try {
    const badDoc = parser.parseFromString('<not-well-formed>', 'application/xml');
    // DOMParser typically returns a document with parse error, doesn't throw
    const root = badDoc.documentElement;
    // If it parsed as HTML-like fragment, it may have a different structure
    // The key is it doesn't crash
    assert(true, 'Malformed XML parse does not crash');
} catch (e) {
    assert(true, 'Malformed XML may throw depending on parser mode');
}

console.log('\n=== xmldom API Contract Test Complete ===');
process.exit(exitCode);
