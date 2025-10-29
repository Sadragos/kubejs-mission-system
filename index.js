const { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } = require('fs');
const { parse } = require('path');
const seedrandom = require('seedrandom');

// Config
const defaults = {
    minAmount: 64,
    minCoins: 8,
    weight: 100
}
const outFileMarker = '// ------------------ ALL MISSIONS ------------------';



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
            name: mission.name,
            min: parseInt(mission.minAmount) || defaults.minAmount,
            max: parseInt(mission.maxAmount) || parseInt(mission.minAmount) || defaults.minAmount,
            minCoins: parseInt(mission.minCoins) || defaults.minCoins,
            maxCoins: parseInt(mission.maxCoins) || parseInt(mission.minCoins) || defaults.minCoins,
            weight: parseInt(mission.weight) || defaults.weight,
        }
        out.push(`ALL_MISSIONS.push(${JSON.stringify(item)});`)
    });
});


if (outFile === 'out/missions.js') {
    console.log(`Writing ${out.filter(line => !line.startsWith('//') && line.trim().length > 0).length} Missions to ${outFile}`);
    mkdirSync('out', { recursive: true });
    writeFileSync('out/missions.js', out.join('\n'));
} else {
    console.log(`Reading ${outFile} and looking for marker...`);
    const finds = readFileSync(outFile).toString().split(outFileMarker);
    writeFileSync(outFile, `${finds[0]}${outFileMarker}\n\n${out.join('\n')}\n`);
}   



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