import registerSettings from "./lib/settings.js"; 
import FitTable from "./lib/fit-table.js";


/*-------------------------------------------------
System Hook Container
---------------------------------------------------*/
let systemHooks = {}; // Will be populated dynamically

/*-------------------------------------------------
Module Initialization
---------------------------------------------------*/
Hooks.once('init', async () => {
  console.log("fit | Initializing Fit module...");
  await registerSettings();

  const systemId = game.system.id;
  if (systemId === "dnd5e") {
    const dnd5e = await import("./lib/systems/dnd5e.js");
    systemHooks = {
      ...dnd5e
    };
  } else if (systemId === "pf2e") {
    const pf2e = await import("./lib/systems/pf2e.js");
    systemHooks = {
      ...pf2e
    };
  } else {
    ui.notifications.warn(`Fit | Unsupported system: ${systemId}`);
    return;
  }
});

/*-------------------------------------------------
Enable Hooks After World Loads
---------------------------------------------------*/
Hooks.once("ready", () => {
  if (!game.settings.get("fit", "enabled")) return;

  if (!systemHooks || Object.keys(systemHooks).length === 0) {
    ui.notifications.warn("Fit | No system hooks registered. Fit will not activate.");
    return;
  }

  setupHooks(); // Safe to proceed
});


/*-------------------------------------------------
Handle World Time Updates (Tracks Hunger Thirst & Rest)
---------------------------------------------------*/
async function handleWorldTimeUpdate(seconds, elapsed) {
  console.warn("Fit | handleWorldTimeUpdate is deprecated — logic is now inlined in updateWorldTime hook.");
  // This function is no longer used. All tracking now handled inline.
}



/*-------------------------------------------------
Setup Foundry Hooks
---------------------------------------------------*/
function setupHooks() {
  if (!game.settings.get("fit", "enabled")) return;

  // This assumes the tracking logic is already hooked above
  console.log("Fit | Foundry hooks enabled.");
}


/*-------------------------------------------------
Create new Player Characters
---------------------------------------------------*/
Hooks.on("createActor", async (actor) => {
  if (!game.settings.get("fit", "enabled")) return;
  if (actor.type !== "character") return;

  // ✅ Use systemHooks for multi-system compatibility
  if (systemHooks?.initializeHunger) await systemHooks.initializeHunger(actor);
  if (systemHooks?.initializeThirst) await systemHooks.initializeThirst(actor);
  if (systemHooks?.initializeRest) await systemHooks.initializeRest(actor);
  if (systemHooks?.trackRest) await systemHooks.trackRest(actor);
  if (systemHooks?.updateExhaustion) systemHooks.updateExhaustion(actor);
});


