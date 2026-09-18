/** Prefix marking a mission mob filter entry as a reference to a `groups`-column monster group. */
const KILL_GROUP_PREFIX = '§:';

/** Monster groups built from the `groups` CSV column: `{ [group]: killMission[] }`. Populated by `buildKillGroups`. */
const KILL_GROUPS = {};

/**
 * Baut `KILL_GROUPS` aus der `groups`-Spalte aller Kill-Missionen auf. Wird einmalig nach dem
 * Laden aller Missionen aufgerufen (aus `correctAllMissions`), bevor Gruppen-Referenzen aufgelöst werden.
 */
function buildKillGroups() {
    getMissionByType(MISSION_TYPE_KILL.id).forEach(mission => {
        if (!mission.groups) return;
        mission.groups.split(',').forEach(group => {
            if (!KILL_GROUPS[group]) KILL_GROUPS[group] = [];
            KILL_GROUPS[group].push(mission);
        });
    });
}

/**
 * Löst `§:group`-Einträge in einem Kill-Missions-Filter zu einer Kommaliste der konkreten
 * Mob-IDs dieser Gruppe auf (siehe `KILL_GROUPS`). Andere Einträge (konkrete IDs, `!exact`,
 * `*`) bleiben unverändert. Filter ohne Gruppen-Referenz werden unverändert zurückgegeben.
 * @param {string} filter - Kill-Missions-Filter
 * @returns {string}
 */
function resolveKillGroups(filter) {
    if (!filter || filter.indexOf(KILL_GROUP_PREFIX) === -1) return filter;
    return filter.split(',')
        .map(part => part.startsWith(KILL_GROUP_PREFIX)
            ? (KILL_GROUPS[part.substring(KILL_GROUP_PREFIX.length)] || []).map(member => member.item).join(',')
            : part)
        .filter(part => part.length > 0)
        .join(',');
}

/**
 * Prüft, ob ein Mob für irgendeine Kill-Mission zählt.
 * @param {string} mob - Entity-Typ-String (z.B. "minecraft:zombie")
 * @returns {boolean}
 */
function isAnyValidKill(mob) {
    const missions = getMissionByType('kill');
    const hasWildcard = missions.some(mission => mission.item === '*');
    if (hasWildcard) {
        return missions.some(mission => mission.item !== '*' && IdUtils.idMatches(mob, resolveKillGroups(mission.item)));
    }
    return missions.some(mission => IdUtils.idMatches(mob, resolveKillGroups(mission.item)));
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
    return IdUtils.idMatches(entityName, resolveKillGroups(target));
}

/**
 * Gibt eine gefilterte Liste von Kill-Missionen zurück.
 * Schließt Missionen mit Wildcard (`*`), Gruppen-Referenz (`§:`), mehreren Einträgen (`,`)
 * oder ohne Namespace (`:`) aus. Mit `filter === '*'` werden alle verbleibenden Missionen
 * zurückgegeben.
 * @param {string} filter - Item-Filter, Gruppen-Referenz oder '*' für alle
 * @returns {object[]} Gefilterte Liste von Kill-Missionen
 */
function getMoblist(filter) {
    let killMission = getMissionByType(MISSION_TYPE_KILL.id);
    let relevantKillMission = killMission.filter(mission => mission.item.indexOf('*') === -1 && mission.item.indexOf(',') === -1 && mission.item.indexOf(':') > -1 && !mission.item.startsWith(KILL_GROUP_PREFIX));
    let resolvedFilter = resolveKillGroups(filter);
    return relevantKillMission.filter(killMission => resolvedFilter === '*' || IdUtils.idMatches(killMission.item, resolvedFilter));
}
