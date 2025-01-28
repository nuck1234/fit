// This file defines core constants for the fit module, including hunger levels, icons, and time calculations.
// - Corrected spelling of "peckish".
// - Updated hunger icon paths to point to `fit/templates/icons/`.


/* =========================
   Hunger Levels and Icons
   ========================= */

// List of hunger levels, from the most extreme ("starving") to the least ("stuffed").
const HUNGER_LEVELS = [
  'starving',    // Level 0
  'famished',    // Level 1
  'ravenous',    // Level 2
  'hungry',      // Level 3
  'peckish',     // Level 4 (corrected spelling)
  'satisfied',   // Level 5
  'full',        // Level 6
  'stuffed'      // Level 7
];


// Paths to icons representing each hunger level, mapped by index to the HUNGER_LEVELS array.
// Icons are stored in the "fit/templates/icons" directory within the module.
const HUNGER_ICONS = [
  'modules/fit/templates/icons/level_0.png', // starving
  'modules/fit/templates/icons/level_1.png', // famished
  'modules/fit/templates/icons/level_2.png', // ravenous
  'modules/fit/templates/icons/level_3.png', // hungry
  'modules/fit/templates/icons/level_4.png', // peckish
  'modules/fit/templates/icons/level_5.png', // satisfied
  'modules/fit/templates/icons/level_6.png', // full
  'modules/fit/templates/icons/level_7.png'  // stuffed
];

// Default hunger level for a character when no hunger effects are applied ("satisfied").
const DEFAULT_HUNGER_LEVEL = 5;

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
SECONDS,               // Unit of time: 1 second (SECONDS)
MINUTE,                // Unit of time: 1 minute (MINUTE)
HOUR,                  // Unit of time: 1 hour (HOUR)
DAY                    // Unit of time: 1 day (DAY)
}