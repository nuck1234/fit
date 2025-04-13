// This script includes logic to track rest, reset it after a long rest, and log relevant data.

import { DEFAULT_REST_LEVEL, REST_LEVEL, getTerrainMultipliers } from './constants.js';// Ensure rest icons are imported for consistency
import { daysFromSeconds } from "./time.js"; // Utility functions to calculate time differences.


/*-------------------------------------------------
Initialize Rest Tracking
---------------------------------------------------*/
export const initializeRest = async (actor) => {
  const now = game.time.worldTime;
  await Promise.all([
    actor.setFlag('fit', 'lastRestAt', now),
    actor.setFlag('fit', 'restElapsedTime', 0),
    actor.setFlag('fit', 'lastRestNotificationAt', now) // ✅ Added for Thirst Tracking
  ]);
  Hooks.call('initializeRest', actor);
};

/*-------------------------------------------------
Helper function to calculate daysSinceLastRestForActor
----------------------------------------------------*/
export const daysSinceLastRestForActor = (actor) => {
  if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "restTracking")) return; // ✅ Stops rest if disabled

  const baseRest = game.settings.get('fit', 'baseRest') || 0;
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  let elapsedTime;
  if (!tokenInScene) {
    // ✅ If PC is off-canvas, use the frozen rest time
    elapsedTime = actor.getFlag('fit', 'restElapsedTime') || 0;
    
  } else {
    // ✅ If PC is on-canvas, calculate rest normally
    const lastRestAt = actor.getFlag('fit', 'lastRestAt') || game.time.worldTime;
    elapsedTime = game.time.worldTime - lastRestAt;
  }

  let daysSinceLastRest = daysFromSeconds(elapsedTime);
  
  // 🌍 Apply terrain-based thirst multiplier
  const restMultiplier = getTerrainMultipliers().rest;
  if (restMultiplier > 1) {
    daysSinceLastRest *= restMultiplier;
   // console.log(`[fit] Terrain multiplier applied: ${restMultiplier}x rest for ${actor.name}`);
  }
  
  // ✅ Apply Base Tolerance before capping
  let adjustedDays = Math.max(daysSinceLastRest - baseRest, 0);

  // ✅ Cap at 6 (max limit)
  return Math.min(adjustedDays, 6);
};
/*--------------------------------------------------------------------
 Function to calculate the restIndex based on daysSinceLastRestForActor.
 -------------------------------------------------------------------*/
 export const restIndex = (actor) => {
  if (!actor || typeof actor !== "object") return 0;

  const daysWithoutRest = Math.ceil(daysSinceLastRestForActor(actor));
  const rawIndex = DEFAULT_REST_LEVEL + daysWithoutRest;

  return Math.min(rawIndex, REST_LEVEL.length - 1);
};

/*--------------------------------------------------------------------
 Function to calculate the restLevel (in words) based on restIndex.
 ---------------------------------------------------------------------*/
export const restLevel = (actor) => {
  const level = REST_LEVEL[restIndex(actor)] || "unknown";
  return game.i18n.localize(`${level}`); // ✅ Now localized
};

/*--------------------------------------------------------------------
  Function to be used for rest tracking
---------------------------------------------------------------------*/
export const trackRest = async (actor) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  // ✅ Step 1: Check if the token is in the scene

  if (!tokenInScene) {
    // ✅ Step 2: Check if rest is already frozen
      if (actor.getFlag('fit', 'restElapsedTime')) return; // ✅ Prevent multiple saves
      const restLevel = actor.getFlag('fit', 'restLevel') || 0;
      await actor.setFlag('fit', 'restElapsedTime', restLevel);
      return;
  }

  // ✅ If the PC is back on canvas, restore rest
  if (actor.getFlag('fit', 'restElapsedTime')) {
      const storedRest = actor.getFlag('fit', 'restElapsedTime');
      await actor.setFlag('fit', 'restLevel', storedRest);
      await actor.unsetFlag('fit', 'restElapsedTime');
  }

  const baseRest = game.settings.get('fit', 'baseRest');
  const daysWithoutRest = daysSinceLastRestForActor(actor);

  let restLevel = Math.max(0, Math.floor(daysWithoutRest - baseRest)); // ✅ Apply base rest before exhaustion starts

  // ✅ Store rest level as a flag (DO NOT update exhaustion here)
  await actor.setFlag("fit", "restLevel", restLevel);

  // ✅ Call the exhaustion update in dnd5e.js instead
  Hooks.call('updateExhaustionEffect', actor, restLevel);
};

/*-----------------------------------------------
  Function to update the last rest time for an actor
------------------------------------------------*/
export const setLastRestTime = async (actor) => {
  if (!actor) {
    return;
  }
  const now = game.time.worldTime;

  await actor.setFlag('fit', 'lastRestAt', now);
};

/*-------------------------------------------------
Ensure API functions are registered under fit module
---------------------------------------------------*/
Hooks.once("ready", () => {
  const fitModule = game.modules.get("fit");
  if (fitModule) {
    fitModule.api = fitModule.api || {};
    Object.assign(fitModule.api, {
      resetRestAfterRest: resetRestAfterRest // ✅ Calls function directly
    });
  }
});

/*--------------------------------------------------------------------
 Function to reset rest after consuming food
 ---------------------------------------------------------------------*/
export async function resetRestAfterRest(actor) {
  if (!actor) return;

  await setLastRestTime(actor); // ✅ Reset last rest time only

  // ✅ Instead of updating exhaustion, call the Hook so dnd5e.js handles it
  Hooks.call("updateExhaustionEffect", actor);
  

}

