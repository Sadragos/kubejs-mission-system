// Münzshop: jeder Katalog-Eintrag wird zu einem shapeless-Rezept, das direkt mit den
// Coin-"Scheinen" (kubejs:coin/coin_stack/coin_pouch, siehe coins.js) bezahlt wird. Der Preis
// wird automatisch in die passende Kombination aus Münzbeutel (64 Coins), Münzstapel (8 Coins)
// und Einzelmünzen umgerechnet. Haben mehrere Einträge denselben Preis, zeigt Polymorph beim
// Craften automatisch alle passenden Varianten zur Auswahl an - das ist der eigentliche "Shop".
ServerEvents.recipes((event) => {
  console.info("Registering Shop Recipes");

  const SHOP_ITEMS = [
    { item: Item.of("minecraft:diamond"), price: 8 },
    { item: Item.of("minecraft:emerald"), price: 8 },
    { item: Item.of("minecraft:netherite_ingot"), price: 10 },
    { item: Item.of("minecraft:enchanted_golden_apple"), price: 32 },
    { item: Item.of("minecraft:elytra"), price: 64 },
    { item: Item.of("minecraft:enchanted_book").enchant("minecraft:silk_touch", 1), price: 24 },
    { item: Item.of("minecraft:potion", 1, { "minecraft:potion_contents": "minecraft:strength" }), price: 6 },
    { item: Item.of("minecraft:experience_bottle"), price: 4 }
  ];

  SHOP_ITEMS.forEach((entry) => {
    let pouches = Math.floor(entry.price / 64);
    let remainder = entry.price % 64;
    let stacks = Math.floor(remainder / 8);
    let coins = remainder % 8;

    let ingredients = [];
    if (pouches > 0) ingredients.push(`${pouches}x kubejs:coin_pouch`);
    if (stacks > 0) ingredients.push(`${stacks}x kubejs:coin_stack`);
    if (coins > 0) ingredients.push(`${coins}x kubejs:coin`);

    event.shapeless(entry.item, ingredients);
  });
});
