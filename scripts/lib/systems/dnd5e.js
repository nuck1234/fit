// This script integrates the hunger mechanics into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track hunger, notify players, and apply effects based on hunger levels.

import {
  secondsAgo,
  daysFromSeconds
} from "../time.js"; // Utility functions to calculate time differences.

import {
  hungerChatMessage
} from "../chat.js"; // Function to send hunger notifications to the chat.

import {
  hungerLevel,
  hungerIcon,
  addOrUpdateHungerEffect,
  removeHungerEffects

} from "../hunger.js"; // Functions and utilities for managing hunger levels and effects.

import {
  trackExhaustion
} from "../rested.js"; // Function to track exhaustion without modifying the UI.
// Functions and utilities for managing exhaustion levels and effects.

import { localize } from '../utils.js'; // Utility for localization of text.

 // Helper function to calculate days hungry for an actor.
 export const daysHungryForActor = (actor) => {
  const baseTolerance = game.settings.get('fit', 'baseTolerance') || 0;
  const lastMealAt = actor.getFlag('fit', 'lastMealAt') || 0;
  const secondsSinceLastMeal = game.time.worldTime - lastMealAt;
  const daysSinceLastMeal = daysFromSeconds(secondsSinceLastMeal);

  let conMod = actor.system?.abilities?.con?.mod ?? 0;

  console.log(`Days Hungry Calculation dnd5e -> Actor: ${actor.name}, Base Tolerance: ${baseTolerance}, Con Mod: ${conMod}, Days Hungry: ${daysSinceLastMeal - (baseTolerance + conMod)}`);

  return Math.max(daysSinceLastMeal - (baseTolerance + conMod), 0);
};

// Helper function to calculate days since last rest for an actor and log to console ONLY.
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
/* =========================
   DND5eSystem Class
   ========================= */
// This class handles the integration of hunger and exhaustion mechanics into the D&D 5e system.
export default class DND5eSystem {
  constructor(system) {
    this.system = system;
    console.log("Activating Hunger Table with system:", this.system);//Debug

    // Hook into Foundry's long rest system to reset exhaustion
    Hooks.on('longRest', (actor) => {
      console.log(`🛠 Debug: ${actor.name} is taking a long rest.`);
      console.log(`🛠 Debug: Long rest detected for ${actor.name}`);
      resetExhaustionAfterRest(actor);
    });

    // Adds a "Hunger" counter to the character sheet UI.
    Hooks.on('renderActorSheet5eCharacter', async (app, html, sheet) => {
      const el = $(html).find('.counters');
      const actorId = sheet.actor?._id;
      if (!actorId) {
        console.error('Actor ID not found');
        return;
      }
      const actor = game.actors.get(actorId);
      if (!actor) {
        console.error(`Actor not found for ID: ${actorId}`);
        return;
      }
      const daysHungry = daysHungryForActor(actor);
  // Updates exhaustion counter in the character sheet UI.
      // const daysWithoutRest = daysSinceLastRestForActor(actor);

      console.log("🛠 Debug: renderActorSheet5eCharacter received actor:", actor, "Days Hungry:", daysHungry);
      el.append(`<div class='counter flexrow hunger'><h4>Hunger</h4><div class='counter-value'>${hungerLevel(actor)}</div></div>`);
    
       // Ensure exhaustion counter is updated correctly
       // Track exhaustion separately without modifying UI
      trackExhaustion(actor);
    });
  }

  // Function to update exhaustion based on days since last rest.
    async updateExhaustion(actor, daysWithoutRest) {
    if (!actor || typeof daysWithoutRest !== 'number') {
    console.error("Invalid actor or daysWithoutRest input");
    return;
    }
    const exhaustionLevelValue = Math.min(daysWithoutRest, 6);
    await actor.update({ 'system.attributes.exhaustion': exhaustionLevelValue });
    console.log(`Exhaustion level updated for ${actor.name}:`, exhaustionLevelValue);
  }

