// This file defines core constants for the fit module, including hunger levels, icons, and time calculations.
// - Corrected spelling of "peckish".
// - Updated hunger icon paths to point to `fit/templates/icons/`.

/* =========================
   Hunger Levels and Icons
   ========================= */

// List of hunger levels, from the most extreme ("starving") to the least ("stuffed").
const HUNGER_LEVEL = [
  //"Stuffed",    // Level 0 (most well-fed) future implementation
  //"Full",       // Level 1 future implementation
  "Fully Satisfied",  // Level 2 (default state)
  "Peckish",    // Level 3
  "Hungry",     // Level 4
  "Desperate for Food",   // Level 5
  "Severely Hungry",   // Level 6
  "Critically Hungry",    // Level 7 (worst state)
  "Unconscious" // Level 8 (final hunger state)
];

// Paths to icons representing each hunger level, mapped by index to the HUNGER_LEVEL array.
// Icons are stored in the "fit/templates/icons" directory within the module.
const HUNGER_ICONS = [
  'modules/fit/templates/icons/level_0.png', // satisfied
  'modules/fit/templates/icons/level_1.png', // peckish
  'modules/fit/templates/icons/level_2.png', // hungry
  'modules/fit/templates/icons/level_3.png', // ravenous
  'modules/fit/templates/icons/level_4.png', // famished
  'modules/fit/templates/icons/level_5.png', // starving
  'modules/fit/templates/icons/level_6.png', // unconscious
  //'modules/fit/templates/icons/level_7.png'  // stuffed future implementation
];

// Default hunger level for a character when no hunger effects are applied ("satisfied").
const DEFAULT_HUNGER_LEVEL = 0;// changed to zero

/* =========================
   Thirst Levels and Icons
   ========================= */

// List of hunger levels, from the most extreme ("starving") to the least ("stuffed").
const THIRST_LEVEL = [
  "Fully Hydrated",         // Level 0 (default state, rested)
  "Parched",               // Level 1
  "Dehydrated",            // Level 2
  "Desperate for Water",   // Level 3
  "Severely Dehydrated",    // Level 4
  "Critically Dehydrated",  // Level 5
  "Unconscious"         // Level 6 (final rest state)
];

// Paths to icons representing each hunger level, mapped by index to the HUNGER_LEVEL array.
// Icons are stored in the "fit/templates/icons" directory within the module.
const THIRST_ICONS = [
  'modules/fit/templates/icons/level_0.png', // Fully Hydrated
  'modules/fit/templates/icons/level_1.png', // Parched
  'modules/fit/templates/icons/level_2.png', // Dehydrated
  'modules/fit/templates/icons/level_3.png', // Desperate for Water
  'modules/fit/templates/icons/level_4.png', // Severely Dehydrated
  'modules/fit/templates/icons/level_5.png', // Critically Dehydrated
  'modules/fit/templates/icons/level_6.png', // Dying of Thirst
];

// Default hunger level for a character when no hunger effects are applied ("satisfied").
const DEFAULT_THIRST_LEVEL = 0;// changed to zero

/* =========================
   Rest Levels and Icons
   ========================= */

// List of rest levels, from the most extreme ("instant eath") to the least ("rested").
  const REST_LEVEL = [
    "Fully Rested",               // Level 0 (default state, rested)
    "Weary",  // Level 1
    "Fatigued",               // Level 2
    "Desperate for Sleep", // Level 3
    "Severely Tired	",   // Level 4
    "Critically Tired",         // Level 5
    "Unconscious"                       // Level 6 (final rest state)

];

// Paths to icons representing each hunger level, mapped by index to the REST_LEVEL array.
// Icons are stored in the "fit/templates/icons" directory within the module.
const REST_ICONS  = [
  'modules/fit/templates/icons/level_0.png', // Rested 
  'modules/fit/templates/icons/level_1.png', // Disadvantage on ability checks 
  'modules/fit/templates/icons/level_2.png', // Speed halved 
  'modules/fit/templates/icons/level_3.png', // Disadvantage on attack rolls and saving throws
  'modules/fit/templates/icons/level_4.png', // Hit point maximum halved
  'modules/fit/templates/icons/level_5.png', // Speed reduced to 0
  'modules/fit/templates/icons/level_6.png' // Instant death
 
];

