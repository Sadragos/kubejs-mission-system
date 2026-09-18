const { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, readdirSync, existsSync } = require('fs');
const path = require('path');
const seedrandom = require('seedrandom');

const args = process.argv.slice(2);
const outRoot = args[0] || 'out';
const manifestFile = path.join(outRoot, '.build-manifest.json');

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
        if(mission.groups) item.groups = mission.groups;
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

// Safety: never delete a whole directory. Only ever touch files this script itself writes,
// tracked in a manifest, so a stray build never wipes out unrelated kubejs content (e.g. if
// outRoot is pointed directly at a live Minecraft instance's kubejs folder).
const managedFiles = new Set();

function copyManagedDir(srcDir, destSubdir) {
    if (!existsSync(srcDir)) return;
    (function walk(dir, relBase) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const srcPath = path.join(dir, entry.name);
            const relPath = path.join(relBase, entry.name);
            if (entry.isDirectory()) {
                walk(srcPath, relPath);
            } else {
                const destRelPath = path.join('kubejs', destSubdir, relPath);
                const destPath = path.join(outRoot, destRelPath);
                mkdirSync(path.dirname(destPath), { recursive: true });
                copyFileSync(srcPath, destPath);
                managedFiles.add(destRelPath);
            }
        }
    })(srcDir, '');
}

console.log('Copying assets, startup_scripts and server_scripts...');
copyManagedDir('kubejs/server_scripts', 'server_scripts');
copyManagedDir('kubejs/assets', 'assets');
copyManagedDir('kubejs/startup_scripts', 'startup_scripts');

const missionsRelPath = path.join('kubejs', 'server_scripts', 'missions.js');
const missionsOutFile = path.join(outRoot, missionsRelPath);
console.log(`Writing Quests and ${relevantMissionCount} Missions to ${missionsOutFile}`);
mkdirSync(path.dirname(missionsOutFile), { recursive: true });
writeFileSync(missionsOutFile, fileContent);
managedFiles.add(missionsRelPath);

// Remove only files that a previous run of this script wrote but that are no longer managed
// (e.g. a texture removed from kubejs/assets/) - never anything outside this manifest.
let previouslyManaged = [];
if (existsSync(manifestFile)) {
    try {
        previouslyManaged = JSON.parse(readFileSync(manifestFile, 'utf8'));
    } catch (e) {
        console.warn('Could not read previous build manifest, skipping stale-file cleanup.');
    }
}
for (const relPath of previouslyManaged) {
    if (!managedFiles.has(relPath)) {
        const staleFile = path.join(outRoot, relPath);
        if (existsSync(staleFile)) {
            rmSync(staleFile, { force: true });
            console.log(`Removed stale managed file: ${relPath}`);
        }
    }
}

mkdirSync(outRoot, { recursive: true });
writeFileSync(manifestFile, JSON.stringify([...managedFiles].sort(), null, 2));


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