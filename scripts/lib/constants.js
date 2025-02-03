// This file defines core constants for the fit module, including hunger levels, icons, and time calculations.
// - Corrected spelling of "peckish".
// - Updated hunger icon paths to point to `fit/templates/icons/`.

/* =========================
   Hunger Levels and Icons
   ========================= */

// List of hunger levels, from the most extreme ("starving") to the least ("stuffed").
const HUNGER_LEVELS = [
  //"Stuffed",    // Level 0 (most well-fed) future implementation
  //"Full",       // Level 1 future implementation
  "Satisfied",  // Level 2 (default state)
  "Peckish",    // Level 3
  "Hungry",     // Level 4
  "Ravenous",   // Level 5
  "Famished",   // Level 6
  "Starving"    // Level 7 (worst state)
];

// Paths to icons representing each hunger level, mapped by index to the HUNGER_LEVELS array.
// Icons are stored in the "fit/templates/icons" directory within the module.
const HUNGER_ICONS = [
  'modules/fit/templates/icons/level_0.png', // satisfied
  'modules/fit/templates/icons/level_1.png', // peckish
  'modules/fit/templates/icons/level_2.png', // hungry
  'modules/fit/templates/icons/level_3.png', // ravenous
  'modules/fit/templates/icons/level_4.png', // famished
  'modules/fit/templates/icons/level_5.png', // starving
  //'modules/fit/templates/icons/level_6.png', // full future implementation
  //'modules/fit/templates/icons/level_7.png'  // stuffed future implementation
];

// Default hunger level for a character when no hunger effects are applied ("satisfied").
const DEFAULT_HUNGER_LEVEL = 0;// changed to zero

/* =========================
   Exhaustion Levels and Icons
   ========================= */

// List of exhaustion levels, from the most extreme ("instant eath") to the least ("rested").
  const EXHAUSTION_LEVELS = [
    "Fully Rested",               // Level 0 (default state, no exhaustion)
    "Disadvantage on ability checks",  // Level 1
    "Speed halved",               // Level 2
    "Disadvantage on attack rolls and saving throws", // Level 3
    "Hit point maximum halved",   // Level 4
    "Speed reduced to 0",         // Level 5
    "Death"                       // Level 6 (final exhaustion state)

];

// Paths to icons representing each hunger level, mapped by index to the EXHAUSTION_LEVELS array.
// Icons are stored in the "fit/templates/icons" directory within the module.
const EXHAUSTION_ICONS  = [
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
return EXHAUSTION_LEVELS[level] || "No effect";
};

// Time tracking flags for rest
  export const REST_FLAGS = {
  lastRestAt: "fit.lastRestAt",
   secondsSinceLastRest: "fit.secondsSinceLastRest",
};

// Default hunger level for a character when no hunger effects are applied ("satisfied").
const DEFAULT_EXHAUSTION_LEVEL = 0;


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
HUNGER_LEVELS,         // Array of hunger levels
HUNGER_ICONS,          // Array of hunger icons
DEFAULT_HUNGER_LEVEL,  // Default starting hunger level
EXHAUSTION_LEVELS,      // Array of exhaustion levels
EXHAUSTION_ICONS,         // Array of exhaustion icons
DEFAULT_EXHAUSTION_LEVEL, // Default starting exhaustion level
SECONDS,               // Unit of time: 1 second (SECONDS)ß
MINUTE,                // Unit of time: 1 minute (MINUTE)
HOUR,                  // Unit of time: 1 hour (HOUR)
DAY                    // Unit of time: 1 day (DAY)
}
