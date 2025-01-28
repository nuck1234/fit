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
  addOrUpdateHungerEffect
} from "../hunger.js"; // Functions and utilities for managing hunger levels and effects.

import { localize } from '../utils.js'; // Utility for localization of text.


/* =========================
   DND5eSystem Class
   ========================= */
// This class handles the integration of hunger mechanics into the D&D 5e system.
export default class DND5eSystem {
  constructor(system) {
    this.system = system;
    console.log("Activating Hunger Table with system:", this.system);//Debug

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
      el.append(`<div class='counter flexrow hunger'><h4>Hunger</h4><div class='counter-value'>${hungerLevel(this.daysHungryForActor(actor))}</div></div>`);
    });
  }

  // Main function to evaluate and update an actor's hunger status.
  async evaluateHunger(actor) {
    const lastMealNotificationAt = actor.getFlag('fit', 'lastMealNotificationAt') || 0;
    const daysSinceLastMealNotification = daysFromSeconds(game.time.worldTime - lastMealNotificationAt);

    // Check if at least one day has passed since the last notification.
    if (daysSinceLastMealNotification >= 1) {
      const daysHungry = this.daysHungryForActor(actor);

      // Apply or update hunger effects if the actor is hungry.
      if (daysHungry > 0) {
        const config = this.activeEffectConfig(actor, daysHungry);
        await addOrUpdateHungerEffect(actor, config);
      }

      // Notify the players via chat about the actor's hunger status.
         const chatContent = await this.sendHungerNotification(actor); // This helper function was added to build and return the chat message content, including hunger status and rations information.
         hungerChatMessage(chatContent, actor);

      // Update the flag to track the last notification time.
      await actor.setFlag('fit', 'lastMealNotificationAt', game.time.worldTime);
      Hooks.call('evaluateHunger', actor);
    }
  }

  // Helper function to calculate days hungry for an actor.
  daysHungryForActor(actor) {
    const baseTolerance = game.settings.get('fit', 'baseTolerance'); // Dynamically fetch from settings
    const lastMealAt = actor.getFlag('fit', 'lastMealAt') || 0;
    const secondsSinceLastMeal = game.time.worldTime - lastMealAt;
    const daysSinceLastMeal = daysFromSeconds(secondsSinceLastMeal);
    const conMod = actor.system.abilities.con.mod || 0; // Corrected: Use actor.system instead of actor.data
    const hungerTolerance = Math.max(baseTolerance + conMod, 0); // Tolerance is based on Constitution modifier.
    const daysHungry = Math.max(daysSinceLastMeal - hungerTolerance, 0);
    return daysHungry;
  }

  // Helper function to configure active effects based on hunger.
  activeEffectConfig(actor, daysHungry) {
    return {
      icon: hungerIcon(daysHungry),
      label: localize('hungerEffect'),
      changes: [
        { key: 'system.attributes.hp.max', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -daysHungry } // Corrected: Use system instead of data, added.max
      ],
      duration: { days: daysHungry }
    };
  }
// Function to send a hunger notification to the chat.
async sendHungerNotification(actor) {
  const daysHungry = this.daysHungryForActor(actor);
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

  const hunger = hungerLevel(daysHungry);

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

}