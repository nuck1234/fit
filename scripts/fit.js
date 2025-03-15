// Import necessary modules and constants
import registerSettings from "./lib/settings.js";
import { trackHunger } from "./lib/hunger.js";
import { preloadTemplates } from './lib/preloadTemplates.js';
import HungerTable from './lib/hunger-table.js';
import { evaluateHunger } from './lib/systems/dnd5e.js';
import { trackRest } from "./lib/rested.js";

/*-------------------------------------------------
Module Initialization
---------------------------------------------------*/
Hooks.once('init', async () => {
  console.log("fit | Initializing module...");
  await registerSettings();
  await preloadTemplates();
});

// ✅ Ensure module hooks only run when the system is enabled
Hooks.once("ready", () => {
  console.log("fit | System Ready");

  if (!game.settings.get("fit", "enabled")) return;

  setupHooks(); // ✅ Ensures hooks are only set when safe

  // ✅ Ensure HungerTable is registered
  const fitModule = game.modules.get("fit");
  if (fitModule) {
    fitModule.api = fitModule.api || {};
    fitModule.api.hungerTable = new HungerTable(); // ✅ Properly registers the hunger table
   
  }
});
/*-------------------------------------------------
Handle World Time Updates (Tracks Hunger & Rest)
---------------------------------------------------*/
async function handleWorldTimeUpdate(seconds, elapsed) {
  if (!game.settings.get("fit", "enabled")) return;

  console.log('updateWorldTime triggered:', { seconds, elapsed });

  if (!game.scenes.active || !game.user.isGM) return;

  const activeTokens = game.scenes.active.tokens.map(token => token.actorId);
  const activeUsers = game.users.filter(user => user.active && !user.isGM);

  game.actors.forEach(async actor => {
    if (!actor.hasPlayerOwner || !activeTokens.includes(actor.id)) return;

    const activeUser = activeUsers.find(user => actor.testUserPermission(user, "OWNER"));
    if (!activeUser && game.settings.get('fit', 'skipMissingPlayers')) return;

    if (game.settings.get("fit", "hungerTracking")) {
      await trackHunger(actor);
    }

    if (game.settings.get("fit", "restTracking")) {
      trackRest(actor);
    }
  });
}


/*-------------------------------------------------
Setup Foundry Hooks
---------------------------------------------------*/
function setupHooks() {
 
  if (!game.settings.get("fit", "enabled")) {
    console.log("fit | Hooks disabled.");
    return;
  }

  Hooks.on('updateWorldTime', handleWorldTimeUpdate);
}
/*-------------------------------------------------
Token Creation Event Handler
---------------------------------------------------*/
      Hooks.on('preCreateToken', async (document, data, options) => {
      const actor = game.actors.get(document.actorId);
      if (!actor || !actor.hasPlayerOwner) return;
    
      // ✅ Retrieve stored hunger state
      if (game.settings.get("fit", "hungerTracking")) {
        const elapsedHungerTime = actor.getFlag('fit', 'hungerElapsedTime') || 0;
        await actor.setFlag('fit', 'lastMealAt', currentTime - elapsedHungerTime);
        await actor.unsetFlag('fit', 'hungerElapsedTime');
    
        // ✅ Apply tracking function instead of manual flag setting
        await trackHunger(actor);
      }
    
      // ✅ Retrieve stored rest state
      if (game.settings.get("fit", "restTracking")) {
        const elapsedRestTime = actor.getFlag('fit', 'restElapsedTime') || 0;
        await actor.setFlag('fit', 'lastRestAt', currentTime - elapsedRestTime);
        await actor.unsetFlag('fit', 'restElapsedTime');
    
        // ✅ Apply tracking function instead of manual flag setting
        await trackRest(actor);
      }
    });
  
 /*-------------------------------------------------
Token Deletion Event Handler
---------------------------------------------------*/   
Hooks.on('preDeleteToken', async (document) => {
  const actor = game.actors.get(document.actorId);
  if (!actor || !actor.hasPlayerOwner) return;

  const currentTime = game.time.worldTime;

  // ✅ Store hunger time if hunger tracking is enabled
  if (game.settings.get("fit", "hungerTracking")) {
    const lastMealAt = actor.getFlag('fit', 'lastMealAt') || currentTime;
    const elapsedHungerTime = currentTime - lastMealAt;
    await actor.setFlag('fit', 'hungerElapsedTime', elapsedHungerTime);
  }

  // ✅ Store rest time if rest tracking is enabled
  if (game.settings.get("fit", "restTracking")) {
    const lastRestAt = actor.getFlag('fit', 'lastRestAt') || currentTime;
    const elapsedRestTime = currentTime - lastRestAt;
    await actor.setFlag('fit', 'restElapsedTime', elapsedRestTime);

    // ✅ Store restLevel for restoration later
    const restLevel = actor.getFlag('fit', 'restLevel') || 0;
    await actor.setFlag('fit', 'storedrestLevel', restLevel);
  }
});
    
    //Set update to 30 seconds
    let _sessionTime = 0;
    const EVAL_FREQUENCY = 30;
    
    // Hook to evaluate hunger and rest periodically
    Hooks.on('updateWorldTime', async (seconds, elapsed) => {
      if (!game.settings.get("fit", "enabled")) return;
    
   
      _sessionTime += elapsed;
      if (_sessionTime < EVAL_FREQUENCY) return;
      _sessionTime = 0;
    
      if (!game.scenes.active || !game.user.isGM) return;
    
      const activeTokens = game.scenes.active.tokens.map(token => token.actorId);
      const activeUsers = game.users.filter(user => user.active && !user.isGM);
    
      game.actors.forEach(async actor => {
        if (!actor.hasPlayerOwner || !activeTokens.includes(actor.id)) return; // ✅ Only evaluate active scene actors
    
        // ✅ Restore `skipMissingPlayers` check
        const activeUser = activeUsers.find(user => actor.testUserPermission(user, "OWNER"));
        if (!activeUser && game.settings.get('fit', 'skipMissingPlayers')) return; // ✅ Skip missing players
    
        // ✅ Use trackHunger() and trackRest() instead of manual updates and also trigger evaluateHunger()to send chat messages
        if (game.settings.get("fit", "hungerTracking")) {
          await trackHunger(actor);
        
        // ✅ Required to send a chat message when hunger is increased.
          await evaluateHunger(actor);
        }
    
        if (game.settings.get("fit", "restTracking")) {
          trackRest(actor);
        }
      });
    });

  // Add a button to the Scene Controls for toggling the Hunger Table
  Hooks.on("getSceneControlButtons", (controls) => {
    if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "hungerTracking")) return;
  
    const tokenControls = controls.find((c) => c.name === "token");
    if (!tokenControls) {
      console.error("❌ Token Controls not found!");
      return;
    }
  
    tokenControls.tools.push({
      name: "hunger-table",
      title: "Toggle Hunger Table",
      icon: "fa-solid fa-utensils",
      toggle: true,
      css: "toggle",
      tooltip: "Toggle Hunger Table",
      onClick: (isActive) => {
        const hungerTable = game.modules.get("fit")?.api?.hungerTable;
        
  
        if (!hungerTable) {
          console.error("❌ Hunger Table activation function not found.");
          return;
        }
  
        if (isActive) {
          hungerTable.render(true);
        } else {
          const hungerTableWindow = Object.values(ui.windows).find(
            (w) => w.options.title === "Hunger Table"
          );
          if (hungerTableWindow) {
            hungerTableWindow.close();
          } else {
            console.warn("⚠️ Hunger Table window not found to close.");
          }
        }
      },
    });
  });
  