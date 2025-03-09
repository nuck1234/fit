// Import necessary constants from the constants.js file
import { DEFAULT_HUNGER_LEVEL, HUNGER_LEVELS, HUNGER_ICONS } from './constants.js'
import { daysFromSeconds } from './time.js';
import { localize } from './utils.js';
import { updateExhaustion } from "./systems/dnd5e.js";

/* =========================
   Hunger Mechanics
   ========================= */

/*-------------------------------------------------
Function to initialize the hunger state of an actor
---------------------------------------------------*/
export const initializeHunger = async (actor) => {
  const now = game.time.worldTime
  await Promise.all([
    actor.setFlag('fit', 'secondsSinceLastMeal', 0),
    actor.setFlag('fit', 'lastMealAt', now),
    actor.setFlag('fit', 'lastMealNotificationAt', now),
    actor.setFlag('fit', 'lastDrinkAt', now),
  ])
  Hooks.call('initializeHunger', actor)
}
/*-------------------------------------------------
Function to unset all hunger-related flags for an actor
---------------------------------------------------*/
export const unsetHunger = async (actor) => {
  for (const key in actor.flags['fit']) {
    await actor.unsetFlag('fit', key)
  }
  Hooks.call('unsetHunger', actor)
}

/*-------------------------------------------------
Helper function to calculate daysHungryForActor.
----------------------------------------------------*/
export const daysHungryForActor = (actor) => {
  if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "hungerTracking")) return; // ✅ Stops hunger if disabled

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

  const daysSinceLastMeal = daysFromSeconds(elapsedTime);
  let conMod = actor.system?.abilities?.con?.mod ?? 0;

  return Math.max(daysSinceLastMeal - (baseTolerance + conMod), 0);
};

/*--------------------------------------------------------------------
 Function to calculate the hungerIndex based on daysHungryForActor.
 -------------------------------------------------------------------*/
  export const hungerIndex = (actor) => {
 
    if (!actor || typeof actor !== "object") {
      return 0;
   }
    const daysHungry = daysHungryForActor(actor);
    const index = Math.min(DEFAULT_HUNGER_LEVEL + daysHungry, HUNGER_LEVELS.length - 1);

    return index;
}

/*--------------------------------------------------------------------
 Function to calculate the hungerLevel (in words) based on hungerIndex.
 ---------------------------------------------------------------------*/
  export const hungerLevel = (actor) => {
    const level = HUNGER_LEVELS[hungerIndex(actor)] || "unknown";
    return game.i18n.localize(`${level}`);// added for table and chat issue
}

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
/*--------------------------------------------------------------------
 Function to calculate updateHunger based on elapsed time
 ---------------------------------------------------------------------*/
export const updateHunger = async (actor, elapsed) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  // ✅ Step 1: Check if the token is in the scene

  if (!tokenInScene) {
    // ✅ Step 2: Check if hunger is already frozen
    if (actor.getFlag('fit', 'hungerElapsedTime')) {
      
      return;
    }

    // ✅ Step 3: Freeze hunger time for the first time
    const lastMealAt = actor.getFlag('fit', 'lastMealAt') || game.time.worldTime;
    const elapsedTime = game.time.worldTime - lastMealAt;

    await actor.setFlag('fit', 'hungerElapsedTime', elapsedTime);
    
    return; // ✅ Completely stop hunger updates off-canvas
  }

  // ✅ If the PC is back on canvas, restore hunger tracking
  if (actor.getFlag('fit', 'hungerElapsedTime')) {
    const currentTime = game.time.worldTime;
    const frozenElapsed = actor.getFlag('fit', 'hungerElapsedTime');

    // ✅ Restore hunger to where it left off
    await actor.setFlag('fit', 'lastMealAt', currentTime - frozenElapsed);
    await actor.setFlag('fit', 'secondsSinceLastMeal', frozenElapsed);
    await actor.unsetFlag('fit', 'hungerElapsedTime');

      }

  // ✅ Only update hunger when the PC is on canvas
  const seconds = actor.getFlag('fit', 'secondsSinceLastMeal') || 0;
  await actor.setFlag('fit', 'secondsSinceLastMeal', seconds + elapsed);
  Hooks.call('updateHunger', actor);
};

/*--------------------------------------------------------------------
 Export lastMealAt and secondsSinceLastMeal functions for the hunger table
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

export const secondsSinceLastMeal = (actor) => {
  if (!actor) return 0;
  return game.time.worldTime - lastMealAt(actor); // ✅ Uses the new lastMealAt function
};




/*--------------------------------------------------------------------
 Hunger Effects
 ---------------------------------------------------------------------*/

// Function to get active hunger effects for an actor
export const activeHungerEffectsFor = (actor) => {
  return actor.effects.filter(effect => effect.flags['fit'] && effect.flags['fit']['effect'] === 'hunger')
}

// Function to add or update hunger effects for an actor
export const addOrUpdateHungerEffect = async (actor, activeEffectConfig) => {
  // ✅ Ensure any existing hunger effects are removed before applying a new one
  await removeHungerEffects(actor);

  // ✅ Apply the new hunger effect
  let effect = await actor.createEmbeddedDocuments("ActiveEffect", [activeEffectConfig]);
  await actor.setFlag('fit', 'hungerActiveEffect', effect[0].id);
 
  Hooks.call('addOrUpdateHungerEffect', actor, effect);
};


// Function to consume food and reset the hunger state of an actor
export const consumeFood = async (actor) => {
  await removeHungerEffects(actor);
  await initializeHunger(actor);

  // ✅ Recalculate exhaustion after eating
  updateExhaustion(actor);

  Hooks.call('consumeFood', actor);
};
  
// Function to remove hunger effects from an actor
export const removeHungerEffects = async (actor) => {
  // ✅ Find the existing hunger effect using the flag
  const existingEffect = actor.effects.find(effect => effect.flags?.fit?.hungerEffect);

  if (existingEffect) {
       await existingEffect.delete();
  }

  // ✅ Clear stored hunger effect flag
  await actor.unsetFlag('fit', 'hungerActiveEffect');

  Hooks.call('removeHungerEffects', actor);
};



