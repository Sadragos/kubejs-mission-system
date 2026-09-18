/** Lazily-loaded reference to the vanilla EntityType class (no direct global binding exists for it). */
let _EntityTypeClass;
function _getEntityTypeClass() {
    if (!_EntityTypeClass) _EntityTypeClass = Java.loadClass('net.minecraft.world.entity.EntityType');
    return _EntityTypeClass;
}

const TextUtils = {
    /**
     * Capitalizes the first character of a value.
     * @param {*} val any value, converted to string internally
     * @returns {string}
     */
    capitalizeFirstLetter: (val) => {
        return String(val).charAt(0).toUpperCase() + String(val).slice(1);
    },
    /**
     * Capitalizes the first character of each space-separated word.
     * @param {string} str
     * @returns {string}
     */
    capitalizeEachWord: (str) => {
        return str.split(' ').map(word => TextUtils.capitalizeFirstLetter(word)).join(' ');
    },
    /**
     * Converts a positive integer to a Roman numeral string.
     * @param {number} num positive integer (e.g. 1–100+)
     * @returns {string} Roman representation (e.g. 42 → "XLII")
     */
    toRoman: (num) => {
        let values  = [100, 90, 50, 40, 10, 9, 5, 4, 1];
        let symbols = ['C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
        let result = '';
        for (let i = 0; i < values.length; i++) {
            while (num >= values[i]) {
                result += symbols[i];
                num -= values[i];
            }
        }
        return result;
    },
    /**
     * Checks whether a mission item/mob string is a single, concrete, resolvable registry ID
     * (as opposed to a substring filter, comma-list, wildcard or negation used for matching).
     * @param {string} idOrFilter
     * @returns {boolean}
     */
    isConcreteId: (idOrFilter) => {
        return !!idOrFilter
            && idOrFilter.indexOf(',') === -1
            && idOrFilter.indexOf('*') === -1
            && !idOrFilter.startsWith('#')
            && !idOrFilter.startsWith(KILL_GROUP_PREFIX)
            && idOrFilter.indexOf(':') > -1;
    },
    /**
     * Resolves a CSV `name` value to a display Component, if one was given: first as a lang
     * key (if a translation actually exists for it), otherwise as literal text. Returns
     * `undefined` for a blank name, so callers can fall through to their own real-name lookup.
     * @param {string} [name] CSV `name` value
     * @returns {Internal.Component|undefined}
     */
    resolveNameOverride: (name) => {
        if (!name) return undefined;
        let translated = Text.translate(name);
        return translated.getString() !== name ? translated : Text.literal(name);
    },
    /**
     * Returns the display name of an item: for a `#namespace:path` item tag, the CSV `name`
     * (as a lang key if one matches, otherwise literal text) if given, otherwise the real name
     * of the tag's first item — either way with a hover showing the raw tag ID so players can
     * look it up in JEI/REI. For a single concrete item ID, the CSV `name` if given, otherwise
     * its real name. Otherwise the raw ID/filter itself.
     * @param {string} idOrFilter item ID, item tag (`#namespace:path`) or mission item filter string
     * @param {string} [name] CSV `name` value
     * @returns {Internal.Component}
     */
    itemName: (idOrFilter, name) => {
        let override = TextUtils.resolveNameOverride(name);
        if (idOrFilter && idOrFilter.startsWith('#')) {
            try {
                let stack = Ingredient.first(idOrFilter);
                if (stack && !stack.isEmpty()) {
                    let label = override || stack.getHoverName();
                    let header = Text.translate('kubejs.mission.tag_header').getString();
                    return label.hover(`§l${header}§r\n${idOrFilter}`);
                }
            } catch (e) { /* empty/unknown tag, fall through */ }
        }
        if (override) return override;
        if (TextUtils.isConcreteId(idOrFilter)) {
            try {
                let stack = Item.of(idOrFilter);
                if (stack && !stack.isEmpty()) return stack.getHoverName();
            } catch (e) { /* not a valid item id, fall through */ }
        }
        return Text.literal(idOrFilter);
    },
    /**
     * Returns the display name of a mob: the "any monster" translation for the `*` wildcard
     * (always, regardless of `name`); otherwise the CSV `name` (as a lang key if one matches,
     * otherwise as literal text) if given; otherwise the real name of a concrete entity ID;
     * otherwise the raw ID/filter itself. For a `§:group` reference, the resolved name is
     * additionally given a hover listing the translated names of the group's members.
     * @param {string} idOrFilter entity ID or mission mob filter string
     * @param {string} [name] CSV `name` value
     * @returns {Internal.Component}
     */
    entityName: (idOrFilter, name) => {
        if (idOrFilter === '*') return Text.translate('kubejs.mission.any_monster');
        let override = TextUtils.resolveNameOverride(name);
        if (idOrFilter.startsWith(KILL_GROUP_PREFIX)) {
            let group = idOrFilter.substring(KILL_GROUP_PREFIX.length);
            let label = override || Text.literal(group);
            let moblist = (KILL_GROUPS[group] || [])
                .map(member => TextUtils.entityName(member.item, member.name).getString())
                .join(', ');
            let header = Text.translate('kubejs.event.hunt.moblist_header').getString();
            return label.hover(`§l${header}§r\n${moblist}`);
        }
        if (override) return override;
        if (TextUtils.isConcreteId(idOrFilter)) {
            try {
                let type = _getEntityTypeClass().byString(idOrFilter);
                if (type && type.isPresent()) return type.get().getDescription();
            } catch (e) { /* not a valid entity id, fall through */ }
        }
        return Text.literal(idOrFilter);
    },
    /**
     * Wraps a value as a literal text Component in the given Minecraft color, for
     * highlighting a number/name inline within a translated sentence.
     * @param {*} value
     * @param {string} [color] Minecraft color name (default: "gold")
     * @returns {Internal.Component}
     */
    colored: (value, color) => {
        return Text.of(String(value)).color(color || 'gold');
    },
    /**
     * Returns the real, translatable display name of a status effect, derived from the
     * standard `effect.<namespace>.<path>` translation key convention. Falls back to
     * `fallbackText` client-side if that key doesn't exist (e.g. non-standard modded keys).
     * @param {string} effectId effect ID (e.g. "minecraft:speed")
     * @param {string} [fallbackText] literal text to use if the translation key is missing
     * @returns {Internal.Component}
     */
    effectName: (effectId, fallbackText) => {
        let parts = effectId.indexOf(':') > -1 ? effectId.split(':') : ['minecraft', effectId];
        return Text.translateWithFallback(`effect.${parts[0]}.${parts[1]}`, fallbackText || IdUtils.idToString(parts[1]));
    },
    /**
     * Joins an array of Components with a separator Component into one Component.
     * A manual replacement for `Text.join(separator, texts)`, whose overload resolution
     * against a plain JS array is unreliable and silently drops the separator between entries.
     * @param {Internal.Component} separator
     * @param {Internal.Component[]} texts
     * @returns {Internal.Component}
     */
    join: (separator, texts) => {
        if (!texts || texts.length === 0) return Text.of('');
        let result = Text.of('').append(texts[0]);
        for (let i = 1; i < texts.length; i++) {
            result = result.append(separator).append(texts[i]);
        }
        return result;
    }
};
