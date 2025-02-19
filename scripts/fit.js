// Import necessary modules and constants
import registerSettings from "./lib/settings.js";
import { DAY } from "./lib/constants.js";
import { consumeFood, initializeHunger, updateHunger, unsetHunger, hungerLevel, hungerIcon, hungerIndex } from "./lib/hunger.js";
import { preloadTemplates } from './lib/preloadTemplates.js';
import HungerTable from './lib/hunger-table.js';
import { evaluateHunger } from './lib/systems/dnd5e.js';
import { trackExhaustion } from "./lib/rested.js";

// A no-operation system class for unsupported game systems
class NoOpSystem {
  async evaluateHunger(actor) {
    return;
  }
}

Hooks.once('init', async () => {
  console.log("fit module initializing...");

  // ✅ Initialize the module without system
  game.fit = new fit();
  game.fit.init();
});

Hooks.once('ready', async () => {
  console.log("fit module ready!");

  // Ensure hunger utilities are exposed via the module's API
 game.modules.get('fit').api = {
    hungerLevel: (actor) => {
        console.log("🛠 API Call: hungerLevel received", actor);
        return hungerLevel(actor);
    },
    hungerIcon: (actor) => {
        console.log("🛠 API Call: hungerIcon received", actor);
        return hungerIcon(actor);
    },
    hungerIndex: (actor) => {
        console.log("🛠 API Call: hungerIndex received", actor);
        return hungerIndex(actor);
    }
  };

  console.log("fit API initialized:", game.modules.get('fit').api);
});

class fit {
  constructor() {
    console.log("fit module initialized.");
  }

  async init() {
    console.log("fit | Initialized");

    // Register module settings and preload templates
    await registerSettings();
    await preloadTemplates();

    // Setup hooks if the module is enabled in the settings
    if (game.settings.get('fit', 'enabled')) {
      this.setupHooks();
    }
  }

  setupHooks() {
    console.log("fit | Setup");

    // Hook to initialize hunger for actors in the active scene
    Hooks.on('ready', () => {
      this.initializeScene();
    });

    // Hook to handle token creation events
    Hooks.on('preCreateToken', async (document, data, options) => {
      const actor = game.actors.get(document.actorId);
      if (typeof actor === "undefined") return;
      if (!game.user.isGM) return;
      if (!actor.getFlag('fit', 'lastMealAt')) {
        await initializeHunger(actor);
      }
    });

    // Hook to handle token deletion events
    Hooks.on('preDeleteToken', async (document, data) => {
      const actor = game.actors.get(document.actorId);
      // Placeholder for clearing hunger timer logic - this.clearHungerTimer(actor)
    });

    let _sessionTime = 0;
    const EVAL_FREQUENCY = 30;

    // Hook to evaluate hunger periodically based on elapsed world time
    Hooks.on('updateWorldTime', async (seconds, elapsed) => {
      console.log('updateWorldTime triggered:', { seconds, elapsed });
      _sessionTime += elapsed;
      if (_sessionTime < EVAL_FREQUENCY) return;
      _sessionTime = 0;

      if (!game.scenes.active) return;
      if (!game.user.isGM) return;

      const activeUsers = game.users.filter(user => user.active && !user.isGM);

      game.scenes.active.tokens.forEach(async token => {
        const actor = game.actors.get(token.actorId);
        // We want to skip non-actors and non-player controlled characters
        if (typeof actor === 'undefined') return;
        if (!actor.hasPlayerOwner) return;

        // We want to reset hunger in these two circumstances
        // We skipped backwards by more than 5m
        if (elapsed < -300) {
          await initializeHunger(actor);
          return;
        }

        // We also want to skip any player who is not logged in if skipMissingPlayers is on
        let activeUser;
        activeUser = activeUsers.find(user => actor.testUserPermission(user, "OWNER"));
        if (!activeUser && game.settings.get('fit', 'skipMissingPlayers')) return;

        await updateHunger(actor, elapsed);

        await evaluateHunger(actor); // ✅ Now calls the standalone function
        trackExhaustion(actor);
      });
    });

    // Hook to handle item updates related to rations
    Hooks.on('preUpdateItem', async (item, change) => {
  
      if (change.hasOwnProperty('sort')) return; // Ignore reordering

      // Check if the item's name matches the configured ration name
      if (game.settings.get('fit', 'rationName') === item.name) {
        
      // Retrieve the actor associated with the item
        const actor = game.actors.get(item.actor.id);

       // If the actor is not found, log an error and stop further processing
      if (!actor) {
          console.error("Actor not found for item:", item);
          return;
        }
          // Determine if the item was consumed based on its uses or quantity
        const consumedUses = item.system.uses?.value !== undefined && change.system.uses?.value === item.system.uses.value - 1;
        const consumedQuantity = item.system.quantity !== undefined && change.system.quantity === item.system.quantity - 1;
      
         // If the item was consumed (uses or quantity decreased), handle food consumption
        if (consumedUses || consumedQuantity) {
          console.log(`${actor.name} consumed a ration directly from inventory.`);

         // Centralized logic: Call the consumeFood function to handle hunger updates
          await consumeFood(actor); // Centralizes hunger effect removal and flag resets
        }
      }
      
    });

// Hook to handle custom chat interactions
     Hooks.on('renderChatLog', async (app, html, data) => {
      html.on('click', "button[data-action='consumeFood']", async (event) => {
        event.preventDefault();

        const actorId = event.target.dataset.actorId;
        const itemId = event.target.dataset.itemId;

        const actor = game.actors.get(actorId);
        const item = actor?.items.get(itemId);

        if (!actor || !item) {
          ui.notifications.error("Actor or item not found.");
          return;
        }

        const quantity = item.system.quantity || 0;
        if (quantity <= 0) {
          ui.notifications.warn(`${actor.name} has no ${item.name} left to consume.`);
          return;
        }

        // Consume one ration
        await item.update({ "system.quantity": quantity - 1 });
        await actor.setFlag('fit', 'lastMealAt', game.time.worldTime);

        ChatMessage.create({ content: `${actor.name} consumes a ration. Hunger has been reset.` });
        ui.notifications.info(`${actor.name} has consumed a ration. Remaining: ${quantity - 1}`);
      });
    });
  }

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
   // console.log("Activating Hunger Table via button with system:", this.system);
    HungerTable.activate(this.system);
  }

  async resetHunger(actor) {
    // Reset hunger state for the specified actor
    await unsetHunger(actor);
    await initializeHunger(actor);
    Hooks.call("resetHunger", actor);
  }
}

// Add a button to the Scene Controls for toggling the Hunger Table
Hooks.on("getSceneControlButtons", (controls) => {
 // console.log("Scene Controls BEFORE addition:", controls);

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
    //    console.log("Hunger Table toggled ON");
        if (typeof game.fit?.showHungerTable === "function") {
          game.fit.showHungerTable(); // Show the Hunger Table
        } else {
          console.error("Hunger Table activation function not found.");
        }
      } else {
  //      console.log("Hunger Table toggled OFF");
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

 // console.log("Scene Controls AFTER addition:", controls);
});