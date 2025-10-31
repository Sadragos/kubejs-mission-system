const { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } = require('fs');
const { parse } = require('path');
const seedrandom = require('seedrandom');

// Config
const defaults = {
    minAmount: 64,
    minCoins: 8,
    weight: 25
}


const args = process.argv.slice(2);
const outFile = args[0] || 'out/missions.js';

console.log('Rading Missions CSV...');
const allCsvFiles = readdirSync('missions').filter(f => f.endsWith('.csv'));
console.log(`Found ${allCsvFiles.length} CSV Files`);

const out = [];

allCsvFiles.forEach(file => {
    console.log(`Parsing ${file}...`);
    const missions = parseCSV(`missions/${file}`);
    console.log(`Found ${missions.length} Missions`);
    out.push('');
    out.push(`// ${file}`);
    missions.forEach(mission => {
        const item = {
            type: mission.type,
            item: mission.item,
            name: mission.name || nameFromItem(mission.item),
            min: parseInt(mission.minAmount) || defaults.minAmount,
            max: parseInt(mission.maxAmount) || ((parseInt(mission.minAmount) || defaults.minAmount) * 2),
            minCoins: parseInt(mission.minCoins) || defaults.minCoins,
            maxCoins: parseInt(mission.maxCoins) || ((parseInt(mission.minCoins) || defaults.minCoins) * 2),
            weight: parseInt(mission.weight) || defaults.weight,
        }
        if(item.weight === 0) return;
        out.push(`ALL_MISSIONS.push(${JSON.stringify(item)});`)
    });
});

console.log('Combining Files...');
const quests = readFileSync('kubejs/quests.js').toString();
const relevantMissionCount = out.filter(line => !line.startsWith('//') && line.trim().length > 0).length;
const lineString = out.join('\n');

const fileContent = `${quests}\n\n${lineString}`;

console.log(`Writing Quests and ${relevantMissionCount} Missions to ${outFile}`);
if (outFile === 'out/missions.js') {
    mkdirSync('out', { recursive: true });
    
} 
writeFileSync(outFile, fileContent);


function parseCSV(file, missionIdKey) {
    const data = readFileSync(file).toString();
    const lines = data.split('\n');

    const headers = lines[0].split(";");
    const result = [];

    for (let l = 1; l < lines.length; l++) {
        const obj = {};
        const columns = lines[l].split(";");
        if (columns.length !== headers.length) continue;
        columns.forEach((c, i) => {
            obj[headers[i]] = c;
        });
        obj['missionId'] = `mission_${l}`;
        result.push(obj);
    }
    return result;
}

function nameFromItem(item) {
    const base = item.indexOf(':') === -1 ? item : item.split(':')[1];
    return base.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}