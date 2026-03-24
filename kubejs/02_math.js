/**
 * Gibt eine zufällige Dezimalzahl im Bereich [min, max) zurück.
 * @param {number} min - Untere Grenze (inklusive)
 * @param {number} max - Obere Grenze (exklusive)
 * @returns {number}
 */
function random(min, max) {
    return Math.random() * (max - min) + min
}

/**
 * Gibt eine zufällige ganze Zahl im Bereich [min, max] zurück (beide Grenzen inklusive).
 * @param {number} min - Untere Grenze (inklusive)
 * @param {number} max - Obere Grenze (inklusive)
 * @returns {number}
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Wählt ein zufälliges Element aus einer Liste, wobei jedes Element ein `weight`-Feld besitzt.
 * Elemente mit höherem Gewicht werden häufiger gezogen.
 * @param {{ weight: number }[]} list - Liste von Elementen mit Gewichtung
 * @returns {object|null} Zufällig gewähltes Element, oder null falls die Liste leer ist
 */
function getWeightedRandomItem(list) {
    let totalWeight = list.reduce((acc, item) => acc + item.weight, 0);
    let random = Math.random() * totalWeight;
    let currentWeight = 0;
    for (let item of list) {
        currentWeight += item.weight;
        if (random < currentWeight) {
            return item;
        }
    }
    return null;
}

/**
 * Gibt eine zufällige ganze Zahl im Bereich [min, max] zurück (beide Grenzen inklusive).
 * Der Bereich wird jedoch anhand des Parameters `percent` angepasst.
 * `percent` gibt an, wie viel Prozent des ursprünglichen Bereichs tatsächlich genommen werden soll.
 * Der tatsächliche Bereich wird zudem auf mindestens `lowest` und maximal `min + minGap` angepasst.
 * @param {number} min - Untere Grenze (inklusive)
 * @param {number} max - Obere Grenze (inklusive)
 * @param {number} percent - Prozent des ursprünglichen Bereichs, die tatsächlich genommen werden sollen
 * @param {number} lowest - Untere Grenze des tatsächlichen Bereichs (optional, default: 1)
 * @param {number} minGap - Minimale Differenz zwischen unterer und oberer Grenze (optional, default: 1)
 * @returns {number} Zufällig gewählte Zahl im angepassten Bereich
 */
function randomIntAdjusted(min, max, percent, lowest, minGap) {
    lowest = lowest || 1;
    minGap = minGap || 1;
    let adjustedMin = Math.max(lowest, Math.round(min * percent));
    let adjustedMax = Math.max(adjustedMin + minGap, Math.round(max * percent));
    return randomInt(adjustedMin, adjustedMax);
}
