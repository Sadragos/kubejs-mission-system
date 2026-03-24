/**
 * Spielt einen Sound an der Position eines Spielers für alle Spieler ab.
 * @param {ServerEvent} event
 * @param {string} playername - Name des Zielspielers (Abspielposition)
 * @param {string} sound - Sound-Identifier (z.B. "minecraft:entity.player.levelup")
 */
function playSoundAtPlayer(event, playername, sound) {
    event.server.runCommandSilent(`execute at ${playername} run playsound ${sound} player @a ~ ~ ~ 1 1`);
}

/**
 * Erhöht den Missions-Zähler eines Spielers für einen bestimmten Typ.
 * @param {Player} player - Spieler, dessen Zähler erhöht wird
 * @param {string} type - Missionstyp (z.B. "item", "kill")
 * @param {number} [amount=1] - Anzahl der hinzuzufügenden Missionen
 */
function increaseMissionDoneCount(player, type, amount) {
    amount = amount || 1;
    const pData = player.persistentData;
    pData.putInt(`mission_done_${type}`, getMissionDoneCount(player, type) + amount);
}

/**
 * Gibt die Anzahl abgeschlossener Missionen eines Spielers für einen bestimmten Typ zurück.
 * @param {Player} player - Spieler, dessen Zähler ausgelesen wird
 * @param {string} type - Missionstyp (z.B. "item", "kill")
 * @returns {number} Anzahl abgeschlossener Missionen, mindestens 0
 */
function getMissionDoneCount(player, type) {
    const pData = player.persistentData;
    if(!pData.getInt(`mission_done_${type}`)) return 0;
    return pData.getInt(`mission_done_${type}`);
}

/**
 * Berechnet den Fortschritt eines Spielers in einer Missionskategorie als Wert zwischen 0 und 1.
 * @param {Player} player - Spieler, dessen Fortschritt berechnet wird
 * @param {string} type - Missionstyp (z.B. "item", "kill", "journey", "missions")
 * @returns {number} Fortschrittswert zwischen 0 und 1
 */
function getPlayerProgress(player, type, min1percent) {
    const goal = MISSION_TYPE_GOALS[type];
    if (!goal) return 0;
    const res = Math.min(1, getMissionDoneCount(player, type) / goal);
    return min1percent ? Math.max(0.01, res) : res;
}

/**
 * Setzt den letzten Login-Zeitpunkt des Spielers.
 * @param {Player} player - Spieler, dessen letzten Login-Zeitpunkt gesetzt wird
 */
function setLoginDate(player) {
    const pData = player.persistentData;
    pData.putString('login_date', formatDateISO(new Date()));
}

/**
 * Prüft, ob ein Spieler sich zum ersten Mal einloggt (kein Login-Datum gespeichert).
 * @param {Player} player
 * @returns {boolean}
 */
function firstLogin(player) {
    const pData = player.persistentData;
    return !pData.getString('login_date');
}

/**
 * Gibt das gespeicherte Login-Datum eines Spielers als Date-Objekt zurück.
 * @param {Player} player
 * @returns {Date}
 */
function getLoginDate(player) {
    const pData = player.persistentData;
    return parseDateISO(pData.getString('login_date'));
}

/**
 * Gibt die Anzahl der Tage seit dem letzten Login des Spielers zurück.
 * @param {Player} player
 * @returns {number}
 */
function daysSinceLogin(player) {
    return daysBetween(getLoginDate(player), new Date());
}

/**
 * Gibt die Anzahl der bereits abgeschlossenen Missionen zurück.
 * @param {Player} player - Spieler, dessen Anzahl der abgeschlossenen Missionen zurückgegeben wird
 * @param {string} type - Missionstyp (z.B. "item", "kill")
 * @returns {number} Anzahl der abgeschlossenen Missionen (mindestens 0)
 */
function getMissionPulled(player, type) {
    const pData = player.persistentData;
    if(!pData.getInt(`mission_pulled_${type}`)) return 0;
    return pData.getInt(`mission_pulled_${type}`);
}

/**
 * Erhöht den Zähler der gezogenen Missionen eines Spielers um eins.
 * @param {Player} player - Spieler, dessen Zähler erhöht wird
 * @param {string} type - Missionstyp (z.B. "item", "kill")
 */
function increaseMissionPulled(player, type) {
    const pData = player.persistentData;
    pData.putInt(`mission_pulled_${type}`, getMissionPulled(player, type) + 1);
}

/**
 * Gibt die Gesamtanzahl der gezogenen Missionen zurück.
 * @param {Player} player - Spieler, dessen Gesamtanzahl der gezogenen Missionen zurückgegeben wird
 * @returns {number} Gesamtanzahl der gezogenen Missionen (mindestens 0)
 */
function getMissionsPulledTotal(player) {
    let res = 0;
    for (const type of Object.keys(MISSION_TYPE_GOALS)) {
        res += getMissionPulled(player, type);
    }
    return res;
}