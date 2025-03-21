// This script provides utility functions related to time calculations.
// It is used throughout the module to handle time-based operations such as determining elapsed time
// and converting between different units of time.
// Import the DAY constant from the constants.js module
// The DAY constant represents the number of seconds in a day.
import { DAY } from "./constants.js";

/**
 * Function: secondsAgo
 * Description: Calculates the world time in seconds from the specified number of seconds ago.
 * Parameters:
 *   - seconds (number): The number of seconds to subtract from the current world time.
 * Returns:
 *   - (number): The calculated time in seconds.
 */
export const secondsAgo = (seconds) => {
  return game.time.worldTime - seconds;
};

/**
 * Function: daysFromSeconds
 * Description: Converts a given number of seconds into whole days.
 * Parameters:
 *   - seconds (number): The total number of seconds to convert.
 * Returns:
 *   - (number): The equivalent number of full days.
 */
export const daysFromSeconds = (seconds) => {
  return Math.floor(seconds / DAY);
};