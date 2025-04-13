// This script includes logic to track thirst, reset it after a long thirst, and log relevant data.

import { DEFAULT_THIRST_LEVEL, THIRST_LEVEL, getTerrainMultipliers } from './constants.js';// Ensure thirst icons are imported for consistency
import { daysFromSeconds } from "./time.js"; // Utility functions to calculate time differences.

/*-------------------------------------------------
Initialize Thirst Tracking
---------------------------------------------------*/
export const initializeThirst = async (actor) => {
  const now = game.time.worldTime;
  await Promise.all([
    actor.setFlag('fit', 'secondsSinceLastDrink', 0),
    actor.setFlag('fit', 'lastDrinkAt', now),
    actor.setFlag('fit', 'lastDrinkNotificationAt', now) // ✅ Added for Thirst Tracking
  ]);
  Hooks.call('initializeThirst', actor);
};

/*-------------------------------------------------
Helper function to calculate daysSinceLastDrinkForActor
----------------------------------------------------*/
export const daysSinceLastDrinkForActor = (actor) => {
  if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "thirstTracking")) return; // ✅ Stops thirst if disabled

  const baseThirst = game.settings.get('fit', 'baseThirst') || 0;
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  let elapsedTime;
  if (!tokenInScene) {
    // ✅ If PC is off-canvas, use the frozen rest time
    elapsedTime = actor.getFlag('fit', 'thirstElapsedTime') || 0;
    
  } else {
    // ✅ If PC is on-canvas, calculate thirst normally
    const lastDrinkAt = actor.getFlag('fit', 'lastDrinkAt') || game.time.worldTime;
    elapsedTime = game.time.worldTime - lastDrinkAt;
  }

  let daysSinceLastDrink = daysFromSeconds(elapsedTime);
  
// 🌍 Apply terrain-based thirst multiplier
const thirstMultiplier = getTerrainMultipliers().thirst;
if (thirstMultiplier > 1) {
  daysSinceLastDrink *= thirstMultiplier;
  //console.log(`[fit] Terrain multiplier applied: ${thirstMultiplier}x thirst for ${actor.name}`);
}

  // ✅ Apply Base Tolerance before capping
  let adjustedDays = Math.max(daysSinceLastDrink - baseThirst, 0);

  // ✅ Cap at 6 (max limit)
  return Math.min(adjustedDays, 6);
};
/*--------------------------------------------------------------------
 Function to calculate the thirstIndex based on daysSinceLastDrinkForActor.
 -------------------------------------------------------------------*/
export const thirstIndex = (actor) => {
  if (!actor || typeof actor !== "object") {
    return 0;
  }
  const daysWithoutDrink = Math.ceil(daysSinceLastDrinkForActor(actor));
  const rawIndex = DEFAULT_THIRST_LEVEL + daysWithoutDrink;
  return Math.min(rawIndex, THIRST_LEVEL.length - 1);
};

/*--------------------------------------------------------------------
 Function to calculate the thirstLevel (in words) based on thirstIndex.
 ---------------------------------------------------------------------*/
export const thirstLevel = (actor) => {
  const level = THIRST_LEVEL[thirstIndex(actor)] || "unknown";
  return game.i18n.localize(`${level}`); // ✅ Now localized
};

/*--------------------------------------------------------------------
  Function to be used for thirst tracking
---------------------------------------------------------------------*/
export const trackThirst = async (actor) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  // ✅ Step 1: Check if the token is in the scene

  if (!tokenInScene) {
    // ✅ Step 2: Check if thirst is already frozen
      if (actor.getFlag('fit', 'thirstElapsedTime')) return; // ✅ Prevent multiple saves
      const thirstLevel = actor.getFlag('fit', 'thirstLevel') || 0;
      await actor.setFlag('fit', 'thirstElapsedTime', thirstLevel);
      return;
  }

  // ✅ If the PC is back on canvas, restore thirst
  if (actor.getFlag('fit', 'thirstElapsedTime')) {
      const storedThirst = actor.getFlag('fit', 'thirstElapsedTime');
      await actor.setFlag('fit', 'thirstLevel', storedThirst);
      await actor.unsetFlag('fit', 'thirstElapsedTime');
  }

  const baseThirst = game.settings.get('fit', 'baseThirst');
  const daysWithoutDrink = daysSinceLastDrinkForActor(actor);

  let thirstLevel = Math.max(0, Math.floor(daysWithoutDrink - baseThirst)); // ✅ Apply base thirst

  // ✅ Store thirst level as a flag
  await actor.setFlag("fit", "thirstLevel", thirstLevel);

  // ✅ Call the exhaustion update in dnd5e.js instead
  Hooks.call('updateExhaustionEffect', actor, thirstLevel);
};

/*-----------------------------------------------
  Function to update the last drink time for an actor
------------------------------------------------*/
export const setLastDrinkTime = async (actor) => {
  if (!actor) {
    return;
  }
  const now = game.time.worldTime;

  await actor.setFlag('fit', 'lastDrinkAt', now);
};

/*-------------------------------------------------
Ensure API functions are registered under fit module
---------------------------------------------------*/
Hooks.once("ready", () => {
  const fitModule = game.modules.get("fit");
  if (fitModule) {
    fitModule.api = fitModule.api || {};
    Object.assign(fitModule.api, {
      consumeWater,
      trackThirst,
      resetThirstAfterDrink,       // if you have this
      daysSinceLastDrinkForActor   // optional helper
    });
  }
});

/*--------------------------------------------------------------------
 Function to reset drink after consuming water
 ---------------------------------------------------------------------*/
export async function resetThirstAfterDrink(actor) {
  if (!actor) return;

  await setLastDrinkTime(actor); // ✅ Reset last drink time only

  // ✅ Instead of updating exhaustion, call the Hook so dnd5e.js handles it
  Hooks.call("updateExhaustionEffect", actor);

}

/*--------------------------------------------------------------------
 Function to consume water (Reset thirst & effects)
 ---------------------------------------------------------------------*/
export const consumeWater = async (actor) => {
  await resetThirstAfterDrink(actor); // ✅ Now matches rest
  await trackThirst(actor); // ✅ Actually recalculates and stores hungerLevel

  Hooks.call('consumeWater', actor);

    // ✅ Ensure exhaustion recalculates after eating
    Hooks.call("updateExhaustionEffect", actor);
};