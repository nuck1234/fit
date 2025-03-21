// Import necessary constants from the constants.js file
import { DEFAULT_HUNGER_LEVEL, HUNGER_LEVELS, HUNGER_ICONS } from './constants.js'
import { daysFromSeconds } from './time.js';
import { updateExhaustion } from "./systems/dnd5e.js";

/*-------------------------------------------------
Initialise for Chat Message
---------------------------------------------------*/
export const initializeHunger = async (actor) => {
  const now = game.time.worldTime;
  await Promise.all([
    actor.setFlag('fit', 'secondsSinceLastMeal', 0),
    actor.setFlag('fit', 'lastMealAt', now),
    actor.setFlag('fit', 'lastMealNotificationAt', now), // ✅ Restored lastMealNotificationAt
      ]);
  Hooks.call('initializeHunger', actor);
};

/*-------------------------------------------------
Helper function to calculate daysHungryForActor.
----------------------------------------------------*/
export const daysHungryForActor = (actor) => {
  if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "hungerTracking")) return 0; // ✅ Stops hunger if disabled

  const baseTolerance = game.settings.get('fit', 'baseTolerance') || 0;
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  let elapsedTime;
  if (!tokenInScene) {
    // ✅ If PC is off-canvas, use the frozen hunger time
    elapsedTime = actor.getFlag('fit', 'hungerElapsedTime') || 0;

  } else {
    // ✅ If PC is on-canvas, calculate hunger normally
    const lastMealAt = actor.getFlag('fit', 'lastMealAt') || game.time.worldTime;
    elapsedTime = game.time.worldTime - lastMealAt;
  }

  let daysSinceLastMeal = daysFromSeconds(elapsedTime);
  
  // ✅ Apply Constitution Modifier
  let conMod = actor.system?.abilities?.con?.mod ?? 0;

  // ✅ Apply Base Tolerance before capping
  let adjustedDays = Math.max(daysSinceLastMeal - conMod - baseTolerance, 0);

  // ✅ Cap at 6 (max limit)
  return Math.min(adjustedDays, 6);
};
/*--------------------------------------------------------------------
 Function to calculate the hungerIndex based on daysHungryForActor.
 -------------------------------------------------------------------*/
 export const hungerIndex = (actor) => {
  if (!actor || typeof actor !== "object") {
    return 0;
  }
  const daysHungry = daysHungryForActor(actor);
  return Math.min(DEFAULT_HUNGER_LEVEL + daysHungry, HUNGER_LEVELS.length - 1);
};

/*--------------------------------------------------------------------
 Function to calculate the hungerLevel (in words) based on hungerIndex.
 ---------------------------------------------------------------------*/
  export const hungerLevel = (actor) => {
    const level = HUNGER_LEVELS[hungerIndex(actor)] || "unknown";
    return game.i18n.localize(`${level}`);// added for chat issue
};

/*--------------------------------------------------------------------
  Function to be used for hunger tracking
 ---------------------------------------------------------------------*/
export const trackHunger = async (actor, elapsed) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  // ✅ Step 1: Check if the token is in the scene

  if (!tokenInScene) {
    // ✅ Step 2: Check if hunger is already frozen
    if (actor.getFlag('fit', 'hungerElapsedTime')) return; // ✅ Prevent multiple saves
    const hungerLevel = actor.getFlag('fit', 'hungerLevel') || 0;
    await actor.setFlag('fit', 'hungerElapsedTime', hungerLevel);
    return;
}

  // ✅ If the PC is back on canvas, restore hunger
  if (actor.getFlag('fit', 'hungerElapsedTime')) {
    const storedHunger = actor.getFlag('fit', 'hungerElapsedTime');
    await actor.setFlag('fit', 'hungerLevel', storedHunger);
    await actor.unsetFlag('fit', 'hungerElapsedTime');
}

const daysHungry = daysHungryForActor(actor);


let hungerLevel = Math.max(0, Math.floor(daysHungry)); // ✅ No additional baseRest needed

// ✅ Store hunger level as a flag (DO NOT update exhaustion here)
await actor.setFlag("fit", "hungerLevel", hungerLevel);

// ✅ Call the exhaustion update in dnd5e.js instead
Hooks.call('updateExhaustionEffect', actor, hungerLevel);
};

