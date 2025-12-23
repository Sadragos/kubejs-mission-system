const { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } = require('fs');
const { parse } = require('path');
const seedrandom = require('seedrandom');

const args = process.argv.slice(2);
const outFile = args[0] || 'out/missions.js';

console.log('Reading Missions CSV...');
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
        if(!mission.weight) return;
        let item = {
            type: mission.type,
            item: mission.item,
            weight: parseInt(mission.weight)
        }
        if(mission.name) item.name = mission.name;
        if(mission.minAmount) item.min = parseInt(mission.minAmount);
        if(mission.maxAmount) item.max = parseInt(mission.maxAmount);
        if(mission.minCoins) item.minCoins = parseInt(mission.minCoins);
        if(mission.maxCoins) item.maxCoins = parseInt(mission.maxCoins);
        if(mission.egg) item.egg = mission.egg;
        if(mission.eggChance) item.eggChance = parseFloat(mission.eggChance);
        out.push(`addMission(${JSON.stringify(item)});`)
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

const fileContent = `${fullScript}\n\n${lineString}\n\ncorrectAllMissions();`;

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