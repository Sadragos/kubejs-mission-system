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
    if (!pData.getInt(`mission_done_${type}`)) return 0;
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
    return min1percent ? Math.max(0.05, res) : res;
}

/**
 * Berechnet den durchschnittlichen Fortschritt aller Spieler für einen bestimmten Missionstyp.
 * @param {Server} server - Der Server, dessen Spieler ausgelesen werden
 * @param {string} type - Missionstyp (z.B. "item", "kill")
 * @param {boolean} [min1percent] - Falls true, wird mindestens 0.01 zurückgegeben
 * @returns {number} Durchschnittlicher Fortschrittswert zwischen 0 und 1, oder 0 wenn keine Spieler online
 */
function getAveragePlayerProgress(server, type, min1percent) {
    const players = server.players;
    if (!players || players.length === 0) return 0;
    let total = 0;
    players.forEach(player => {
        total += getPlayerProgress(player, type);
    });
    const res = total / players.length;
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
    if (!pData.getInt(`mission_pulled_${type}`)) return 0;
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
 * Erhöht den Zähler der abgeschlossenen Events eines Spielers um eins.
 * @param {Player} player - Spieler, dessen Zähler erhöht wird
 * @param {string} type - Eventtyp (z.B. "hunt")
 */
function increaseEventDone(player, type) {
    const pData = player.persistentData;
    pData.putInt(`events_${type}`, getEventDone(player, type) + 1);
}

/**
 * Gibt die Anzahl der abgeschlossenen Events eines Spielers zurück.
 * @param {Player} player - Spieler, dessen Anzahl der abgeschlossenen Events zurückgegeben wird
 * @param {string} type - Eventtyp (z.B. "hunt")
 * @returns {number} Anzahl der abgeschlossenen Events (mindestens 0)
 */
function getEventDone(player, type) {
    const pData = player.persistentData;
    if (!pData.getInt(`events_${type}`)) return 0;
    return pData.getInt(`events_${type}`);
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

/**
 * Erhöht die Passive-Skills-XP eines Spielers um einen bestimmten Betrag.
 * @param {ServerEvent} event - Server-Event, das ausgelöst wurde
 * @param {string} playername - Username des Spielers, dessen Passive-Skills-XP erhöht wird
 * @param {number} xp - Anzahl der hinzuzufügenden XP
 */
function increaseSkillXP(event, playername, xp) {
    event.server.runCommandSilent(`puffish_skills experience add ${playername} epsilonskills:passive_skills ${xp}`);
}

function rewardPlayer(event, player, source, type, rewards) {
    let internalRewards = {
        coins: rewards.coins || 0,
        xp: rewards.xp || 0,
        worldborder: rewards.worldborder || 0,
        items: rewards.items || [],
        buffs: rewards.buffs || []
    };

    playSoundAtPlayer(event, player.username, 'minecraft:entity.firework_rocket.launch');

    // Statistik
    switch (source) {
        case 'mission':
            increaseMissionDoneCount(player, type);
            event.server.runCommandSilent(`tellraw ${player.username} [{"text":"Mission erfolgreich abgeschlossen!","color":"green", "bold":true}]`);
            break;
        case 'event':
            increaseEventDone(player, type);
            event.server.runCommandSilent(`tellraw ${player.username} [{"text":"Event erfolgreich abgeschlossen!","color":"green", "bold":true}]`);
            break;
    }

    // Rewards
    const rewardItems = [];
    if (internalRewards.coins > 0) {
        summonItem(event, player.username, COIN_ITEM, internalRewards.coins);
        rewardItems.push({ "text": `${internalRewards.coins}x Coin`, "color": "white" });
    }
    if (internalRewards.xp > 0) {
        increaseSkillXP(event, player.username, internalRewards.xp);
        rewardItems.push({ "text": `${internalRewards.xp} Skill-XP`, "color": "aqua" });
    }
    if (internalRewards.worldborder > 0) {
        event.server.runCommandSilent(`worldborder add ${internalRewards.worldborder} 3`);
        rewardItems.push({ "text": `+${internalRewards.worldborder}m Worldborder`, "color": "green" });
    }
    for (let item of internalRewards.items) {
        summonItem(event, player.username, item.item, item.amount);
        rewardItems.push({ "text": `${item.amount}x ${item.name}`, "color": "yellow" });
    }
    for (let buff of internalRewards.buffs) {
        event.server.runCommandSilent(`effect give ${player.username} ${buff.buff} ${buff.duration * 60} ${buff.amplifier}`);
        rewardItems.push({ "text": `${buff.duration} Minuten ${buff.name} ${toRoman(buff.amplifier)}`, "color": "light_purple" });
    }
    const rewardComponents = [{ "text": "» Belohnung: ", "color": "gold" }];
    rewardItems.forEach((item, i) => {
        rewardComponents.push(item);
        if (i < rewardItems.length - 1) rewardComponents.push({ "text": ", ", "color": "gold" });
    });
    rewardComponents.push({ "text": " «", "color": "gold" });
    event.server.runCommandSilent(`tellraw ${player.username} ${JSON.stringify(rewardComponents)}`);
}