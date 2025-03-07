// This script integrates rest tracking into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track rest, reset it after a long rest, and log relevant data.

import { DEFAULT_REST_LEVEL, REST_LEVEL, } from './constants.js';// Ensure rest icons are imported for consistency
import { daysFromSeconds } from "./time.js"; // Utility functions to calculate time differences.
import { updateExhaustion } from "./systems/dnd5e.js";



/*-------------------------------------------------
Helper function to calculate daysSinceLastRestForActor
----------------------------------------------------*/
export const daysSinceLastRestForActor = (actor) => {
  const baseTolerance = game.settings.get('fit', 'baseTolerance') || 0;
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  let elapsedTime;
  if (!tokenInScene) {
    // ✅ Use frozen rest time instead of live calculation
    elapsedTime = actor.getFlag('fit', 'restElapsedTime') || 0;
    console.log(`🛑 Using frozen rest time for ${actor.name}:`, elapsedTime);
  } else {
    // ✅ Normal calculation for on-scene PCs
    const lastRestAt = actor.getFlag('fit', 'lastRestAt') || game.time.worldTime;
    elapsedTime = game.time.worldTime - lastRestAt;
  }

  let daysSinceLastRest = daysFromSeconds(elapsedTime);
  
  
  // ✅ Cap the max days without rest at 6 (to align with rest limit)
  // ✅ Adjust the cap dynamically to include baseRest
  const baseRest = game.settings.get('fit', 'baseRest') || 0; // ✅ Get base rest tolerance
  const maxDaysWithoutRest = 6 + baseRest; 
  daysSinceLastRest = Math.min(maxDaysWithoutRest, daysSinceLastRest); 

  console.log(`🛑 Days Without Rest for ${actor.name}:`, daysSinceLastRest);

  return Math.max(daysSinceLastRest, 0);
};
/*--------------------------------------------------------------------
 Function to calculate the restIndex based on daysSinceLastRestForActor.
 -------------------------------------------------------------------*/
export const restIndex = (actor) => {
  if (!actor || typeof actor !== "object") {
    return 0;
  }
  const daysWithoutRest = daysSinceLastRestForActor(actor);
  return Math.min(DEFAULT_REST_LEVEL + daysWithoutRest, REST_LEVEL.length - 1);
};

/*--------------------------------------------------------------------
 Function to calculate the restLevel (in words) based on restIndex.
 ---------------------------------------------------------------------*/
export const restLevel = (actor) => {
  return REST_LEVEL[restIndex(actor)] || "unknown";
};



// Function to be used for rest tracking
export const trackRest = async (actor) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  if (!tokenInScene) {
      if (actor.getFlag('fit', 'restElapsedTime')) return; // ✅ Prevent multiple saves

      // ✅ Capture the frozen rest state
      const restLevel = actor.getFlag('fit', 'restLevel') || 0;
      await actor.setFlag('fit', 'restElapsedTime', restLevel);
      return; // ✅ Stop rest updates off-canvas
  }

  // ✅ If the PC is back on canvas, restore rest
  if (actor.getFlag('fit', 'restElapsedTime')) {
      const storedRest = actor.getFlag('fit', 'restElapsedTime');
      await actor.setFlag('fit', 'restLevel', storedRest);
      await actor.unsetFlag('fit', 'restElapsedTime');
  }

  const baseRest = game.settings.get('fit', 'baseRest'); // ✅ Get base rest tolerance from settings
  const daysWithoutRest = daysSinceLastRestForActor(actor);
  
  let restLevel = Math.max(0, Math.floor((daysWithoutRest - baseRest) / 1)); // ✅ Apply base rest before rest starts

  // 🔄 Update the actor’s exhaustion directly
  await actor.update({ "system.attributes.exhaustion": restLevel });

  // 🔄 Trigger the Hook to update UI
  Hooks.call('updateRestEffect', actor, restLevel);
};



// Function to update the last rest time for an actor
export const setLastRestTime = async (actor) => {
  if (!actor) {
    return;
  }
  const now = game.time.worldTime;
 // console.log(`🛠 Debug: ${actor.name} - Last rest time updating to: ${now}`);
  await actor.setFlag('fit', 'lastRestAt', now);
};

// Ensure API functions are registered under fit module
Hooks.once("ready", () => {
  const fitModule = game.modules.get("fit");
  if (fitModule) {
    fitModule.api = fitModule.api || {};
    Object.assign(fitModule.api, {
      resetRestAfterRest: resetRestAfterRest // ✅ Calls function directly
    });
  //  console.log("🛠 Debug: fit module API functions exposed for debugging");
  }
});
export async function resetRestAfterRest(actor) {
  if (!actor) return;
  
 // ✅ Recalculate exhaustion properly after resetting rest
  updateExhaustion(actor);
  await setLastRestTime(actor); // Reset the last rest time.

 

  console.log(`🛠 ${actor.name} | Rest reset, exhaustion recalculated.`);
}

