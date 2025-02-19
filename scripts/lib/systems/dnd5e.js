// This script integrates the hunger mechanics into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track hunger, notify players, and apply effects based on hunger levels.


import { secondsAgo, daysFromSeconds } from "../time.js"; // Utility functions to calculate time differences.

import { hungerChatMessage } from "../chat.js"; // Function to send hunger notifications to the chat.

import {
  hungerLevel,
  hungerIcon,
  addOrUpdateHungerEffect,
  removeHungerEffects,
  daysHungryForActor  

} from "../hunger.js"; // Functions and utilities for managing hunger levels and effects.

import { resetExhaustionAfterRest } from "../rested.js"; // Function to set the last rest timestamp for an actor.
import { exhaustionIndex } from "../rested.js"; 
import { localize } from '../utils.js'; // Utility for localization of text.

// Function to update exhaustion without modifying the UI
export const updateExhaustion = (actor) => {
  exhaustionIndex(actor);
};

// Function to integrate exhaustion tracking with dnd5e.js
export const integrateExhaustionWithDnd5e = (actor) => {
  updateExhaustion(actor);
};


  
    /* -------------------------
    Hunger Mechanics
    ------------------------- */

    function updateCharacterSheet(app, html, sheet) {
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
    
      console.log("🛠 Debug: renderActorSheet5eCharacter received actor:", actor, "Days Hungry:", daysHungry);
    
      // ✅ FIX: Remove existing "Hunger" counter before adding a new one
      $(html).find('.counter.hunger').remove();
    
      // ✅ Add the Hunger UI element only once
      el.append(`<div class='counter flexrow hunger'><h4>Hunger</h4><div class='counter-value'>${hungerLevel(actor)}</div></div>`);
    }
  

    // Main function to evaluate and update an actor's hunger status.
    export async function evaluateHunger(actor) {
    const lastMealNotificationAt = actor.getFlag('fit', 'lastMealNotificationAt') || 0;
    const daysSinceLastMealNotification = daysFromSeconds(game.time.worldTime - lastMealNotificationAt);
  
    // Check if at least one day has passed since the last notification.
    if (daysSinceLastMealNotification >= 1) {
      const daysHungry = daysHungryForActor(actor);

      // Apply or update hunger effects if the actor is hungry.
      if (daysHungry >= 1 && daysHungry <= 5) {
        await removeHungerEffects(actor); // ✅ Ensure old effect is removed before applying new one
        const config = activeEffectConfig(actor, daysHungry);
        await addOrUpdateHungerEffect(actor, config);
    } else {
        await removeHungerEffects(actor); // ✅ Remove effect when hunger is out of range
      }

      // Notify the players via chat about the actor's hunger status.
         const chatContent = await sendHungerNotification(actor); // This helper function was added to build and return the chat message content, including hunger status and rations information.
         hungerChatMessage(chatContent, actor);

      // Update the flag to track the last notification time.
      await actor.setFlag('fit', 'lastMealNotificationAt', game.time.worldTime);
      Hooks.call('evaluateHunger', actor);
    }
  }
  
    // Helper function to configure active effects based on hunger.
    export function activeEffectConfig(actor, daysHungry) {
      return {
        icon: hungerIcon(daysHungry),
        label: localize('hungerEffect'),
        changes: [
          { key: 'system.attributes.hp.tempmax', mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: -daysHungry }
        ],
        duration: { rounds: 10 }
      };
}
// Renders the hunger UI element on the character sheet.
  Hooks.once('ready', () => {
    console.log("🛠 Debug: DND5e UI Hooks Initialized");
    Hooks.on('renderActorSheet5eCharacter', (app, html, sheet) => updateCharacterSheet(app, html, sheet));
});

// Function to send a hunger notification to the chat.
export async function sendHungerNotification(actor) {
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

/* =========================
   Exhaustion Mechanics
   ========================= */

  // Hook into Foundry's updateExhaustionEffect to update the character's exhaustion attribute
  Hooks.on('updateExhaustionEffect', async (actor, exhaustionLevel) => {
  console.log(`🛠 Debug: Updating exhaustion effect in UI for ${actor.name}, Level: ${exhaustionLevel}`);

  // 🔄 Update the character's exhaustion attribute in Foundry
  await actor.update({ "system.attributes.exhaustion": exhaustionLevel });

  // 🔄 Refresh the actor's sheet to reflect exhaustion changes
  if (actor.sheet) {
      actor.sheet.render();
  }
});
    // ✅ Hook into Foundry's chat messages to detect long rest messages
Hooks.on('createChatMessage', async (message) => {
  const content = message.content.toLowerCase();
  if (content.includes("takes a long rest")) {
    const actor = game.actors.get(message.speaker.actor);
    if (actor) {
      console.log(`🛠 Debug: Detected long rest message for ${actor.name}`);

      // ✅ Always use the pre-defined instance
      await resetExhaustionAfterRest(actor);
    }
  }
});

  
  // ✅ FINAL Correct closing brace for the class








 

  
