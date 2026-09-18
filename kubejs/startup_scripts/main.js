StartupEvents.registry('item', event => {
    event.create('coin');
    event.create('coin_stack');
    event.create('coin_pouch');
    event.create('mission_scroll').tooltip(Text.translate('kubejs.item.mission_scroll.tooltip'));
    // Heller, pergamentnaher Sepia-Tint für den Typ-Icon-Layer (layer1) der pro Missionstyp
    // abweichenden Modelle, siehe assets/kubejs/models/item/mission*.json und
    // kubejs/40_missions.js (iconModelData). Alpha-Transparenz wird vom Renderer hier nicht
    // berücksichtigt, daher stattdessen eine hellere, ans Pergament angepasste Volltonfarbe.
    event.create('mission').color(1, 0xC9A66B);
});
