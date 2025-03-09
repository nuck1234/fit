import { hungerLevel, daysHungryForActor, lastMealAt, secondsSinceLastMeal } from "./hunger.js";

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
   * Retrieves the hunger data from `hunger.js` instead of performing calculations here.
   * @returns {Object} - Data object containing processed actor information for the template.
   */
  getData() {
    const data = game.actors.filter(actor => actor.hasPlayerOwner).map(actor => {
      return {
        name: actor.name,
        lastMealAt: this.formatDate(lastMealAt(actor)), // ✅ Fetches last meal time from `hunger.js`
        hoursSinceLastMeal: this.formatHours(secondsSinceLastMeal(actor)), // ✅ Fetches elapsed time
        daysHungry: daysHungryForActor(actor), // ✅ Fetches hunger duration
        hunger: hungerLevel(actor) // ✅ Fetches hunger level description
      };
    });

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
