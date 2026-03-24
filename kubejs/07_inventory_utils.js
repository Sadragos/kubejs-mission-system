/**
 * Entfernt eine bestimmte Anzahl eines Items aus dem Inventar des Spielers.
 * Iteriert über alle Slots und zieht sukzessive ab, bis `amount` erreicht ist.
 * @param {Player} player - Spieler, dessen Inventar durchsucht wird
 * @param {string} searchItem - Item-Suchstring (wird via `validateItem` geprüft)
 * @param {number} amount - Gewünschte Menge zum Entfernen
 * @returns {number} Tatsächlich entfernte Menge (kann kleiner als `amount` sein)
 */
function removeFromInventory(player, searchItem, amount) {
    let inv = player.inventory;
    let remaining = amount;
    let size = inv.getContainerSize();


    for (let i = 0; i < size && remaining > 0; i++) {
        let invItem = inv.getItem(i);
        if (validateItem(invItem.id, searchItem, 'item')) {
            let take = Math.min(remaining, invItem.count);
            invItem.count -= take;
            remaining -= take;
        }
    }
    return amount - remaining;
}

/**
 * Spawnt ein Item-Entity an der Position des Spielers und zeigt einen Konfetti-Partikeleffekt.
 * @param {ServerEvent} event
 * @param {string} playerName - Name des Spielers (Zielposition)
 * @param {string} item - Item-Identifier (z.B. "minecraft:diamond")
 * @param {number} amount - Anzahl der zu spawnenden Items
 */
function summonItem(event, playerName, item, amount) {
    event.server.runCommandSilent(`execute at ${playerName} run summon minecraft:item ~ ~ ~ {Item:{id:"${item}",count:${amount}}}`);
    summonParticleAtPlayer(event, playerName, 'supplementaries:confetti', 100, 3, 0.2);
}
