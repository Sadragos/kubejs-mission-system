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
    pData.putInt('missions_done', (pData.getInt('missions_done') || 0) + amount);
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
    let goal = 0;
    let done = 0;
    if(DIFFICULTY_BY_TYPE) {
        goal = MISSION_TYPE_GOALS[type] || 100;
        done = getMissionDoneCount(player, type);
    } else {
        for (const _k of Object.keys(MISSION_TYPE_GOALS)) {
            goal += MISSION_TYPE_GOALS[_k];
            done += getMissionDoneCount(player, _k);
        }
    }
    const res = Math.min(1, done / goal);
    const lvl = min1percent ? Math.max(MIN_DIFFICULTY, res) : res;
    return lvl;
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
    for (let _i = 0; _i < players.length; _i++) { total += getPlayerProgress(players[_i], type, min1percent); }
    return total / players.length;
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
 * Erhöht die (vanilla) Erfahrungspunkte eines Spielers um einen bestimmten Betrag.
 * @param {Internal.ServerPlayer} player - Spieler, dessen XP erhöht wird
 * @param {number} xp - Anzahl der hinzuzufügenden XP
 */
function increaseXP(player, xp) {
    player.giveExperiencePoints(xp);
}

function rewardPlayer(event, player, source, type, rewards) {
    let internalRewards = {
        coins: rewards.coins || 0,
        xp: rewards.xp || 0,
        worldborder: rewards.worldborder || 0,
        items: rewards.items || [],
        buffs: rewards.buffs || [],
        commands: rewards.commands || []
    };

    SoundUtils.playSoundAtPlayer(event.server, player.username, 'minecraft:entity.firework_rocket.launch');

    // Statistik
    switch (source) {
        case 'mission':
            increaseMissionDoneCount(player, type);
            player.tell(Text.translate('kubejs.reward.mission_success').color('green').bold());
            break;
        case 'event':
            increaseEventDone(player, type);
            player.tell(Text.translate('kubejs.reward.event_success').color('green').bold());
            break;
    }

    // Rewards
    const rewardItems = [];
    if (internalRewards.coins > 0) {
        ItemUtils.summonItemAtPlayer(event.server, player.username, COIN_ITEM, internalRewards.coins);
        ParticleUtils.summonParticleAtPlayer(event.server, player.username, 'supplementaries:confetti', 100, 3, 0.2, 0.2, 0.2);
        rewardItems.push(Text.translate('kubejs.reward.item_count', TextUtils.colored(internalRewards.coins, 'white'), TextUtils.itemName(COIN_ITEM)).color('white'));
    }
    if (internalRewards.xp > 0) {
        increaseXP(player, internalRewards.xp);
        rewardItems.push(Text.translate('kubejs.reward.xp', TextUtils.colored(internalRewards.xp, 'aqua')).color('aqua'));
    }
    if (internalRewards.worldborder > 0) {
        event.server.runCommandSilent(`worldborder add ${internalRewards.worldborder} ${WORLDBORDER_ANIMATION_SECONDS}`);
        rewardItems.push(Text.translate('kubejs.reward.worldborder', TextUtils.colored(internalRewards.worldborder, 'green')).color('green'));
    }
    for (let item of internalRewards.items) {
        ItemUtils.summonItemAtPlayer(event.server, player.username, item.item, item.amount);
        ParticleUtils.summonParticleAtPlayer(event.server, player.username, 'supplementaries:confetti', 100, 3, 0.2, 0.2, 0.2);
        rewardItems.push(Text.translate('kubejs.reward.item_count', TextUtils.colored(item.amount, 'yellow'), TextUtils.itemName(item.item)).color('yellow'));
    }
    for (let buff of internalRewards.buffs) {
        event.server.runCommandSilent(`effect give ${player.username} ${buff.buff} ${buff.duration * 60} ${buff.amplifier}`);
        rewardItems.push(Text.translate('kubejs.reward.buff', TextUtils.colored(buff.duration, 'light_purple'), TextUtils.effectName(buff.buff), TextUtils.colored(TextUtils.toRoman(buff.amplifier), 'light_purple')).color('light_purple'));
    }
    for (let command of internalRewards.commands) {
        event.server.runCommandSilent(command.command);
        rewardItems.push(Text.translate(command.nameKey).color('gold'));
    }
    let rewardLine = Text.translate('kubejs.reward.header', TextUtils.join(Text.of(', '), rewardItems)).color('gold');
    player.tell(rewardLine);
}

const PlayerUtils = {
    /**
     * Stores the current date and time as the player's last login timestamp.
     * @param {Internal.ServerPlayer} player
     */
    setLoginDate: (player) => {
        let pData = player.persistentData;
        pData.putString('login_date', TimeUtils.formatDateISO(new Date()));
    },
    /**
     * Returns true if the player has never logged in before (no login date stored).
     * @param {Internal.ServerPlayer} player
     * @returns {boolean}
     */
    firstLogin: (player) => {
        let pData = player.persistentData;
        return !pData.getString('login_date');
    },
    /**
     * Returns the player's stored last login date as a Date object.
     * @param {Internal.ServerPlayer} player
     * @returns {Date}
     */
    getLoginDate: (player) => {
        let pData = player.persistentData;
        return TimeUtils.parseDateISO(pData.getString('login_date'));
    },
    /**
     * Returns the number of days since the player's last login.
     * @param {Internal.ServerPlayer} player
     * @returns {number}
     */
    daysSinceLogin: (player) => {
        return TimeUtils.daysBetween(PlayerUtils.getLoginDate(player), new Date());
    }
};