/*-------------------------------------------------
Token Event Handler
---------------------------------------------------*/
Hooks.on("preCreateToken", async (document, data, options) => {
  const actor = game.actors.get(document.actorId);
  if (!actor || !actor.hasPlayerOwner) return;

  const currentTime = game.time.worldTime;

  // ✅ Restore stored hunger state
  if (game.settings.get("fit", "hungerTracking")) {
    const elapsedHungerTime = actor.getFlag('fit', 'hungerElapsedTime') || 0;
    await actor.setFlag('fit', 'lastMealAt', currentTime - elapsedHungerTime);
    await actor.unsetFlag('fit', 'hungerElapsedTime');

    if (systemHooks?.trackHunger) {
      await systemHooks.trackHunger(actor);
    }
  }

  // ✅ Restore stored thirst state
  if (game.settings.get("fit", "thirstTracking")) {
    const elapsedThirstTime = actor.getFlag('fit', 'thirstElapsedTime') || 0;
    await actor.setFlag('fit', 'lastDrinkAt', currentTime - elapsedThirstTime);
    await actor.unsetFlag('fit', 'thirstElapsedTime');

    if (systemHooks?.trackThirst) {
      await systemHooks.trackThirst(actor);
    }
  }

  // ✅ Restore stored rest state
  if (game.settings.get("fit", "restTracking")) {
    const elapsedRestTime = actor.getFlag('fit', 'restElapsedTime') || 0;
    await actor.setFlag('fit', 'lastRestAt', currentTime - elapsedRestTime);
    await actor.unsetFlag('fit', 'restElapsedTime');

    if (systemHooks?.trackRest) {
      await systemHooks.trackRest(actor);
    }
  }
});

  
/*-------------------------------------------------
Token Deletion Event Handler
---------------------------------------------------*/   
Hooks.on('preDeleteToken', async (document) => {
  const actor = game.actors.get(document.actorId);
  if (!actor || !actor.hasPlayerOwner) return;

  const currentTime = game.time.worldTime;

  if (game.settings.get("fit", "hungerTracking")) {
    const lastMealAt = actor.getFlag('fit', 'lastMealAt') || currentTime;
    const elapsedHungerTime = currentTime - lastMealAt;
    await actor.setFlag('fit', 'hungerElapsedTime', elapsedHungerTime);
  }

  if (game.settings.get("fit", "thirstTracking")) {
    const lastDrinkAt = actor.getFlag('fit', 'lastDrinkAt') || currentTime;
    const elapsedThirstTime = currentTime - lastDrinkAt;
    await actor.setFlag('fit', 'thirstElapsedTime', elapsedThirstTime);
  }

  if (game.settings.get("fit", "restTracking")) {
    const lastRestAt = actor.getFlag('fit', 'lastRestAt') || currentTime;
    const elapsedRestTime = currentTime - lastRestAt;
    await actor.setFlag('fit', 'restElapsedTime', elapsedRestTime);
  }
});

    /*-------------------------------------------------
    Timed Evaluation of Hunger, Thirst & Rest
    ---------------------------------------------------*/
    let _sessionTime = 0;
    const EVAL_FREQUENCY = 30;

    Hooks.on('updateWorldTime', async (seconds, elapsed) => {
      if (!game.settings.get("fit", "enabled")) return;

      _sessionTime += elapsed;
      if (_sessionTime < EVAL_FREQUENCY) return;
      _sessionTime = 0;

      if (!game.scenes.active || !game.user.isGM) return;

      const activeTokens = game.scenes.active.tokens.map(token => token.actorId);
      const activeUsers = game.users.filter(user => user.active && !user.isGM);

      for (const actor of game.actors) {
        if (!actor.hasPlayerOwner || !activeTokens.includes(actor.id)) continue;

        const activeUser = activeUsers.find(user => actor.testUserPermission(user, "OWNER"));
        if (!activeUser && game.settings.get("fit", "skipMissingPlayers")) continue;

        if (systemHooks?.trackHunger && game.settings.get("fit", "hungerTracking")) {
          await systemHooks.trackHunger(actor);
        }

        if (systemHooks?.trackThirst && game.settings.get("fit", "thirstTracking")) {
          await systemHooks.trackThirst(actor);
        }

        if (systemHooks?.trackRest && game.settings.get("fit", "restTracking")) {
          await systemHooks.trackRest(actor);
        }

        const anyTrackingEnabled = game.settings.get("fit", "hungerTracking") ||
                                  game.settings.get("fit", "thirstTracking") ||
                                  game.settings.get("fit", "restTracking");

        if (anyTrackingEnabled && systemHooks?.evaluateNeeds) {
          await systemHooks.evaluateNeeds(actor);
        }

        if (systemHooks?.updateExhaustion) {
          systemHooks.updateExhaustion(actor);
        }
      }
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
Auto-patch Waterskin and Rations (delegated to systemHooks)
---------------------------------------------------*/
Hooks.once("ready", async () => {
  if (!game.settings.get("fit", "autoConfigureConsumables")) return;
  if (systemHooks?.autoPatchConsumables) {
    await systemHooks.autoPatchConsumables();
  }
});

/*=============================================
Add a Fitness Table to the Scene Controls
=============================================*/

// Add a button to the Scene Controls for toggling the Hunger Table
Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.settings.get("fit", "enabled")) return;
  if (!game.user.isGM) return; // ✅ Hide Fit Table button from non-GMs

  const tokenControls = controls.find((c) => c.name === "token");
  if (!tokenControls) {
    console.error("❌ Token Controls not found!");
    return;
  }

  tokenControls.tools.push({
    name: "fit-table",
    title: "Toggle Fit Table",
    icon: "fa-solid fa-person-running",
    toggle: true,
    css: "toggle",
    tooltip: "Toggle Fit Table",
    onClick: (isActive) => {
      const fitTable = game.modules.get("fit")?.api?.fitTable;
  
      if (!fitTable) {
        console.error("❌ Fit Table activation function not found.");
        return;
      }
  
      if (isActive) {
        fitTable.render(true);
      } else {
        const fitTableWindow = Object.values(ui.windows).find(
          (w) => w.options.title === "Fit Table"
        );
        if (fitTableWindow) fitTableWindow.close();
      }
    }
  });
    });
   
    Hooks.once("ready", () => {
      if (!game.modules.get("fit").api) game.modules.get("fit").api = {};
      game.modules.get("fit").api.fitTable = FitTable.activate(systemHooks);
    });