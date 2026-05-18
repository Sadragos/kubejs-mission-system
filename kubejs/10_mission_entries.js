/** Globale Liste aller registrierten Missionen. */
const ALL_MISSIONS = [];

/** Missions nach Typ gecacht: { [type]: Mission[] } */
const MISSIONS_BY_TYPE = {};

/**
 * Registriert eine Mission in der globalen Liste und im Typ-Cache.
 * Fehlende Felder werden durch `correctMissionInit` mit Fallback-Werten befüllt.
 * @param {object} mission - Missions-Objekt
 */
function addMission(mission) {
    const m = correctMissionInit(mission);
    ALL_MISSIONS.push(m);
    if (!MISSIONS_BY_TYPE[m.type]) MISSIONS_BY_TYPE[m.type] = [];
    MISSIONS_BY_TYPE[m.type].push(m);
}

/**
 * Befüllt fehlende Felder einer Mission mit Fallback-Werten.
 * Bei Kill-Missionen wird außerdem ein Spawn-Egg-Identifier abgeleitet,
 * sofern `eggChance` nicht explizit auf -1 gesetzt ist.
 * @param {object} mission - Missions-Objekt (wird in-place verändert)
 * @returns {object} Die vervollständigte Mission
 */
function correctMissionInit(mission) {
    if (!mission.minCoins) mission.minCoins = FALLBACK_MIN_COINS;
    if (!mission.maxCoins) mission.maxCoins = FALLBACK_MAX_COINS;
    if (!mission.min) mission.min = FALLBACK_MIN_AMOUNT;
    if (!mission.max) mission.max = FALLBACK_MAX_AMOUNT;
    if (!mission.name) mission.name = IdUtils.idToString(mission.item);

    if (mission.type === MISSION_TYPE_KILL.id && mission.eggChance != -1) {
        if (!mission.eggChance) mission.eggChance = FALLBACK_EGG_CHANCE;
        if (!mission.egg) {
            if (mission.item.indexOf(',') === -1 && mission.item.indexOf('*') === -1 && mission.item.indexOf(':') > -1) {
                mission.egg = `${mission.item.replace('!', '')}_spawn_egg`;
            }
        }
    }

    return mission;
}

/**
 * Ergänzt nachträglich fehlende Spawn-Eggs bei Wildcard-Kill-Missionen.
 * Für Missionen ohne konkretes Egg wird anhand des Item-Filters nach passenden
 * spezifischen Kill-Missionen gesucht und deren Eggs zusammengeführt.
 */
function correctAllMissions() {
    let killMission = getMissionByType(MISSION_TYPE_KILL.id);
    let relevantKillMission = killMission.filter(mission => mission.eggChance > 0 && mission.egg && mission.item.indexOf('*') === -1 && mission.item.indexOf(',') === -1 && mission.item.indexOf(':') > -1);
    let missionToCorrect = killMission.filter(mission => mission.eggChance > 0 && !mission.egg);
    missionToCorrect.forEach(mission => {

        let relevantTargets = relevantKillMission.filter(killMission => mission.item === '*' || IdUtils.idMatches(killMission.item.replace('!', ''), mission.item));
        if (relevantTargets.length > 0) {
            mission.egg = relevantTargets.map(killMission => killMission.egg).join(',');
        }
    });
}