  // Main function to evaluate and update an actor's hunger status.
  async evaluateHunger(actor) {
    const lastMealNotificationAt = actor.getFlag('fit', 'lastMealNotificationAt') || 0;
    const daysSinceLastMealNotification = daysFromSeconds(game.time.worldTime - lastMealNotificationAt);

    // Check if at least one day has passed since the last notification.
    if (daysSinceLastMealNotification >= 1) {
      const daysHungry = daysHungryForActor(actor);

      // Apply or update hunger effects if the actor is hungry.
      if (daysHungry >= 1 && daysHungry <= 5) {
        await removeHungerEffects(actor); // ✅ Ensure old effect is removed before applying new one
        const config = this.activeEffectConfig(actor, daysHungry);
        await addOrUpdateHungerEffect(actor, config);
    } else {
        await removeHungerEffects(actor); // ✅ Remove effect when hunger is out of range
      }

      // Notify the players via chat about the actor's hunger status.
         const chatContent = await this.sendHungerNotification(actor); // This helper function was added to build and return the chat message content, including hunger status and rations information.
         hungerChatMessage(chatContent, actor);

      // Update the flag to track the last notification time.
      await actor.setFlag('fit', 'lastMealNotificationAt', game.time.worldTime);
      Hooks.call('evaluateHunger', actor);
    }
  }

    // Helper function to configure active effects based on hunger.
    activeEffectConfig(actor, daysHungry) {
      return {
        icon: hungerIcon(daysHungry),
        label: localize('hungerEffect'),
        changes: [
          { key: 'system.attributes.hp.tempmax', mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: -daysHungry }
        ],
        duration: { rounds: 10 }
      };
}
// Function to send a hunger notification to the chat.
async sendHungerNotification(actor) {
  const daysHungry = daysHungryForActor(actor); // ✅ FIXED: Correct function reference
  const rations = actor.items.find(i => i.name === game.settings.get('fit', 'rationName'));

  // Use the actor's last meal timestamp instead of the current time
  const lastMealAt = actor.getFlag('fit', 'lastMealAt') || 0;
  const lastMealDate = new Date(lastMealAt * 1000); // Convert seconds to milliseconds for Date object
  const display = {
    date: lastMealDate.toLocaleDateString(),
    time: lastMealDate.toLocaleTimeString(),
  };

  const actionHtml = rations && rations.system && rations.system.quantity > 0
    ? `<button data-action="consumeFood" data-actor-id="${actor.id}" data-item-id="${rations.id}">Use Rations</button>`
    : `Find ${game.settings.get('fit', 'rationName')} soon!`;

  const hunger = hungerLevel(actor);

  // Build the final chat card content
  const chatContent = `
    <div class='dnd5e chat-card'>
      <div class='card-header flexrow'>
        <img src="${hungerIcon(daysHungry)}" title="Rations" width="36" height="36">
        <h3> ${localize('chat.you_are')} ${hunger}</h3>
      </div>
      <div class='card-content'>
        <p>
          ${localize('chat.eaten_since')} <strong>${display.date}</strong> ${localize('at')} <strong>${display.time}</strong>.
        </p>
        <p>
          Use Rations to satisfy your hunger.
        </p>
        <p>
           ${actionHtml}
        </p>
      </div>
      <div class='card-footer'>
        <span>${hunger}</span>
        <span>Last Meal: ${display.date} ${localize('on')} ${display.time}</span>
        <span>Rations: ${rations && rations.system && rations.system.quantity !== undefined ? rations.system.quantity : localize('none').toUpperCase()}</span>
      </div>
    </div>
  `;

  return chatContent;
}
  async updateExhaustion(actor, level) {
    if (!actor || typeof level !== 'number') {
    console.error("Invalid actor or level input");
    return;
  }
  await actor.update({ 'system.attributes.exhaustion': level });
  console.log(`Exhaustion level updated for ${actor.name}:`, level);
}
}