// Function to get the exhaustion effect based on level
export const exhaustionEffect = (level) => {
return REST_LEVEL[level] || "No effect";
};

// Time tracking flags for rest
  export const REST_FLAGS = {
  lastRestAt: "fit.lastRestAt",
   secondsSinceLastRest: "fit.secondsSinceLastRest",
};

// Default hunger level for a character when no hunger effects are applied ("satisfied").
const DEFAULT_REST_LEVEL = 0;


/* =========================
   Time Constants
   ========================= */

// Define units of time for hunger-related calculations.
const SECONDS = 1;            // 1 second
const MINUTE = SECONDS * 60;   // 60 seconds
const HOUR = MINUTE * 60;     // 3600 seconds (1 hour)
const DAY = HOUR * 24;        // 86400 seconds (1 day)

// Export constants for use across the module.
export {
HUNGER_LEVEL,         // Array of hunger levels
HUNGER_ICONS,          // Array of hunger icons
DEFAULT_HUNGER_LEVEL,  // Default starting hunger level
REST_LEVEL,      // Array of rest levels
REST_ICONS,         // Array of rest icons
DEFAULT_REST_LEVEL, // Default starting rest level
THIRST_LEVEL,         // Array of thirst levels
THIRST_ICONS,          // Array of thirst icons
DEFAULT_THIRST_LEVEL,  // Default starting thirst level
SECONDS,               // Unit of time: 1 second (SECONDS)ß
MINUTE,                // Unit of time: 1 minute (MINUTE)
HOUR,                  // Unit of time: 1 hour (HOUR)
DAY                                    // Unit of time: 1 day (DAY)
}

/* =========================
   Terrain Multipliers
   ========================= */
export function getTerrainMultipliers() {
  const terrain = game.settings.get("fit", "terrain") || "normal";

  const multipliers = {
    normal: {
      hunger: 1.0,
      thirst: 1.0,
      rest: 1.0
    },
    desert: {
      hunger: 1.0,
      thirst: 1.5,
      rest: 1.5
    },
    swamp: {
      hunger: 1.5,
      thirst: 1.5,
      rest: 1.0
    },
    mountain: {
      hunger: 1.5,
      thirst: 1.0,
      rest: 1.5
    }
  };

  return multipliers[terrain] || multipliers.normal;
}
export const terrainData = {
  normal: {
    name: "Normal Terrain",
    label: "Normal",  // 👈 This is used under the icon
    icon: "modules/fit/templates/icons/normal.png",
    description: "Traversing typical landscapes such as forests, grasslands, or hills presents a balanced set of challenges regarding survival. <p>Food and portable water sources are available with reasonable effort, the climate is usually temperate, allowing for comfortable rest. <p>The impact of not securing sufficient food, water, or rest is felt at a standard rate. <p>Every 24 hours without adequate sustenance or rest will lead to a gradual increase in fatigue. <p>This environment doesn't inherently amplify the effects of deprivation in any specific area, making survival a matter of consistent effort rather than overcoming extreme environmental pressures."
    .trim()
  },
  desert: {
    name: "Desert (Hot & Dry)",
    label: "Desert",  // 👈 This is used under the icon
    icon: "modules/fit/templates/icons/Desert.png",
    description: "The scorching sun beats down on the endless expanse of sand, making the days brutally hot. While food may be scarce but doesn't inherently worsen your hunger, the intense heat drastically accelerates dehydration. <p> Without sufficient water intake, the effects of thirst are amplified, making its impact felt more severely every 24 hours. <p> As night falls, the temperature plummets, often to frigid levels. This dramatic shift makes finding comfortable and restful sleep challenging, impacting your ability to recover. <p>The combination of amplified thirst and disrupted rest in this harsh environment means that without proper sustenance and respite, exhaustion will accumulate rapidly."


  },
  swamp: {
    name: "Swamp (Hot & Humid)",
    label: "Swamp",  // 👈 This is used under the icon
    icon: "modules/fit/templates/icons/Jungle.png",
    description: "The humid, stagnant air of the swamp hangs heavy, thick with the smell of decay and buzzing insects. While the environment itself doesn't directly worsen your thirst, the difficulty in finding clean and uncontaminated food sources means that hunger takes its toll more quickly. <p> The constant dampness and uneven terrain make foraging inefficient, amplifying the impact of not finding enough to eat every 24 hours. <p> However, the relatively stable and often humid temperatures, even at night, do not typically hinder rest. <p>Despite the discomfort, finding a place to settle for a long rest is generally easier than in more extreme environments. The primary threat in the swamp comes from the accelerated hunger combined with the constant energy expenditure of navigating the treacherous terrain, leading to a quicker onset of exhaustion if food is scarce."
  },
  mountain: {
    name: "Mountain (Cold & Thin Air)",
    label: "Mountain",  // 👈 This is used under the icon
    icon: "modules/fit/templates/icons/Mountain.png",
    description: "The towering peaks and jagged cliffs of the mountains present a different set of challenges. While fresh water sources may be found in streams and snowmelt, the thin air and strenuous exertion of climbing and navigating the steep slopes significantly increase your body's need for sustenance. <p>Finding enough food in this rugged terrain is difficult, amplifying the impact of hunger every 24 hours. <p>Furthermore, the exposed and often windy conditions, coupled with the cold nights at higher altitudes, make finding adequate shelter for rest a constant struggle. <p>The lack of proper rest further exacerbates the effects of the demanding physical activity. <p>In the mountains, the combination of amplified hunger due to the environment and disrupted rest due to the harsh conditions will lead to a rapid accumulation of exhaustion if resources are not carefully managed."
  }
}

