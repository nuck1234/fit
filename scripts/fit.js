// Import necessary modules and constants
import registerSettings from "./lib/settings.js";
import { initializeHunger, updateHunger, unsetHunger } from "./lib/hunger.js";
import { preloadTemplates } from './lib/preloadTemplates.js';
import HungerTable from './lib/hunger-table.js';
import { evaluateHunger } from './lib/systems/dnd5e.js';
import { trackRest } from "./lib/rested.js";

// A no-operation system class for unsupported game systems
class NoOpSystem {
  async evaluateHunger(actor) {
    return;
  }
}

class fit {
  constructor() {
    console.log("fit module initialized.");
  }

  async init() {
    console.log("fit | Initialized");

     // ✅ Ensure settings are registered before using them
     await registerSettings();
    
    // Check if fit is enabled and if so register module settings
    if (!game.settings.get("fit", "enabled")) {
      console.log("fit | FIT system is disabled. Skipping initialization.");
      return;
  }
    // Register module settings and preload templates
    await preloadTemplates();
    // Setup hooks if the module is enabled in the settings
    this.setupHooks();
    }
  

  setupHooks() {
    console.log("fit | Setup");

    // Check if fit is enabled and if so Hook to initialize hunger for actors in the active scene
    if (!game.settings.get("fit", "enabled")) {
      console.log("fit | Hooks disabled.");
      return;
  }
    console.log("fit | Setup"); 
    
    Hooks.on('ready', () => {
    this.initializeScene();
    });

    // Hook to handle token creation events
    Hooks.on('preCreateToken', async (document, data, options) => {
      const actor = game.actors.get(document.actorId);
      if (!actor || !actor.hasPlayerOwner) return;
    
      // ✅ Retrieve stored hunger state
      const elapsedHungerTime = actor.getFlag('fit', 'hungerElapsedTime') || 0;
      const currentTime = game.time.worldTime;
      await actor.setFlag('fit', 'lastMealAt', currentTime - elapsedHungerTime);
      await actor.setFlag('fit', 'secondsSinceLastMeal', elapsedHungerTime);
      await actor.unsetFlag('fit', 'hungerElapsedTime');
    
      // ✅ Retrieve stored rest state
      const elapsedRestTime = actor.getFlag('fit', 'restElapsedTime') || 0;
      await actor.setFlag('fit', 'lastRestAt', currentTime - elapsedRestTime);
      await actor.unsetFlag('fit', 'restElapsedTime');
    
    });
    

    Hooks.on('preDeleteToken', async (document, data) => {
      const actor = game.actors.get(document.actorId);
      if (!actor || !actor.hasPlayerOwner) return;
    
      // ✅ Capture elapsed hunger time
      const lastMealAt = actor.getFlag('fit', 'lastMealAt') || game.time.worldTime;
      const elapsedHungerTime = game.time.worldTime - lastMealAt;
      await actor.setFlag('fit', 'hungerElapsedTime', elapsedHungerTime);
    
      // ✅ Capture elapsed rest time
      const lastRestAt = actor.getFlag('fit', 'lastRestAt') || game.time.worldTime;
      const elapsedRestTime = game.time.worldTime - lastRestAt;
      await actor.setFlag('fit', 'restElapsedTime', elapsedRestTime);
    
      // ✅ Store restLevel
      const restLevel = actor.getFlag('fit', 'restLevel') || 0;
      await actor.setFlag('fit', 'storedrestLevel', restLevel);
    
  
    });
    

    let _sessionTime = 0;
    const EVAL_FREQUENCY = 30;

    // Hook to evaluate hunger periodically based on elapsed world time
    Hooks.on('updateWorldTime', async (seconds, elapsed) => {
      // Check if fit is enabled and if so carry on 
      if (!game.settings.get("fit", "enabled")) return;

      console.log('updateWorldTime triggered:', { seconds, elapsed });
      _sessionTime += elapsed;
      if (_sessionTime < EVAL_FREQUENCY) return;
      _sessionTime = 0;
    
      if (!game.scenes.active) return;
      if (!game.user.isGM) return;
    
      const activeUsers = game.users.filter(user => user.active && !user.isGM);
      const activeTokens = game.scenes.active.tokens.map(token => token.actorId);
    
      game.actors.forEach(async actor => {
        if (!actor.hasPlayerOwner) return;
        if (!activeTokens.includes(actor.id)) return; // ✅ Skip actors NOT in the active scene
    
        if (elapsed < -300) {
          await initializeHunger(actor);
          return;
        }
    
        let activeUser = activeUsers.find(user => actor.testUserPermission(user, "OWNER"));
        if (!activeUser && game.settings.get('fit', 'skipMissingPlayers')) return;
    
        if (game.settings.get("fit", "hungerTracking")) { // ✅ Only updates hunger if enabled
        await updateHunger(actor, elapsed);
        await evaluateHunger(actor);

        }
        
        if (game.settings.get("fit", "restTracking")) { // ✅ Only updates rest if enabled
        trackRest(actor); // ✅ Now only updates rest if the PC is in the active scene
        }
      });
    });

    
  }
// Initialize hunger for all actors in the active scene
  initializeScene() {
    console.log("fit | Initializing Scene");
    if (!game.scenes.active) return;
    game.scenes.active.tokens.forEach(async (token) => {
      const actor = game.actors.get(token.actorId);
      if (typeof actor === "undefined") return;
      if (!actor.hasPlayerOwner) return;
      if (!game.user.isGM) return;
      if (!actor.getFlag('fit', 'lastMealAt')) {
        await initializeHunger(actor);
      }
    });
  }

  showHungerTable() {
    // Display the hunger table for the GM via button, not automatic hooks
   
    HungerTable.activate(this.system);
  }

  async resetHunger(actor) {
    // Reset hunger state for the specified actor
    await unsetHunger(actor);
    await initializeHunger(actor);
    Hooks.call("resetHunger", actor);
  }
}

Hooks.once('init', async () => {
  console.log("fit module initializing...");

  // ✅ Initialize the module without system
  game.fit = new fit();
  game.fit.init();
});

Hooks.once('ready', async () => {

});

// Add a button to the Scene Controls for toggling the Hunger Table
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "hungerTracking")) return; // ✅ Stops hunger if disabled


  // Find the Token Controls group
  const tokenControls = controls.find((c) => c.name === "token");
  if (!tokenControls) {
    console.error("Token Controls not found!");
    return;
  }

  // Add the "Hunger Table" button
  tokenControls.tools.push({
    name: "hunger-table",
    title: "Toggle Hunger Table", // Title displayed when hovering over the button
    icon: "fa-solid fa-utensils", // FontAwesome icon representing food
    toggle: true, // Makes the button a toggle
    css: "toggle", // Styling for toggle buttons
    tooltip: "Toggle Hunger Table", // Tooltip description
    onClick: (isActive) => {
      if (isActive) {

    //Hunger Table toggled ON
        if (typeof game.fit?.showHungerTable === "function") {
          game.fit.showHungerTable(); // Show the Hunger Table
        } else {
          console.error("Hunger Table activation function not found.");
        }
      } else {

  //Hunger Table toggled OFF
        if (ui.windows) {
          const hungerTableWindow = Object.values(ui.windows).find(
            (w) => w.options.title === "Hunger Table"
          );
          if (hungerTableWindow) {
            hungerTableWindow.close(); // Close the Hunger Table
          } else {
            console.warn("Hunger Table window not found to close.");
          }
        }
      }
    },
  });


});