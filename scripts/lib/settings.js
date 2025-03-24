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

await game.settings.register("fit", "thirstTracking", {
  name: "Enable Thirst Tracking",
  hint: "If enabled, thisrt tracking will be active. Uncheck to disable thirst tracking.",
  scope: "world",
  config: true,
  type: Boolean,
  default: true, // Default: Thirst tracking ON when checked
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
    config: false,
    type: Boolean,
    default: true,
  })


  // Register the base tolerance (number of days without food before hunger starts).
await game.settings.register('fit', 'baseTolerance', {
  name: "Base Hunger Tolerance",
  hint: "The base number of days an actor can go without food before starting to feel hungry (modified by Constitution).",
  scope: "world", // This ensures all players use the same value.
  config: true, // This makes it visible in the settings UI.
  type: Number, // The setting must be a number.
  default: 0, // Default value is 3 days, per D&D 5e rules.
  requiresReload: true
});

await game.settings.register("fit", "baseRest", {
  name: "Base Rest Tolerance", // ✅ New Setting
  hint: "The base number of days a character can go without rest before suffering exhaustion.",
  scope: "world",
  config: true,
  type: Number,
  default: 0, // Default value (adjustable)
  requiresReload: true
});

await game.settings.register("fit", "baseThirst", {
  name: "Base Thirst Tolerance", // ✅ New Setting
  hint: "The base number of days a character can go without a drink before suffering exhaustion.",
  scope: "world",
  config: true,
  type: Number,
  default: 0, // Default value (adjustable)
  requiresReload: true
});

await game.settings.register("fit", "terrain", {
  name: "Terrain Type",
  hint: "Select the current terrain to apply environmental effects on hunger, thirst, and rest.",
  scope: "world",
  config: true,
  type: String,
  choices: {
    normal: "Normal",
    desert: "Desert (Hot & Dry)",
    swamp: "Swamp (Hot & Humid)",
    mountain: "Mountain (Cold & Thin Air)"
  },
  default: "normal",
  requiresReload: true
});

await game.settings.register("fit", "hungerEffect", {
    name: "Enable Hunger additional effects",
    hint: "If enabled, hunger additional effects will be active reducing the Max Hit Points for every hunger level. Check to hunger effect.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false, // Default: Hunger tracking OFF when checked
    requiresReload: true
})

 // Register the name of the item to be treated as rations in the system.
await game.settings.register('fit', 'rationName', {
    name: "Ration Name",
    hint: "Use this item name for rations",
    scope: "world",
    config: true,
    type: String,
    default: "Rations",
    requiresReload: true

  })

  // Register the name of the item to be treated as Water in the system.
  await game.settings.register('fit', 'waterName', {
    name: "Water Name",
    hint: "Use this item name for Water",
    scope: "world",
    config: true,
    type: String,
    default: "Waterskin",
    requiresReload: true
  })

  // send chat message after eating.
await game.settings.register('fit', 'confirmChat', {
  name: "Consumption Confirmation",
  hint: "check this box to send a chat message after eating or drinking",
  scope: "world",
  type: Boolean,
    default: false, // Default: Chat confirmation OFF
    requiresReload: true
})
}



export default registerSettings;
