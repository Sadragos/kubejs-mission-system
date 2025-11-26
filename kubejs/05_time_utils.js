
function tickTimeColor(ticks) {
    if (ticks < 20 * 20) return '§4';
    if (ticks < ticksPerMinute) return '§c';
    if (ticks < ticksPerMinute * 2) return '§e';
    return '§a';
}

function getTimeRemaining(event, fortschritt) {
    fortschritt = fortschritt === undefined ? false : fortschritt;
    let result = `${currentEvent.label || `§6[${currentEvent.name}]§f`} Verbleibende Zeit: ${tickTimeColor(currentEvent.endTick - event.server.tickCount)}${ticksToTime(currentEvent.endTick - event.server.tickCount)}§f.`;
    if (fortschritt) result += ` Fortschritt: §a${currentEvent.total} / ${currentEvent.targetAmount}§f.`;
    event.server.tell(result);
}

function getTimeStats(event) {
    const ticksRemaining = currentEvent.endTick - event.server.tickCount;
    const ticksTook = event.server.tickCount - currentEvent.startTick;
    return `  -> Benötigte Zeit ${tickTimeColor(ticksRemaining)}${ticksToTime(ticksTook)}§f\n  -> Verbleibende Zeit ${tickTimeColor(ticksRemaining)}${ticksToTime(ticksRemaining)}§f`;
}

function ticksToTime(ticks, withColor) {
    if (ticks < ticksPerSecond) return `${ticks} Ticks`;

    let seconds = Math.floor(ticks / 20);
    let minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    let hours = Math.floor(minutes / 60);
    return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function formatDateTime(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Monat ist 0-basiert

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}.${month} ${hours}:${minutes}`;
}
