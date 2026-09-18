// Coin-Wert-Anzeige für die Währungs-Items (kubejs:coin/coin_stack/coin_pouch, siehe
// server_scripts/coins.js für die Umrechnungskurse). Zeigt im Tooltip den Wert des einzelnen
// Items, bei Stacks zusätzlich den Stack-Gesamtwert und den Gesamtwert aller Coin-Items im
// Inventar des Spielers, in dem der gehoverte Stack liegt.
const CURRENCY_VALUES = {
    'kubejs:coin': 1,
    'kubejs:coin_stack': 8,
    'kubejs:coin_pouch': 64
};

function addCurrencyTooltip(event) {
    let value = CURRENCY_VALUES[event.item.id];
    if (!value) return;

    let lines = [Text.translate('kubejs.item.currency.value', value).color('gold')];

    if (event.item.count > 1) {
        lines.push(Text.translate('kubejs.item.currency.stack_value', value * event.item.count).color('gold'));
    }

    let player = Client.player;
    if (player) {
        let inventory = player.inventory;
        let total = 0;
        for (let i = 0; i < inventory.getContainerSize(); i++) {
            let stackValue = CURRENCY_VALUES[inventory.getItem(i).id];
            if (stackValue) total += stackValue * inventory.getItem(i).count;
        }
        lines.push(Text.translate('kubejs.item.currency.total_value', total).color('yellow'));
    }

    event.add(lines);
}

// ItemEvents.dynamicTooltips ist wie ItemEvents.rightClicked ein auf eine konkrete Item-ID
// gezielter Handler, kein Regex-Filter - deshalb einzeln pro Währungs-Item registrieren.
Object.keys(CURRENCY_VALUES).forEach(id => ItemEvents.dynamicTooltips(id, addCurrencyTooltip));
