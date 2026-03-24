/**
 * Prüft, ob ein Mob für irgendeine Kill-Mission zählt.
 * @param {string} mob - Entity-Typ-String (z.B. "minecraft:zombie")
 * @returns {boolean}
 */
function isAnyValidKill(mob) {
    return getMissionByType('kill').some(mission => validateItem(mob, mission.item))
}

/**
 * Prüft, ob ein Mob-Kill für ein bestimmtes Ziel gültig ist.
 * Bei `target === undefined` oder `target === '*'` wird gegen alle Kill-Missionen geprüft.
 * @param {Entity} mob - Getötetes Entity
 * @param {string|undefined} target - Ziel-Entity-Typ oder '*' für beliebige Kill-Mission
 * @returns {boolean}
 */
function isValidKill(mob, target) {
    const entityName = mob.type.toString().toLowerCase();
    if (target === undefined || target === '*') return isAnyValidKill(entityName);
    return validateItem(entityName, target);
}

/**
 * Gibt eine gefilterte Liste von Kill-Missionen zurück.
 * Schließt Missionen mit Wildcard (`*`), mehreren Einträgen (`,`) oder ohne Namespace (`:`) aus.
 * Mit `filter === '*'` werden alle verbleibenden Missionen zurückgegeben.
 * @param {string} filter - Item-Filter oder '*' für alle
 * @returns {object[]} Gefilterte Liste von Kill-Missionen
 */
function getMoblist(filter) {
    let killMission = getMissionByType(MISSION_TYPE_KILL.id);
    let relevantKillMission = killMission.filter(mission => mission.item.indexOf('*') === -1 && mission.item.indexOf(',') === -1 && mission.item.indexOf(':') > -1);
    return relevantKillMission.filter(killMission => filter === '*' || validateItem(killMission.item.replace('!', ''), filter));
}
