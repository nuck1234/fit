import { hungerLevel } from "./hunger.js";
import { daysFromSeconds, secondsAgo } from './time.js';
import { HOUR } from './constants.js';

let hungerTable;

export default class HungerTable extends Application {
  /**
   * Constructor for the HungerTable application. Initializes the application object with options.
   * @param {Object} object - Optional object containing data for initialization.
   * @param {Object} options - Options to configure the application.
   */
  constructor(object = {}, options = null) {
    super(object, options);
  }

  /**
   * Activates the HungerTable system and sets up event hooks to render the hunger table on relevant events.
   * Ensures a singleton instance of the hunger table.
   * @param {Object} system - System-specific configurations and methods.
   * @returns {HungerTable} - The singleton instance of the HungerTable.
   */
  static activate(system) {
    if (hungerTable) {
      hungerTable.render(true);
    } else {
      hungerTable = new HungerTable();
      hungerTable.system = system;
      Hooks.on('evaluateHunger', async () => { hungerTable.render(false); });
      Hooks.on('consumeFood', async () => { hungerTable.render(false); });
      Hooks.on('updateHunger', async () => { hungerTable.render(false); });
      Hooks.on('resetHunger', async () => { hungerTable.render(false); });
      Hooks.on('initializeHunger', async () => { hungerTable.render(false); });
      hungerTable.render(true);
    }
    return hungerTable;
  }

  /**
   * Retrieves the data necessary to render the hunger table.
   * Processes actors, calculating relevant hunger-related metrics for each.
   * @returns {Object} - Data object containing processed actor information for the template.
   */
  getData() {
    const data = game.actors.filter(actor => actor.hasPlayerOwner).map(actor => {
      const lastMealAt = actor.getFlag('fit', 'lastMealAt') || 0;
      const secondsSinceLastMeal = game.time.worldTime - lastMealAt;
      
  // Calculate days hungry dynamically
  const baseTolerance = game.settings.get('fit', 'baseTolerance'); // Dynamically fetch from settings
  const daysSinceLastMeal = Math.floor(secondsSinceLastMeal / 86400);
  const conMod = actor.system.abilities.con.mod || 0; // Constitution modifier
  const hungerTolerance = Math.max(baseTolerance + conMod, 0); // Constitution-based tolerance
  const daysHungry = Math.max(daysSinceLastMeal - hungerTolerance, 0);
  const hunger = hungerLevel(actor); // Dynamically calculate hunger description

  
     /* console.log("Actor Debug:", {
        name: actor.name,
        lastMealAtRaw: lastMealAt,
        formattedLastMeal: this.formatDate(lastMealAt),
        secondsSinceLastMeal,
        hoursSinceLastMeal: this.formatHours(secondsSinceLastMeal),
        hunger, // Log fetched hunger
      });*/
  
      return {
        name: actor.name,
        lastMealAt: this.formatDate(lastMealAt),
        hoursSinceLastMeal: this.formatHours(secondsSinceLastMeal),
        hunger, // Include hunger in the returned data
      };
    });
  
    console.log("Hunger Table Data Sent to Template:", data);
    return { actors: data };
  }

  /**
   * Converts a timestamp in seconds to a formatted date using the SimpleCalendar API.
   * Falls back to a readable string if SimpleCalendar is unavailable or fails.
   * @param {number} seconds - Timestamp in seconds.
   * @returns {string} - Formatted date string or "Unknown" if the input is invalid.
   */
  formatDate(seconds) {
    if (!seconds || seconds <= 0) return "Unknown";
    try {
      const result = SimpleCalendar.api.timestampToDate(seconds);
      if (typeof result === "object" && result.display?.date) {
        return result.display.date; // Use the formatted date provided by SimpleCalendar
      } else if (typeof result === "string") {
        return result; // SimpleCalendar returned a string date
      } else {
        console.warn("Unexpected SimpleCalendar response format:", result);
        return "Unknown";
      }
    } catch (error) {
      console.warn("Error formatting date with SimpleCalendar. Falling back to default date:", error);
      return new Date(seconds * 1000).toLocaleString(); // Fallback to standard date
    }
  }

  /**
   * Formats seconds into a human-readable hours and minutes string (e.g., "5h 30m").
   * @param {number} seconds - Time in seconds.
   * @returns {string} - Formatted time string.
   */
  formatHours(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Defines default options for the HungerTable application, including the template path and UI settings.
   * @returns {Object} - The default options for the application.
   */
  static get defaultOptions() {
    const options = super.defaultOptions;
    options.template = "modules/fit/templates/hunger_table.html";
    options.minimizable = true;
    options.resizable = true;
    options.title = "Hunger Table";
    return options;
  }
}

