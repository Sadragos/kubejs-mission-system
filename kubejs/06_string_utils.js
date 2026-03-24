/**
 * Wandelt den ersten Buchstaben eines Wertes in einen Großbuchstaben um.
 * @param {*} val - Beliebiger Wert, wird intern zu String konvertiert
 * @returns {string}
 */
function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

/**
 * Prüft, ob ein Item-String einer kommagetrennten Validierungsliste entspricht.
 * Einträge mit führendem `!` werden als Exakt-Match geprüft,
 * alle anderen als Substring-Match.
 * @param {string} searchItem - Zu prüfender Item-String
 * @param {string} validateItemList - Kommagetrennte Liste von Mustern (z.B. "stone,!minecraft:dirt")
 * @returns {boolean}
 */
function validateItem(searchItem, validateItemList) {
    let options = validateItemList.split(',');
    for (let i = 0; i < options.length; i++) {
        if(options[i].startsWith('!')) {
            if (searchItem === options[i].substring(1)) return true;
        } else if (searchItem.indexOf(options[i]) !== -1) return true;
    }
    return false;
}

/**
 * Leitet einen lesbaren Anzeigenamen aus einem Item-Identifier ab.
 * Entfernt den Namespace-Prefix (z.B. "minecraft:") und wandelt
 * snake_case in Title Case um (z.B. "iron_sword" → "Iron Sword").
 * @param {string} item - Item-Identifier (z.B. "minecraft:iron_sword" oder "iron_sword")
 * @returns {string}
 */
function nameFromItem(item) {
    const base = item.indexOf(':') === -1 ? item : item.split(':')[1];
    return base.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Wandelt eine positive ganze Zahl in eine römische Zahl um.
 * @param {number} num - Positive ganze Zahl (z.B. 1–100+)
 * @returns {string} Römische Darstellung (z.B. 42 → "XLII")
 */
function toRoman(num) {
    const values = [100, 90, 50, 40, 10, 9, 5, 4, 1];
    const symbols = ['C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
    let result = '';
    for (let i = 0; i < values.length; i++) {
        while (num >= values[i]) {
            result += symbols[i];
            num -= values[i];
        }
    }
    return result;
}
