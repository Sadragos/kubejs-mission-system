
/**
 * Gibt einen Minecraft-Farbcode basierend auf der verbleibenden Zeit zurück.
 * - < 20s  → dunkelrot (§4)
 * - < 1min → rot (§c)
 * - < 2min → gelb (§e)
 * - sonst  → grün (§a)
 * @param {number} ticks - Verbleibende Ticks
 * @returns {string} Minecraft-Farbcode
 */
function tickTimeColor(ticks) {
    if (ticks < 20 * 20) return '§4';
    if (ticks < TICKS_PER_MINUTE) return '§c';
    if (ticks < TICKS_PER_MINUTE * 2) return '§e';
    return '§a';
}

/**
 * Sendet eine Nachricht an alle Spieler mit der verbleibenden Zeit des aktuellen Events.
 * @param {ServerEvent} event
 * @param {boolean} [fortschritt=false] - Ob der Fortschritt (total / targetAmount) angezeigt werden soll
 * @param {number} [bonus] - Zeitbonus-Faktor (nur angezeigt wenn > 1)
 */
function getTimeRemaining(event, progress, bonus) {
    progress = progress === undefined ? false : progress;
    let remainingTicks = currentEvent.endTick - event.server.tickCount;
    let parts = [currentEvent.label, Text.translate('kubejs.event.time_remaining_short', tickTimeColor(remainingTicks) + ticksToTime(remainingTicks))];
    if (progress) parts.push(Text.translate('kubejs.event.progress', TextUtils.colored(currentEvent.total, 'green'), currentEvent.targetAmount));
    if (bonus && bonus > 1) parts.push(Text.translate('kubejs.event.time_bonus', TextUtils.colored(`${(bonus * 100).toFixed(0)}%`, 'green')));
    event.server.tell(Text.join(Text.of(' '), parts));
}

/**
 * Returns the "time taken" / "time remaining" components for the current event.
 * @param {ServerEvent} event
 * @returns {Internal.Component[]}
 */
function getTimeStats(event) {
    const ticksRemaining = currentEvent.endTick - event.server.tickCount;
    const ticksTook = event.server.tickCount - currentEvent.startTick;
    return [
        Text.translate('kubejs.event.time_taken', tickTimeColor(ticksRemaining) + ticksToTime(ticksTook)),
        Text.translate('kubejs.event.time_remaining', tickTimeColor(ticksRemaining) + ticksToTime(ticksRemaining))
    ];
}

/**
 * Wandelt eine Tick-Anzahl in einen lesbaren Zeitstring um.
 * - < 1s  → "X Ticks"
 * - < 1h  → "MM:SS"
 * - >= 1h → "HH:MM:SS"
 * @param {number} ticks - Umzuwandelnde Tick-Anzahl
 * @returns {string}
 */
function 
ticksToTime(ticks) {
    if (ticks < TICKS_PER_SECOND) return `${ticks} Ticks`;

    let seconds = Math.floor(ticks / 20);
    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    let hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
