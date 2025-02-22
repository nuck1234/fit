// This script integrates exhaustion tracking into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track exhaustion, reset it after a long rest, and log relevant data.

import { DEFAULT_EXHAUSTION_LEVEL, EXHAUSTION_LEVELS, } from './constants.js';// Ensure exhaustion icons are imported for consistency
import { daysFromSeconds } from "./time.js"; // Utility functions to calculate time differences.



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
  
  // ✅ Cap the max days without rest at 6 (to align with exhaustion limit)
  daysSinceLastRest = Math.min(6, daysSinceLastRest);

  console.log(`🛑 Days Without Rest for ${actor.name}:`, daysSinceLastRest);
  
  return Math.max(daysSinceLastRest, 0);
};
/*--------------------------------------------------------------------
 Function to calculate the exhaustionIndex based on daysSinceLastRestForActor.
 -------------------------------------------------------------------*/
export const exhaustionIndex = (actor) => {
  if (!actor || typeof actor !== "object") {
    return 0;
  }
  const daysWithoutRest = daysSinceLastRestForActor(actor);
  return Math.min(DEFAULT_EXHAUSTION_LEVEL + daysWithoutRest, EXHAUSTION_LEVELS.length - 1);
};

/*--------------------------------------------------------------------
 Function to calculate the exhaustionLevel (in words) based on exhaustionIndex.
 ---------------------------------------------------------------------*/
export const exhaustionLevel = (actor) => {
  return EXHAUSTION_LEVELS[exhaustionIndex(actor)] || "unknown";
};



// Function to be used for exhaustion tracking
export const trackExhaustion = async (actor) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);
  
  if (!tokenInScene) {
    if (actor.getFlag('fit', 'exhaustionElapsedTime')) return; // ✅ Prevent multiple saves

    // ✅ Capture the frozen exhaustion state
    const exhaustionLevel = actor.getFlag('fit', 'exhaustionLevel') || 0;
    await actor.setFlag('fit', 'exhaustionElapsedTime', exhaustionLevel);

    return; // ✅ Stop exhaustion updates off-canvas
  }

  // ✅ If the PC is back on canvas, restore exhaustion
  if (actor.getFlag('fit', 'exhaustionElapsedTime')) {
    const storedExhaustion = actor.getFlag('fit', 'exhaustionElapsedTime');
    await actor.setFlag('fit', 'exhaustionLevel', storedExhaustion);
    await actor.unsetFlag('fit', 'exhaustionElapsedTime');
  }

  
  const daysWithoutRest = daysSinceLastRestForActor(actor);
 // console.log(`🛠 Debug: Richard Days without rest: ${daysWithoutRest}`);

  let exhaustionLevel = Math.floor(daysWithoutRest / 1); // to be looked at in the future as an en
 
   // 🔄 Update the actor’s exhaustion directly
   await actor.update({ "system.attributes.exhaustion": exhaustionLevel });

   // 🔄 Trigger the Hook to update UI
   Hooks.call('updateExhaustionEffect', actor, exhaustionLevel);

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
      resetExhaustionAfterRest: resetExhaustionAfterRest // ✅ Calls function directly
    });
  //  console.log("🛠 Debug: fit module API functions exposed for debugging");
  }
});
export async function resetExhaustionAfterRest(actor) {
  if (!actor) return;


  // ✅ Set the last rest time to now
  await setLastRestTime(actor);

  // ✅ Reset exhaustion
  await actor.update({ "system.attributes.exhaustion": 0 });

  // 🔄 Trigger the Hook to update UI
  Hooks.call("updateExhaustionEffect", actor);
}
