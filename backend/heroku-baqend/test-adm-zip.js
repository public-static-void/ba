/**
 * adm-zip functionality verification.
 * Verifies that adm-zip API (constructor, extractAllTo, getEntries)
 * works correctly with the upgraded version.
 */
'use strict';

const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');
const os = require('os');

let exitCode = 0;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adm-zip-test-'));

function assert(condition, message) {
    if (!condition) {
        console.error('FAIL: ' + message);
        exitCode = 1;
    } else {
        console.log('PASS: ' + message);
    }
}

try {
    // Create a test zip in memory
    const zip = new AdmZip();

    // Test 1: Add file entry
    zip.addFile('test/hello.txt', Buffer.from('Hello World', 'utf8'));
    zip.addFile('test/nested/file.txt', Buffer.from('Nested content', 'utf8'));
    assert(true, 'addFile works');

    // Test 2: getEntries returns entries
    const entries = zip.getEntries();
    assert(entries.length === 2, 'getEntries returns 2 entries, got: ' + entries.length);

    // Test 3: Entry properties
    const entry0 = entries[0];
    const entry1 = entries[1];
    assert(entry0.entryName === 'test/hello.txt' || entry0.entryName === 'test/nested/file.txt',
        'entryName is valid: ' + entry0.entryName);
    assert(typeof entry0.header === 'object', 'entry.header exists');
    assert(typeof entry0.header.size !== 'undefined', 'entry.header.size exists');

    // Test 4: Read entry data
    const helloEntry = zip.getEntry('test/hello.txt');
    assert(helloEntry !== null, 'getEntry finds test/hello.txt');
    if (helloEntry) {
        const data = helloEntry.getData().toString('utf8');
        assert(data === 'Hello World', 'extracted content matches, got: ' + data);
    }

    // Test 5: extractAllTo extracts files
    const extractPath = path.join(tmpDir, 'extracted');
    zip.extractAllTo(extractPath, true);
    assert(fs.existsSync(path.join(extractPath, 'test/hello.txt')),
        'extractAllTo creates test/hello.txt');
    assert(fs.existsSync(path.join(extractPath, 'test/nested/file.txt')),
        'extractAllTo creates test/nested/file.txt');
    const extractedContent = fs.readFileSync(path.join(extractPath, 'test/hello.txt'), 'utf8');
    assert(extractedContent === 'Hello World',
        'extracted file content matches, got: ' + extractedContent);

    // Test 6: Read existing zip file
    const zipPath = path.join(tmpDir, 'test.zip');
    zip.writeZip(zipPath);
    assert(fs.existsSync(zipPath), 'writeZip creates a zip file');

    const readZip = new AdmZip(zipPath);
    const readEntries = readZip.getEntries();
    assert(readEntries.length === 2, 'read zip has 2 entries, got: ' + readEntries.length);

    // Test 7: Constructor with buffer
    const zipBuffer = fs.readFileSync(zipPath);
    const bufferZip = new AdmZip(zipBuffer);
    assert(bufferZip.getEntries().length === 2, 'buffer constructor works');

    // Test 8: extractAllTo with overwrite
    zip.extractAllTo(extractPath, true);
    assert(true, 'extractAllTo with overwrite=true does not throw');

    console.log('\n=== adm-zip Verification Test Complete ===');

} catch (e) {
    console.error('UNEXPECTED ERROR: ' + e.message);
    console.error(e.stack);
    exitCode = 1;
} finally {
    // Clean up temp directory
    try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
        // ignore cleanup errors
    }
}

process.exit(exitCode);
