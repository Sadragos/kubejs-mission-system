// Coin-Wert-Anzeige für die Währungs-Items (kubejs:coin/coin_stack/coin_pouch, siehe
// server_scripts/coins.js für die Umrechnungskurse). Zeigt im Tooltip den Wert des einzelnen
// Items, bei Stacks zusätzlich den Stack-Gesamtwert und den Gesamtwert aller Coin-Items im
// Inventar des Spielers, in dem der gehoverte Stack liegt.
const CURRENCY_VALUES = {
    'kubejs:coin': 1,
    'kubejs:coin_stack': 8,
    'kubejs:coin_pouch': 64
};

/**
 * Formats an integer with "." as thousands separator (e.g. 4156 -> "4.156").
 * @param {number} n
 * @returns {string}
 */
function formatCoinAmount(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function addCurrencyTooltip(event) {
    let value = CURRENCY_VALUES[event.item.id];
    if (!value) return;

    let lines = [Text.translate('kubejs.item.currency.value', formatCoinAmount(value)).color('gold')];

    if (event.item.count > 1) {
        lines.push(Text.translate('kubejs.item.currency.stack_value', formatCoinAmount(value * event.item.count)).color('gold'));
    }

    let player = Client.player;
    if (player) {
        let inventory = player.inventory;
        let total = 0;
        for (let i = 0; i < inventory.getContainerSize(); i++) {
            let stackValue = CURRENCY_VALUES[inventory.getItem(i).id];
            if (stackValue) total += stackValue * inventory.getItem(i).count;
        }
        lines.push(Text.translate('kubejs.item.currency.total_value', formatCoinAmount(total)).color('yellow'));
    }

    event.add(lines);
}

// ItemEvents.dynamicTooltips registriert nur einen benannten Handler - er wird nie von allein
// aufgerufen. Erst ItemEvents.modifyTooltips().modify(item, tooltip => tooltip.dynamic(id))
// bindet diesen Handler tatsächlich an die gewünschten Items (siehe KubeJS-Doku).
ItemEvents.modifyTooltips(event => {
    Object.keys(CURRENCY_VALUES).forEach(id => {
        event.modify(id, tooltip => tooltip.dynamic('currency_tooltip'));
    });
});

ItemEvents.dynamicTooltips('currency_tooltip', addCurrencyTooltip);
