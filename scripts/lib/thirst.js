/* This script integrates thirst tracking into the D&D 5e system within the Time-2-Eat module.

import { DEFAULT_THIRST_LEVEL, THIRST_LEVEL, } from './constants.js';// Ensure thirst icons are imported for consistency
import { daysFromSeconds } from "./time.js"; // Utility functions to calculate time differences.
import { updateExhaustion } from "./systems/dnd5e.js";


/*-------------------------------------------------
Helper function to calculate daysSinceLastDrinkForActor
----------------------------------------------------
export const daysSinceLastDrinkForActor = (actor) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  let elapsedTime;
  if (!tokenInScene) {
    // ✅ Use frozen thirst time instead of live calculation
    elapsedTime = actor.getFlag('fit', 'thirstElapsedTime') || 0;
    console.log(`🛑 Using frozen thirst time for ${actor.name}:`, elapsedTime);
  } else {
    // ✅ Normal calculation for on-scene PCs
    const lastDrinkAt = actor.getFlag('fit', 'lastDrinkAt') || game.time.worldTime;
    elapsedTime = game.time.worldTime - lastDrinktAt;
  }

  let daysSinceLastDrink = daysFromSeconds(elapsedTime);
  
  
  // ✅ Cap the max days without a drink at 6 (to align with thirst limit)
  // ✅ Adjust the cap dynamically to include baseThirst
  const baseThirst = game.settings.get('fit', 'baseThirst') || 0; // ✅ Get base thirst tolerance
  const maxDaysWithoutDrink = 6 + baseThirst; 
  daysSinceLastDrink = Math.min(maxDaysWithoutDrink, daysSinceLastDrink); 

  console.log(`🛑 Days Without Drink for ${actor.name}:`, daysSinceLastDrink);

  return Math.max(daysSinceLastDrink - baseThirst, 0);
};
/*-------------------------------------------------------------------------
 Function to calculate the thirstIndex based on daysSinceLastDrinkForActor.
 --------------------------------------------------------------------------
export const thirstIndex = (actor) => {
  if (!actor || typeof actor !== "object") {
    return 0;
  }
  const daysWithoutDrink = daysSinceLastDrinkForActor(actor);
  return Math.min(DEFAULT_THIRST_LEVEL + daysWithoutDrink, THIRST_LEVEL.length - 1);
};

/*--------------------------------------------------------------------
 Function to calculate the thirstLevel (in words) based on thirstIndex.
 ---------------------------------------------------------------------
export const thirstLevel = (actor) => {
  return THIRST_LEVEL[thirstIndex(actor)] || "unknown";
};



// Function to be used for thirst tracking
export const trackThirst = async (actor) => {
  const tokenInScene = game.scenes.active?.tokens.some(token => token.actorId === actor.id);

  if (!tokenInScene) {
      if (actor.getFlag('fit', 'thirstElapsedTime')) return; // ✅ Prevent multiple saves

      // ✅ Capture the frozen thirst state
      const thirstLevel = actor.getFlag('fit', 'thirstLevel') || 0;
      await actor.setFlag('fit', 'thirstElapsedTime', thirstLevel);
      return; // ✅ Stop thirst updates off-canvas
  }

  // ✅ If the PC is back on canvas, restore thirst
  if (actor.getFlag('fit', 'thirstElapsedTime')) {
      const storedThirst = actor.getFlag('fit', 'thirstElapsedTime');
      await actor.setFlag('fit', 'thirstLevel', storedThirst);
      await actor.unsetFlag('fit', 'thirstElapsedTime');
  }

  const baseThirst = game.settings.get('fit', 'baseThirst'); // ✅ Get base thirst tolerance from settings
  const daysWithoutDrink = daysSinceLastDrinkForActor(actor);
  
  let thirstLevel = Math.max(0, Math.floor((daysWithoutDrink - baseThirst) / 1)); // ✅ Apply base thirst before thirst starts

  // 🔄 Update the actor’s thirst directly
  await actor.update({ "system.attributes.exhaustion": thirstLevel });

  // 🔄 Trigger the Hook to update UI
  Hooks.call('updateThirstEffect', actor, thirstLevel);
};



// Function to update the last drink time for an actor
export const setLastDrinkTime = async (actor) => {
  if (!actor) {
    return;
  }
  const now = game.time.worldTime;
 // console.log(`🛠 Debug: ${actor.name} - Last drink time updating to: ${now}`);
  await actor.setFlag('fit', 'lastDrinkAt', now);
};

// Ensure API functions are registered under fit module
Hooks.once("ready", () => {
  const fitModule = game.modules.get("fit");
  if (fitModule) {
    fitModule.api = fitModule.api || {};
    Object.assign(fitModule.api, {
      resetThirstAfterDrink: resetThirstAfterDrink // ✅ Calls function directly
    });
  //  console.log("🛠 Debug: fit module API functions exposed for debugging");
  }
});
export async function resetThirstAfterDrink(actor) {
  if (!actor) return;
  
 // ✅ Recalculate exhaustion properly after resetting thirst
  updateExhaustion(actor);
  await setLastDrinkTime(actor); // Reset the last thirst time.

 

  console.log(`🛠 ${actor.name} | Drink reset, exhaustion recalculated.`);
}
*/