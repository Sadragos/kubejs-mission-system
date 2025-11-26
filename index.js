const { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } = require('fs');
const { parse } = require('path');
const seedrandom = require('seedrandom');

// Config
const defaults = {
    minAmount: 64,
    minCoins: 8,
    eggChance: 0
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
            weight: parseInt(mission.weight),
        }
        if(item.type === 'kill') {
            if(mission.egg) {
                item.egg = mission.egg;
            } else if(!mission.egg && mission.eggChance > 0) {
                item.egg = `${mission.item}_spawn_egg`;
            }
            item.eggChance = parseInt(mission.eggChance) || defaults.eggChance;
        }
        if(!item.weight) return;
        out.push(`ALL_MISSIONS.push(${JSON.stringify(item)});`)
    });
});

console.log('Combining Files...');
let fullScript = '';

const scripts = readdirSync('kubejs').filter(f => f.endsWith('.js')).sort();
scripts.forEach(script => {
    fullScript += '\n\n\n//---------------------\n';
    fullScript += `// ${script.replace(/^\d+_/,'').substring(0, script.length - 3)}`;
    fullScript += '\n//---------------------\n';
    fullScript += readFileSync(`kubejs/${script}`).toString();
});


const relevantMissionCount = out.filter(line => !line.startsWith('//') && line.trim().length > 0).length;
const lineString = out.join('\n');

const fileContent = `${fullScript}\n\n${lineString}`;

console.log(`Writing Quests and ${relevantMissionCount} Missions to ${outFile}`);
mkdirSync('out', { recursive: true });
writeFileSync(outFile, fileContent);
writeFileSync('out/missions.js', fileContent);


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