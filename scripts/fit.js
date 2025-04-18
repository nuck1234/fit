// Import necessary modules and constants
import registerSettings from "./lib/settings.js";
import { evaluateNeeds, updateExhaustion } from "./lib/systems/dnd5e.js";
import { trackHunger, initializeHunger } from "./lib/hunger.js";
import { trackThirst, initializeThirst } from "./lib/thirst.js";
import { trackRest, initializeRest } from "./lib/rested.js";

/*-------------------------------------------------
Module Initialization
---------------------------------------------------*/
Hooks.once('init', async () => {
  console.log("fit | Initializing module...");
  await registerSettings();

});

// ✅ Ensure module hooks only run when the system is enabled
Hooks.once("ready", () => {
  //console.log("fit | System Ready");

  if (!game.settings.get("fit", "enabled")) return;

  setupHooks(); // ✅ Ensures hooks are only set when safe

  });
/*-------------------------------------------------
Handle World Time Updates (Tracks Hunger Thirst & Rest)
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

    if (game.settings.get("fit", "thirstTracking")) {
      await trackThirst(actor);
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
    return;
  }

  Hooks.on('updateWorldTime', handleWorldTimeUpdate);
}

/*-------------------------------------------------
Create new Player Characters
---------------------------------------------------*/
Hooks.on("createActor", async (actor) => {
  if (!game.settings.get("fit", "enabled")) return;
  if (actor.type !== "character") return; // ✅ Only apply to player characters

  //console.log(`✅ New character created: ${actor.name} - Initializing Hunger Thirst & Rest`);

  // ✅ Set up hunger and rest when the actor is first created
  await initializeHunger(actor);
  await initializeThirst(actor);
  await initializeRest(actor);

  await trackRest(actor);  // ✅ Keeps Rest Tracking Working
  updateExhaustion(actor);
});


