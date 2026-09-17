ServerEvents.recipes((event) => {
  console.info("Patching Coins");

  event.shapeless(Item.of("kubejs:coin", 8), ["kubejs:coin_stack"]);
  event.shapeless(Item.of("kubejs:coin_stack"), ["8x kubejs:coin"]);
  event.shapeless(Item.of("kubejs:coin_stack", 8), ["kubejs:coin_pouch"]);
  event.shapeless(Item.of("kubejs:coin_pouch"), ["8x kubejs:coin_stack"]);
});