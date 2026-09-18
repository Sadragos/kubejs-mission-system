
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
    let parts = [currentEvent.label, Text.translate('kubejs.event.time_remaining_short', tickTimeColor(remainingTicks) + ticksToTime(remainingTicks)).color('gray')];
    if (progress) parts.push(Text.translate('kubejs.event.progress', TextUtils.colored(currentEvent.total, 'green'), TextUtils.colored(currentEvent.targetAmount, 'green')).color('gray'));
    if (bonus && bonus > 1) parts.push(Text.translate('kubejs.event.time_bonus', TextUtils.colored(`${(bonus * 100).toFixed(0)}%`, 'green')).color('gray'));
    event.server.tell(TextUtils.join(Text.of(' '), parts));
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

const TimeUtils = {
    /**
     * Formats a Date object as "YYYY-MM-DD HH:MM:SS" (e.g. "2026-03-24 14:05:30").
     * @param {Date} date
     * @returns {string}
     */
    formatDateISO: (date) => {
        let year = date.getFullYear();
        let month = (date.getMonth() + 1).toString().padStart(2, '0');
        let day = date.getDate().toString().padStart(2, '0');
        let hours = date.getHours().toString().padStart(2, '0');
        let minutes = date.getMinutes().toString().padStart(2, '0');
        let seconds = date.getSeconds().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    /**
     * Parses a date string in "YYYY-MM-DD HH:MM:SS" format into a Date object.
     * @param {string} str date string, e.g. "2026-03-24 14:05:30"
     * @returns {Date}
     */
    parseDateISO: (str) => {
        let [datePart, timePart] = str.split(' ');
        let [year, month, day] = datePart.split('-').map(Number);
        let [hours, minutes, seconds] = (timePart || '00:00:00').split(':').map(Number);
        return new Date(year, month - 1, day, hours, minutes, seconds);
    },
    /**
     * Returns a new Date object with the time portion stripped (set to 00:00:00).
     * @param {Date} date
     * @returns {Date}
     */
    dateOnly: (date) => {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    },
    /**
     * Returns the number of whole days between two dates.
     * @param {Date} a
     * @param {Date} b
     * @returns {number} absolute number of days between a and b
     */
    daysBetween: (a, b) => {
        let msPerDay = 1000 * 60 * 60 * 24;
        return Math.round(Math.abs(TimeUtils.dateOnly(a) - TimeUtils.dateOnly(b)) / msPerDay);
    }
};
