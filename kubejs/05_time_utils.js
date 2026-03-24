
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
function getTimeRemaining(event, fortschritt, bonus) {
    fortschritt = fortschritt === undefined ? false : fortschritt;
    let result = `${currentEvent.label || `§6[${currentEvent.name}]§f`} Verbleibende Zeit: ${tickTimeColor(currentEvent.endTick - event.server.tickCount)}${ticksToTime(currentEvent.endTick - event.server.tickCount)}§f.`;
    if (fortschritt) result += ` Fortschritt: §a${currentEvent.total} / ${currentEvent.targetAmount}§f.`;
    if (bonus && bonus > 1) result += ` Zeitbonus: §a${(bonus*100).toFixed(0)}%§f`;
    event.server.tell(result);
}

/**
 * Gibt einen formatierten String mit benötigter und verbleibender Zeit des aktuellen Events zurück.
 * @param {ServerEvent} event
 * @returns {string}
 */
function getTimeStats(event) {
    const ticksRemaining = currentEvent.endTick - event.server.tickCount;
    const ticksTook = event.server.tickCount - currentEvent.startTick;
    return `  -> Benötigte Zeit ${tickTimeColor(ticksRemaining)}${ticksToTime(ticksTook)}§f\n  -> Verbleibende Zeit ${tickTimeColor(ticksRemaining)}${ticksToTime(ticksRemaining)}§f`;
}

/**
 * Wandelt eine Tick-Anzahl in einen lesbaren Zeitstring um.
 * - < 1s  → "X Ticks"
 * - < 1h  → "MM:SS"
 * - >= 1h → "HH:MM:SS"
 * @param {number} ticks - Umzuwandelnde Tick-Anzahl
 * @param {boolean} [withColor] - Reserviert, aktuell ungenutzt
 * @returns {string}
 */
function ticksToTime(ticks, withColor) {
    if (ticks < TICKS_PER_SECOND) return `${ticks} Ticks`;

    let seconds = Math.floor(ticks / 20);
    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    let hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

/**
 * Formatiert ein Date-Objekt als "TT.MM HH:MM" (z.B. "24.03 14:05").
 * @param {Date} date
 * @returns {string}
 */
function formatDateTime(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Monat ist 0-basiert

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month} ${hours}:${minutes}`;
}
