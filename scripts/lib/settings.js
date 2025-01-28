const registerSettings = async () => {
  // Register the main toggle to enable or disable the "fit" hunger system.
  await game.settings.register('fit', 'enabled', {
    name: "Enable fit",
    hint: "All player-controlled actors will be subject to hunger rules",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  })

  // Register the setting to skip hunger evaluation for players who are not logged in.
  await game.settings.register('fit', 'skipMissingPlayers', {
    name: "Don't make missing players hungry",
    hint: "Skip evaluating hunger for any players who aren't logged in",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  })

  // Register the number of rations required per day per actor.
  await game.settings.register('fit', 'rationsPerDay', {
    name: "Rations Per Day",
    hint: "Each actor consumes this number of rations per day",
    scope: "world",
    config: true,
    type: Number,
    default: 1,
  })

  // Register the base tolerance (number of days without food before hunger starts).
await game.settings.register('fit', 'baseTolerance', {
  name: "Base Hunger Tolerance",
  hint: "The base number of days an actor can go without food before starting to feel hungry (modified by Constitution).",
  scope: "world", // This ensures all players use the same value.
  config: true, // This makes it visible in the settings UI.
  type: Number, // The setting must be a number.
  default: 1, // Default value is 3 days, per D&D 5e rules.
});


  // Placeholder for thirst-related settings, not yet implemented.
  // Enables the thirst mechanic and water consumption tracking.
  // await game.settings.register('fit', 'thirstEnabled', {
  //   name: "[COMING SOON] Enable Thirst",
  //   hint: "Also subject players to water rules; players will need to drink water and maintain waterskins",
  //   scope: "world",
  //   config: true,
  //   type: Boolean,
  //   default: true,
  // })

  // Placeholder for water consumption setting, paired with the thirst mechanic.
  // Specifies the amount of water required per day.
  // await game.settings.register('fit', 'waterPerDay', {
  //   name: "Water Per Day",
  //   hint: "Each actor consumes this amount of water per day in charges",
  //   scope: "world",
  //   config: true,
  //   type: Number,
  //   default: 1,
  // })

  // Register the maximum level of exhaustion that can be applied due to hunger.
  await game.settings.register('fit', 'maxExhaustion', {
    name: "Max Exhaustion to apply",
    hint: "Apply no more than this many levels of exhaustion due to hunger and thirst",
    scope: "world",
    config: true,
    type: Number,
    default: 2,
  })

  // Register the name of the item to be treated as rations in the system.
  await game.settings.register('fit', 'rationName', {
    name: "Ration Name",
    hint: "Use this item name for rations",
    scope: "world",
    config: true,
    type: String,
    default: "Rations",
  })

  // Placeholder for the waterskin item name, related to the thirst mechanic.
  // Specifies the item name used to track water consumption.
  // await game.settings.register('fit', 'waterName', {
  //   name: "Waterskin Name",
  //   hint: "Use this item name for waterskins",
  //   scope: "world",
  //   config: true,
  //   type: String,
  //   default: "Waterskin",
  // })
}

export default registerSettings
