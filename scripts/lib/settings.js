const registerSettings = async () => {
  // Register the main toggle to enable or disable the "fit" hunger system.
  await game.settings.register('fit', 'enabled', {
    name: "Enable fit",
    hint: "All player-controlled actors will be subject to hunger and exhaustion  rules",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true // ✅ Automatically prompts for a refresh
  })

  await game.settings.register("fit", "hungerTracking", {
    name: "Enable Hunger Tracking",
    hint: "If enabled, hunger tracking will be active. Uncheck to disable hunger tracking.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true, // Default: Hunger tracking ON when checked
    requiresReload: true
})

await game.settings.register("fit", "restTracking", {
  name: "Enable Rest Tracking",
  hint: "If enabled, rest tracking will be active. Uncheck to disable rest tracking.",
  scope: "world",
  config: true,
  type: Boolean,
  default: true, // ✅ Default: Exhaustion tracking is ON
  requiresReload: true
});


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
  requiresReload: true
});

await game.settings.register("fit", "baseRest", {
  name: "Base Rest Tolerance", // ✅ New Setting
  hint: "The base number of days a character can go without rest before suffering exhaustion.",
  scope: "world",
  config: true,
  type: Number,
  default: 1, // Default value (adjustable)
  requiresReload: true
});

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
}

export default registerSettings;
