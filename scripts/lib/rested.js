// This script integrates exhaustion tracking into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track exhaustion, reset it after a long rest, and log relevant data.

import { DEFAULT_EXHAUSTION_LEVEL, EXHAUSTION_LEVELS, EXHAUSTION_ICONS } from './constants.js';// Ensure exhaustion icons are imported for consistency
import { secondsAgo, daysFromSeconds } from "./time.js"; // Utility functions to calculate time differences.

export const daysSinceLastRestForActor = (actor) => {
  let lastRestAt = actor.getFlag('fit', 'lastRestAt') || 0;

  if (!lastRestAt) {
    lastRestAt = game.time.worldTime;
    actor.setFlag('fit', 'lastRestAt', lastRestAt);
  //  console.log(`🛠 Debug: ${actor.name} - No previous rest found. Setting current time as last rest: ${lastRestAt}`);
  }

  const secondsSinceLastRest = game.time.worldTime - lastRestAt;
  const daysSinceLastRest = daysFromSeconds(secondsSinceLastRest);

  return Math.max(daysSinceLastRest, 0);
};

// Function to get the exhaustion level description based on the number of days without rest
export const exhaustionLevel = (actor) => {
  return EXHAUSTION_LEVELS[exhaustionIndex(actor)] || "unknown";
};

// Function to calculate the exhaustion index based on the number of days without rest
export const exhaustionIndex = (actor) => {
  if (!actor || typeof actor !== "object") {
    return 0;
  }
  const daysWithoutRest = daysSinceLastRestForActor(actor);
  return Math.min(DEFAULT_EXHAUSTION_LEVEL + daysWithoutRest, EXHAUSTION_LEVELS.length - 1);
};

// Function to be used for exhaustion tracking
export async function trackExhaustion(actor) {
  if (!actor) {
    console.error("❌ Error: Richard trackExhaustion called with an invalid actor!");
    return;
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