export const exhaustionData = {
  level_0: {
    name: "Level Zero",
    label: "Zero",  // 👈 This is used under the icon
    icon: "modules/fit/templates/icons/figure-running-gray.webp",
    description: "Your exhaustion level is zero, there are no impediments applied."
    .trim()
  },
  level_1: {
    name: "Level One",
    label: "Level 1",  // 👈 This is used under the icon
    icon: "systems/dnd5e/icons/svg/statuses/exhaustion-1.svg",
    description: "Your exhaustion level is one. <p> A disadvantage on ability checks has applied. <p> Check your condition and make the necessary steps to remove this impediment."
    .trim()
},
  level_2: {
    name: "Level Two",
    label: "Level 2",  // 👈 This is used under the icon
    icon: "systems/dnd5e/icons/svg/statuses/exhaustion-2.svg",
    description: "Your exhaustion level is two. <p> Your movement speed has been halved. <p> Check your condition and make the necessary steps to remove this impediment"
    .trim()
  },
  level_3: {
    name: "Level Three",
    label: "Level 3",  // 👈 This is used under the icon
    icon: "systems/dnd5e/icons/svg/statuses/exhaustion-3.svg",
    description: "Your exhaustion level is three. <p> A disadvantage on attack and saving roles has been applied. <p> Check your condition and make the necessary steps to remove this impediment"
    .trim()
  },
  level_4: {
    name: "Level Four",
    label: "Level 4",  // 👈 This is used under the icon
    icon: "systems/dnd5e/icons/svg/statuses/exhaustion-4.svg",
    description: "Your exhaustion level is four. <p> Your hit points have been halved.<p> Check your condition and make the necessary steps to remove this impediment"
    .trim()
  },
  level_5: {
    name: "Level Five",
    label: "Level 5",  // 👈 This is used under the icon
    icon: "systems/dnd5e/icons/svg/statuses/exhaustion-5.svg",
    description: "Your exhaustion level is five. <p> Your speed has been reduced to zero. <p> Check your condition and make the necessary steps to remove this impediment"
    .trim()
  },
  level_6: {
    name: "Level Six",
    label: "Level 6",  // 👈 This is used under the icon
    icon: "systems/dnd5e/icons/svg/statuses/exhaustion-6.svg",
    description: "Your exhaustion level is six. <p> You are now unconcious/dead. <p> Check your condition and make the necessary steps to remove this impediment"
    .trim()
  },
}