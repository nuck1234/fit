// Import necessary constants from the constants.js file
import { DEFAULT_HUNGER_LEVEL, HUNGER_LEVELS, HUNGER_ICONS } from './constants.js'
import { daysFromSeconds } from './time.js';
import { localize } from './utils.js';


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
    console.log(`🛑 Using frozen hunger time for ${actor.name}:`, elapsedTime);
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
  export const hungerIcon = (actor) => {
    return HUNGER_ICONS[hungerIndex(actor)];
}

/*--------------------------------------------------------------------
 Function to calculate updateHunger based on elapsed time
 ---------------------------------------------------------------------*/
export const updateHunger = async (actor, elapsed) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  // ✅ Step 1: Check if the token is in the scene
  console.log(`🔍 Checking token presence for ${actor.name}:`, { tokenInScene });

  if (!tokenInScene) {
    // ✅ Step 2: Check if hunger is already frozen
    if (actor.getFlag('fit', 'hungerElapsedTime')) {
      console.log(`🛑 Hunger already frozen for ${actor.name}, skipping update.`);
      return;
    }

    // ✅ Step 3: Freeze hunger time for the first time
    const lastMealAt = actor.getFlag('fit', 'lastMealAt') || game.time.worldTime;
    const elapsedTime = game.time.worldTime - lastMealAt;

    await actor.setFlag('fit', 'hungerElapsedTime', elapsedTime);
    console.log(`❄ Freezing hunger for ${actor.name}:`, { lastMealAt, elapsedTime });

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

    console.log(`▶ Hunger resumed for ${actor.name}:`, { currentTime, frozenElapsed });
  }

  // ✅ Only update hunger when the PC is on canvas
  const seconds = actor.getFlag('fit', 'secondsSinceLastMeal') || 0;
  await actor.setFlag('fit', 'secondsSinceLastMeal', seconds + elapsed);
  Hooks.call('updateHunger', actor);
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
  await removeHungerEffects(actor); // ✅ Ensure previous hunger effects are removed
  let effect = await ActiveEffect.create(activeEffectConfig, { parent: actor });
  await actor.setFlag('fit', 'hungerActiveEffect', effect.id);
  Hooks.call('addOrUpdateHungerEffect', actor, effect);
  }

// Function to consume food and reset the hunger state of an actor
export const consumeFood = async (actor) => {
  await removeHungerEffects(actor)
  await initializeHunger(actor)
  
  Hooks.call('consumeFood', actor)
}
  
// Function to remove hunger effects from an actor
export const removeHungerEffects = async (actor) => {
  const hungerEffectLabel = localize('hungerEffect');

  // Get existing hunger effects
  const hungerEffects = actor.effects.filter(effect => effect.name === hungerEffectLabel);

  for (const effect of hungerEffects) {
    if (!actor.effects.has(effect.id)) {
      console.warn(`⚠️ Warning: Hunger Effect ID ${effect.id} does not exist for ${actor.name}. Skipping deletion.`);
      continue;
    }
      await effect.delete();
  }

  // Clear the hungerActiveEffect flag if effects were found
  if (hungerEffects.length > 0) {
    await actor.setFlag('fit', 'hungerActiveEffect', null);
  }

  Hooks.call('removeHungerEffects', actor);
}