/*-------------------------------------------------
Token Event Handler
---------------------------------------------------*/
    Hooks.on("preCreateToken", async (document, data, options) => {
      const actor = game.actors.get(document.actorId);
      if (!actor || !actor.hasPlayerOwner) return;

      const currentTime = game.time.worldTime;
      //console.log(`✅ Token created for ${actor.name} - Restoring Hunger & Rest Tracking`);

      // ✅ Restore stored hunger state
      if (game.settings.get("fit", "hungerTracking")) {
          const elapsedHungerTime = actor.getFlag('fit', 'hungerElapsedTime') || 0;
          await actor.setFlag('fit', 'lastMealAt', currentTime - elapsedHungerTime);
          await actor.unsetFlag('fit', 'hungerElapsedTime');

          //console.log(`${actor.name} - 🍽️ Restored lastMealAt to: ${currentTime - elapsedHungerTime}`);

          // ✅ Apply tracking function to ensure hunger updates
          await trackHunger(actor);
      }

      // ✅ Restore stored thirst state
      if (game.settings.get("fit", "thirstTracking")) {
        const elapsedThirstTime = actor.getFlag('fit', 'thirstElapsedTime') || 0;
        await actor.setFlag('fit', 'lastDrinkAt', currentTime - elapsedThirstTime);
        await actor.unsetFlag('fit', 'thirstElapsedTime');

        //console.log(`${actor.name} - 🍽️ Restored lastDrinkAt to: ${currentTime - elapsedThirstTime}`);

        // ✅ Apply tracking function to ensure thirst updates
        await trackThirst(actor);
    }

      // ✅ Restore stored rest state
      if (game.settings.get("fit", "restTracking")) {
          const elapsedRestTime = actor.getFlag('fit', 'restElapsedTime') || 0;
          await actor.setFlag('fit', 'lastRestAt', currentTime - elapsedRestTime);
          await actor.unsetFlag('fit', 'restElapsedTime');

          //console.log(`${actor.name} - 💤 Restored lastRestAt to: ${currentTime - elapsedRestTime}`);

          // ✅ Apply tracking function to ensure rest updates
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
  //console.log(`🛑 Token deleted for ${actor.name} - Storing Off-Canvas Data`);

  // ✅ Store elapsed hunger time (same logic as rest)
  if (game.settings.get("fit", "hungerTracking")) {
    const lastMealAt = actor.getFlag('fit', 'lastMealAt') || currentTime;
    const elapsedHungerTime = currentTime - lastMealAt;
    await actor.setFlag('fit', 'hungerElapsedTime', elapsedHungerTime);
    
    //console.log(`${actor.name} - 🍽️ Stored hunger elapsed time: ${elapsedHungerTime} seconds`);
  }

  // ✅ Store elapsed thirst time (same logic as rest)
  if (game.settings.get("fit", "thirstTracking")) {
    const lastDrinkAt = actor.getFlag('fit', 'lastDrinkAt') || currentTime;
    const elapsedThirstTime = currentTime - lastDrinkAt;
    await actor.setFlag('fit', 'thirstElapsedTime', elapsedThirstTime);
    
    //console.log(`${actor.name} - 🍽️ Stored thirst elapsed time: ${elapsedThirstTime} seconds`);
  }  

  // ✅ Store elapsed rest time
  if (game.settings.get("fit", "restTracking")) {
    const lastRestAt = actor.getFlag('fit', 'lastRestAt') || currentTime;
    const elapsedRestTime = currentTime - lastRestAt;
    await actor.setFlag('fit', 'restElapsedTime', elapsedRestTime);
    
   // console.log(`${actor.name} - 💤 Stored rest elapsed time: ${elapsedRestTime} seconds`);
  }
});
    
    //Set update to 30 seconds
    let _sessionTime = 0;
    const EVAL_FREQUENCY = 30;
    
    // Hook to evaluate hunger, thirst and rest periodically
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

        // ✅ Track Hunger if enabled
        if (game.settings.get("fit", "hungerTracking")) {
            await trackHunger(actor);
        }

        // ✅ Track Thirst if enabled
        if (game.settings.get("fit", "thirstTracking")) {
            await trackThirst(actor);
        }

        // ✅ Track Rest if enabled
        if (game.settings.get("fit", "restTracking")) {
            trackRest(actor);
        }

        // ✅ Always evaluate needs if either Hunger OR Thirst is enabled
        if (game.settings.get("fit", "hungerTracking") || game.settings.get("fit", "thirstTracking")|| game.settings.get("fit", "restTracking")) {
            await evaluateNeeds(actor);
            updateExhaustion(actor);
        }
    });
});

    /*-------------------------------------------------
    Auto-configure Consumables
    ---------------------------------------------------*/

    // ✅ Register Fit setting to auto-configure consumables
    Hooks.once("init", () => {
      game.settings.register("fit", "autoConfigureConsumables", {
        name: "Auto-configure consumables",
        hint: "Automatically set activation and consumption data on Rations and Waterskins when used.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
      });
    });
    
    /*-------------------------------------------------
    Auto-patch Waterskin and Rations
    ---------------------------------------------------*/
    // ✅ Auto-patch Waterskin and Rations to ensure item.use() works (Argon compatible)
    Hooks.once("ready", async () => {
      if (!game.settings.get("fit", "autoConfigureConsumables")) return;

      const rationName = game.settings.get("fit", "rationName")?.toLowerCase();
      const waterName = game.settings.get("fit", "waterName")?.toLowerCase();
    
      for (const actor of game.actors.contents) {
        for (const item of actor.items.contents) {
          const itemName = item.name.toLowerCase();
          if (![rationName, waterName].includes(itemName)) continue;
    
          const consumptionTarget = item.id;
          const useActivity = item.system.activities?.use ?? null;
    
          const needsPatch = !useActivity ||
                             !useActivity.type ||
                             item.system.consumption?.target !== consumptionTarget;
    
          if (!needsPatch) continue;
    
          //console.log(`[fit] Auto-patching ${item.name} on ${actor.name}`);
    
          await item.update({
            "system.activation.type": "action",
            "system.consumption.type": consumptionType,
            "system.consumption.amount": 1,
            "system.consumption.target": consumptionTarget,
            "system.consume": {
              "type": "charges",
              "amount": 1
            },
            "system.activities.use": {
              "activation": { "type": "action", "cost": 1 },
              "consumption": {
                "type": consumptionType,
                "amount": 1,
                "target": consumptionTarget
              }
            }
          });
    
          //if (game.user.isGM) {
           // ui.notifications.info(`[fit] ${item.name} was auto-configured for ${actor.name}.`);
         // }
        }
      }
    
      // 🪝 Also patch items when they're used (for late-added actors)
      Hooks.on("preUseItem", async (item, config, options) => {
        const actor = item.actor;
        if (!actor) return;
    
        const itemName = item.name.toLowerCase();
        if (![rationName, waterName].includes(itemName)) return;
    
        const consumptionTarget = item.id;
        const consumptionType = "itemUses";
    
        const needsPatch = !item.system.activation?.type ||
                           item.system.consumption?.target !== consumptionTarget ||
                           !item.system.activities?.use;
    
        if (!needsPatch) return;
    
        //console.log(`[fit] Auto-patching ${item.name} to support proper consumption and activity usage.`);
    
        await item.update({
          "system.activation.type": "action",
          "system.consumption.type": consumptionType,
          "system.consumption.amount": 1,
          "system.consumption.target": consumptionTarget,
          "system.consume": {
            "type": "charges",
            "amount": 1
          },
          "system.activities.use": {
            "activation": { "type": "action", "cost": 1 },
            "consumption": {
              "type": consumptionType,
              "amount": 1,
              "target": consumptionTarget
            }
          }
        });
    
        if (game.user.isGM) {
          ui.notifications.info(`[fit] ${item.name} was auto-configured for usage.`);
        }
      });
    });
    
    
