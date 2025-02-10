// This script integrates exhaustion tracking into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track exhaustion, reset it after a long rest, and log relevant data.

import {
  DEFAULT_EXHAUSTION_LEVEL,
  EXHAUSTION_LEVELS,
  EXHAUSTION_ICONS // Ensure exhaustion icons are imported for consistency
} from './constants.js';

import { secondsAgo, daysFromSeconds } from "./time.js"; // Utility functions to calculate time differences.


export const daysSinceLastRestForActor = (actor) => {
  let lastRestAt = actor.getFlag('fit', 'lastRestAt') || 0;

  if (!lastRestAt) {
    lastRestAt = game.time.worldTime;
    actor.setFlag('fit', 'lastRestAt', lastRestAt);
    console.log(`🛠 Debug: ${actor.name} - No previous rest found. Setting current time as last rest: ${lastRestAt}`);
  }

  const secondsSinceLastRest = game.time.worldTime - lastRestAt;
  const daysSinceLastRest = daysFromSeconds(secondsSinceLastRest);

  console.log(`🛠 Debug: ${actor.name} - Last Rest Timestamp: ${lastRestAt}, Seconds Since Last Rest: ${secondsSinceLastRest}, Days Since Last Rest: ${daysSinceLastRest}`);
  
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

// Function to update exhaustion without modifying the UI
//export const updateExhaustion = (actor) => {
 // exhaustionIndex(actor);
//};

// Function to integrate exhaustion tracking with dnd5e.js
//export const integrateExhaustionWithDnd5e = (actor) => {
//  updateExhaustion(actor);
//};

// Function to be used for exhaustion tracking
export async function trackExhaustion(actor) {
  console.log(`🛠 Debug: Richard Tracking exhaustion for ${actor.name}`);
  if (!actor) {
    console.error("❌ Error: Richard trackExhaustion called with an invalid actor!");
    return;
}
  
  const daysWithoutRest = daysSinceLastRestForActor(actor);
  console.log(`🛠 Debug: Richard Days without rest: ${daysWithoutRest}`);

  let exhaustionLevel = Math.floor(daysWithoutRest / 1); // to be looked at in the future as an en
  console.log(`🛠 Debug: Richard Calculated exhaustion level: ${exhaustionLevel}`);
 
   // 🔄 Update the actor’s exhaustion directly
   await actor.update({ "system.attributes.exhaustion": exhaustionLevel });
   console.log(`🛠 Debug: Exhaustion level updated for ${actor.name}: ${exhaustionLevel}`);

   // 🔄 Trigger the Hook to update UI
   Hooks.call('updateExhaustionEffect', actor, exhaustionLevel);

};

// Function to update the last rest time for an actor
export const setLastRestTime = async (actor) => {
  if (!actor) {
    return;
  }
  const now = game.time.worldTime;
  console.log(`🛠 Debug: ${actor.name} - Last rest time updating to: ${now}`);
  await actor.setFlag('fit', 'lastRestAt', now);
};

/* Function to reset exhaustion after a long rest and reset last rest time
export const resetExhaustionAfterRest = async (actor) => {
  if (!actor) {
    return;
  }
  console.log(`🛠 Debug: Resetting exhaustion for ${actor.name}`);
  await setLastRestTime(actor); // Reset last rest timestamp
  await actor.update({ 'system.attributes.exhaustion': 0 }); // Reset exhaustion to fully rested
  await actor.update({ 'system.attributes.hp.temp': 0 }); // Reset temporary hit points
  await actor.update({ 'system.attributes.hp.tempmax': 0 }); // Reset temporary max hit points
};*/

/* Hook into Foundry's chat messages to detect long rest messages
Hooks.on('createChatMessage', async (message) => {
  const content = message.content.toLowerCase();
  if (content.includes("takes a long rest")) {
    const actor = game.actors.get(message.speaker.actor);
    if (actor) {
      console.log(`🛠 Debug: Detected long rest message for ${actor.name}`);
      resetExhaustionAfterRest(actor);
    }
  }
});*/

// Ensure API functions are registered under fit module
Hooks.once("ready", () => {
  const fitModule = game.modules.get("fit");
  if (fitModule) {
    fitModule.api = fitModule.api || {};
    Object.assign(fitModule.api, {
      setLastRestTime,
      trackExhaustion
    });
    console.log("🛠 Debug: fit module API functions exposed for debugging");
  }
});
