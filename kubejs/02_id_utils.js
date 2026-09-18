const IdUtils = {
    /**
     * Converts a Minecraft item ID to a human-readable string.
     * Strips the namespace (e.g. "minecraft:") and capitalizes each word.
     * @param {string} id item ID (e.g. "minecraft:iron_sword")
     * @returns {string} e.g. "Iron Sword"
     */
    idToString: (id) => {
        let base = id.indexOf(':') === -1 ? id : id.split(':')[1];
        return TextUtils.capitalizeEachWord(base.split('_').join(' '));
    },
    /**
     * Checks whether an item ID matches a comma-separated filter string. Each entry is checked
     * as an exact match (or `*` for "match anything").
     * @param {string} searchItem item ID to test
     * @param {string} idStringLIst comma-separated filter string (e.g. "minecraft:iron_ingot,minecraft:gold_ingot")
     * @returns {boolean}
     */
    idMatches: (searchItem, idStringLIst) => {
        if(idStringLIst == '*') return true;
        let options = idStringLIst.split(',');
        for (let i = 0; i < options.length; i++) {
            if (searchItem === options[i]) return true;
        }
        return false;
    }
};
