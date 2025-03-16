// This script includes logic to track thirst, reset it after a long thirst, and log relevant data.

import { DEFAULT_THIRST_LEVEL, THIRST_LEVEL, } from './constants.js';// Ensure thirst icons are imported for consistency
import { daysFromSeconds } from "./time.js"; // Utility functions to calculate time differences.


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
  
  


  // ✅ Cap the max days without thirst at 6 (to align with thirst limit)
  // ✅ Adjust the cap dynamically to include baseThirst
  const maxDaysWithoutDrink = 6 + baseThirst; 
  daysSinceLastDrink = Math.min(maxDaysWithoutDrink, daysSinceLastDrink); 

  return Math.max(daysSinceLastDrink, 0);
};
/*--------------------------------------------------------------------
 Function to calculate the thirstIndex based on daysSinceLastDrinkForActor.
 -------------------------------------------------------------------*/
export const thirstIndex = (actor) => {
  if (!actor || typeof actor !== "object") {
    return 0;
  }
  const daysWithoutDrink = daysSinceLastDrinkForActor(actor);
  return Math.min(DEFAULT_THIRST_LEVEL + daysWithoutDrink, THIRST_LEVEL.length - 1);
};

/*--------------------------------------------------------------------
 Function to calculate the thisrtLevel (in words) based on thirstIndex.
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
      resetThirstAfterDrink: resetThirstAfterDrink // ✅ Calls function directly
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

  Hooks.call('consumeWater', actor);

    // ✅ Ensure exhaustion recalculates after eating
    updateExhaustion(actor);
};