/*--------------------------------------------------------------------
 Function to update the last meal time for an actor
 ---------------------------------------------------------------------*/
 export const setLastMealTime = async (actor) => {
  if (!actor) {
    return;
  }
  const now = game.time.worldTime;

  await actor.setFlag('fit', 'lastMealAt', now);
};

/*-------------------------------------------------
Ensure API functions are registered under fit module
---------------------------------------------------*/
Hooks.once("ready", () => {
  const fitModule = game.modules.get("fit");
  if (fitModule) {
    fitModule.api = fitModule.api || {};
    Object.assign(fitModule.api, {
      resetHungerAfterMeal: resetHungerAfterMeal // ✅ Calls function directly
    });
  }
});

/*--------------------------------------------------------------------
 Function to reset hunger after consuming food
 ---------------------------------------------------------------------*/
export async function resetHungerAfterMeal(actor) {
  if (!actor) return;

  await setLastMealTime(actor); // ✅ Reset last meal time only

  // ✅ Instead of updating exhaustion directly, call the Hook so dnd5e.js handles it
  Hooks.call("updateExhaustionEffect", actor);
}

/*--------------------------------------------------------------------
 Function to get last meal time
 ---------------------------------------------------------------------*/
export const lastMealAt = (actor) => {
  if (!actor) return 0;
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);
  
  if (!tokenInScene) {
      // ✅ If off-canvas, simulate last meal using stored hungerElapsedTime
      const elapsedHungerTime = actor.getFlag('fit', 'hungerElapsedTime') || 0;
      return game.time.worldTime - elapsedHungerTime;
  } else {
      // ✅ If on-canvas, use lastMealAt directly
      return actor.getFlag('fit', 'lastMealAt') || game.time.worldTime;
  }
};

/*--------------------------------------------------------------------
 Hunger Effects (If Enabled)
 ---------------------------------------------------------------------*/
export const activeHungerEffectsFor = (actor) => {
  return actor.effects.filter(effect => effect.flags['fit'] && effect.flags['fit']['effect'] === 'hunger');
};

export const addOrUpdateHungerEffect = async (actor, activeEffectConfig) => {
  await removeHungerEffects(actor);

  let effect = await actor.createEmbeddedDocuments("ActiveEffect", [activeEffectConfig]);
  await actor.setFlag('fit', 'hungerActiveEffect', effect[0].id);

  Hooks.call('addOrUpdateHungerEffect', actor, effect);
};

/*--------------------------------------------------------------------
 Function to consume food (Reset hunger & effects)
 ---------------------------------------------------------------------*/
export const consumeFood = async (actor) => {
  await removeHungerEffects(actor);
  await resetHungerAfterMeal(actor); // ✅ Now matches rest

  Hooks.call('consumeFood', actor);

    // ✅ Ensure exhaustion recalculates after eating
    updateExhaustion(actor);
};

/*--------------------------------------------------------------------
 Function to remove hunger effects from an actor
 ---------------------------------------------------------------------*/
export const removeHungerEffects = async (actor) => {
  const existingEffect = actor.effects.find(effect => effect.flags?.fit?.hungerEffect);

  if (existingEffect) {
       await existingEffect.delete();
  }

  await actor.unsetFlag('fit', 'hungerActiveEffect');

  Hooks.call('removeHungerEffects', actor);
};

/*--------------------------------------------------------------------
 Function to calculate the hungerIcon based on hungerIndex.
 ---------------------------------------------------------------------*/
 export function hungerIcon(level) {
  switch (level) {
    case "Satisfied": return 'modules/fit/templates/icons/level_0.png'; // satisfied
    case "Peckish": return 'modules/fit/templates/icons/level_1.png'; // peckish
    case "Hungry": return 'modules/fit/templates/icons/level_2.png'; // hungry
    case "Ravenous": return 'modules/fit/templates/icons/level_3.png'; // ravenous
    case "Famished": return 'modules/fit/templates/icons/level_4.png'; // famished
    case "Starving": return 'modules/fit/templates/icons/level_5.png'; // starving
    case "unconscious": return 'modules/fit/templates/icons/level_6.png'; // dead
    default: return 'modules/fit/templates/icons/level_0.png'; // Default icon (in case of error)
  }
}

