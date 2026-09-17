const ItemUtils = {
    /**
     * Summons an item entity at a player's location.
     * @param {Internal.MinecraftServer} server
     * @param {string} playerName target player name
     * @param {string} item item ID (e.g. "minecraft:iron_sword")
     * @param {number} amount stack size
     * @param {string|null} components optional SNBT components string, e.g. `{"minecraft:custom_name":'{"text":"Name"}'}`
     */
    summonItemAtPlayer: (server, playerName, item, amount, components) => {
        let componentsStr = components ? `,components:${components}` : '';
        server.runCommandSilent(`execute at ${playerName} run summon minecraft:item ~ ~ ~ {Item:{id:"${item}",count:${amount}${componentsStr}}}`);
    },
    /**
     * Removes a given amount of an item from a player's inventory.
     * Iterates over all slots and subtracts successively until `amount` is reached.
     * @param {Internal.ServerPlayer} player the player whose inventory is searched
     * @param {string} searchItem item search string (checked via `ItemUtils.matchesFilter`)
     * @param {number} amount desired quantity to remove
     * @returns {number} actually removed quantity (may be less than `amount`)
     */
    removeFromInventory: (player, searchItem, amount) => {
        let inv = player.inventory;
        let remaining = amount;
        let size = inv.getContainerSize();
        for (let i = 0; i < size && remaining > 0; i++) {
            let invItem = inv.getItem(i);
            if (ItemUtils.matchesFilter(invItem, searchItem)) {
                let take = Math.min(remaining, invItem.count);
                invItem.count -= take;
                remaining -= take;
            }
        }
        return amount - remaining;
    },
    /**
     * Checks whether an item stack matches a mission item filter string. Supports everything
     * `IdUtils.idMatches` supports (substring lists, `!exact`, `*` wildcard), plus item tags
     * written as `#namespace:path` (e.g. `#forge:tomatoes`), matched via the real tag data.
     * @param {Internal.ItemStack} itemStack the item stack to test
     * @param {string} filter mission item filter string
     * @returns {boolean}
     */
    matchesFilter: (itemStack, filter) => {
        if (filter.startsWith('#')) {
            try {
                return Ingredient.of(filter).test(itemStack);
            } catch (e) {
                return false;
            }
        }
        return IdUtils.idMatches(itemStack.id, filter);
    }
};
