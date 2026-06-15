const fs = require('fs');
const path = require('path');

const successMessagesPath = path.join(__dirname, 'utils', 'constants', 'successMessages.js');
const errorMessagesPath = path.join(__dirname, 'utils', 'constants', 'errorMessages.js');
const controllersDir = path.join(__dirname, 'controllers');

let successCode = fs.readFileSync(successMessagesPath, 'utf8');
let errorCode = fs.readFileSync(errorMessagesPath, 'utf8');

const removedConstants = [];
let totalDuplicatesEliminated = 0;

function normalizeValue(val) {
    // lowercase, remove trailing periods/spaces
    return val.toLowerCase().replace(/[\.\s]+$/, '').trim();
}

function parseAndDeduplicate(code, objectName) {
    const lines = code.split('\n');
    const regex = /^(\s*)([A-Z0-9_]+)\s*:\s*(["'])(.*?)\3(,?)\s*$/;
    
    // First pass: collect all values and their keys
    const valueToKeys = new Map();
    const valueToOriginalValue = new Map();
    for (let line of lines) {
        const match = line.match(regex);
        if (match) {
            let key = match[2];
            let value = match[4];
            let norm = normalizeValue(value);
            
            if (!valueToKeys.has(norm)) {
                valueToKeys.set(norm, []);
                valueToOriginalValue.set(norm, value); // Keep the first encountered exact value
            }
            valueToKeys.get(norm).push(key);
        }
    }
    
    const keyReplacements = new Map(); // oldKey -> canonicalKey
    
    for (let [norm, keys] of valueToKeys.entries()) {
        // Find best canonical key: no _\d+ or _ALT\d+
        let canonicalKey = keys.find(k => !/(_\d+|_ALT\d+)$/.test(k));
        
        if (!canonicalKey) {
             canonicalKey = keys[0].replace(/(_\d+|_ALT\d+)$/, '');
        }
        
        for (let key of keys) {
            keyReplacements.set(key, canonicalKey);
            if (key !== canonicalKey) {
                removedConstants.push(`${objectName}.${key}`);
                totalDuplicatesEliminated++;
            }
        }
    }
    
    // Second pass: rebuild file
    const newLines = [];
    const seenNorms = new Set();
    
    for (let line of lines) {
        const match = line.match(regex);
        if (match) {
            let space = match[1];
            let key = match[2];
            let quote = match[3];
            let value = match[4];
            let comma = match[5];
            
            let norm = normalizeValue(value);
            let canonicalKey = keyReplacements.get(key);
            
            if (!seenNorms.has(norm)) {
                seenNorms.add(norm);
                // use the original value of the first one
                let bestValue = valueToOriginalValue.get(norm);
                newLines.push(`${space}${canonicalKey}: ${quote}${bestValue}${quote}${comma}`);
            }
        } else {
            newLines.push(line);
        }
    }
    
    return {
        newCode: newLines.join('\n'),
        keyReplacements
    };
}

const successData = parseAndDeduplicate(successCode, 'SUCCESS_MESSAGES');
const errorData = parseAndDeduplicate(errorCode, 'ERROR_MESSAGES');

fs.writeFileSync(successMessagesPath, successData.newCode, 'utf8');
fs.writeFileSync(errorMessagesPath, errorData.newCode, 'utf8');

const modifiedFiles = new Set();

// Update controllers
function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Replace SUCCESS_MESSAGES
    for (const [oldKey, newKey] of successData.keyReplacements.entries()) {
        if (oldKey !== newKey) {
            const regex = new RegExp(`SUCCESS_MESSAGES\\.${oldKey}\\b`, 'g');
            content = content.replace(regex, `SUCCESS_MESSAGES.${newKey}`);
        }
    }

    // Replace ERROR_MESSAGES
    for (const [oldKey, newKey] of errorData.keyReplacements.entries()) {
        if (oldKey !== newKey) {
            const regex = new RegExp(`ERROR_MESSAGES\\.${oldKey}\\b`, 'g');
            content = content.replace(regex, `ERROR_MESSAGES.${newKey}`);
        }
    }

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedFiles.add(filePath.replace(__dirname + '/', ''));
    }
}

processDirectory(controllersDir);

console.log(JSON.stringify({
    removedConstants,
    modifiedFiles: Array.from(modifiedFiles),
    totalDuplicatesEliminated
}));
