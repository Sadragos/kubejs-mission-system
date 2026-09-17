const { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync, existsSync } = require('fs');
const path = require('path');
const seedrandom = require('seedrandom');

const args = process.argv.slice(2);
const outRoot = args[0] || 'out';
const kubejsOut = path.join(outRoot, 'kubejs');

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
        if(mission.minProgress) item.minProgress = parseFloat(mission.minProgress);
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

const fileContent = `// priority: 200\n${fullScript}\n\n${lineString}\n\ncorrectAllMissions();`;

console.log(`Cleaning ${outRoot}...`);
rmSync(outRoot, { recursive: true, force: true });

console.log('Copying assets, startup_scripts and server_scripts...');
if (existsSync('kubejs/server_scripts')) cpSync('kubejs/server_scripts', path.join(kubejsOut, 'server_scripts'), { recursive: true });
if (existsSync('kubejs/assets')) cpSync('kubejs/assets', path.join(kubejsOut, 'assets'), { recursive: true });
if (existsSync('kubejs/startup_scripts')) cpSync('kubejs/startup_scripts', path.join(kubejsOut, 'startup_scripts'), { recursive: true });

const missionsOutFile = path.join(kubejsOut, 'server_scripts', 'missions.js');
console.log(`Writing Quests and ${relevantMissionCount} Missions to ${missionsOutFile}`);
mkdirSync(path.join(kubejsOut, 'server_scripts'), { recursive: true });
writeFileSync(missionsOutFile, fileContent);


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