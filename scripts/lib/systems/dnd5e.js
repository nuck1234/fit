// This script integrates the hunger mechanics into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track hunger, notify players, and apply effects based on hunger levels.


import { daysFromSeconds } from "../time.js"; // Utility functions to calculate time differences.
import { hungerChatMessage, sendHungerNotification } from "../chat.js"; // Function to send hunger notifications to the chat.
import { hungerLevel, hungerIcon, addOrUpdateHungerEffect, removeHungerEffects, daysHungryForActor, consumeFood } from "../hunger.js"; // Functions and utilities for managing hunger levels and effects.
import { resetExhaustionAfterRest, exhaustionIndex } from "../rested.js"; // Function to set the last rest timestamp for an actor.
import { localize } from '../utils.js'; // Utility for localization of text.
  
/* =======================
 Hunger Mechanics
========================= */

/*-------------------------------------------------
Function updateCharacterSheet
---------------------------------------------------*/
function updateCharacterSheet(app, html, sheet) {

  // ✅ Check if the module is enabled and hunger tracking is enabled
  if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "hungerTracking")) return; // ✅ Stops hunger if disabled

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


    
      // ✅ FIX: Remove existing "Hunger" counter before adding a new one
      $(html).find('.counter.hunger').remove();
      
          // ✅ Add the Hunger UI element only once
          el.append(`<div class='counter flexrow hunger'><h4>Hunger</h4><div class='counter-value'>${hungerLevel(actor)}</div></div>`);
        }
  
  // Renders the hunger UI element on the character sheet.
   Hooks.once('ready', () => {
    console.log("🛠 Debug: DND5e UI Hooks Initialized");
    Hooks.on('renderActorSheet5eCharacter', (app, html, sheet) => updateCharacterSheet(app, html, sheet));
    });
  
    
/*-------------------------------------------------
CONSUME FOOD
---------------------------------------------------*/  
  //Consume food from inventory
  Hooks.on('preUpdateItem', async (item, change) => {
  if (change.hasOwnProperty('sort')) return; // Ignore reordering
   
  // Check if the item's name matches the configured ration name
  if (game.settings.get('fit', 'rationName') === item.name) {
    const actor = game.actors.get(item.actor.id);
 
    if (!actor) {
    console.error("Actor not found for item:", item);
  return;
    }
 
  // Determine if the item was consumed based on its uses or quantity
     const consumedUses = item.system.uses?.value !== undefined && change.system.uses?.value === item.system.uses.value - 1;
     const consumedQuantity = item.system.quantity !== undefined && change.system.quantity === item.system.quantity - 1;
    
     if (consumedUses || consumedQuantity) {
        console.log(`${actor.name} consumed a ration directly from inventory.`);
   
  // ✅ Now calls `consumeFood()` from hunger.js inside dnd5e.js
     await consumeFood(actor);
        }
      }
    });
    
    /*-------------------------------------------------
    HUNGER EFFECTS
    ---------------------------------------------------*/

    // Main function to evaluate and update an actor's hunger status.
    export async function evaluateHunger(actor) {
    const lastMealNotificationAt = actor.getFlag('fit', 'lastMealNotificationAt') || 0;
    const daysSinceLastMealNotification = daysFromSeconds(game.time.worldTime - lastMealNotificationAt);
  
    // Check if at least one day has passed since the last notification.
    if (daysSinceLastMealNotification >= 1) {
      const daysHungry = daysHungryForActor(actor);

      // Apply or update hunger effects if the actor is hungry.
      if (daysHungry >= 1) { // ✅ Apply effects for ANY hunger, not just <= 5
        await removeHungerEffects(actor); // ✅ Ensure old effect is removed before applying a new one
        const config = activeEffectConfig(actor, daysHungry);
        await addOrUpdateHungerEffect(actor, config);
      } 
      
      // ✅ Ensure effects do NOT get removed at daysHungry > 5
      if (daysHungry > 5) {
        console.log(`⚠ ${actor.name} is starving (Hunger: ${daysHungry} days). Effects remain active.`);
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
      const currentHungerLevel = hungerLevel(actor); // Get the actual hunger level
  
      return {
          icon: hungerIcon(currentHungerLevel), // ✅ Uses correct hunger icon
          label: `Hunger Level (${currentHungerLevel})`, // ✅ Dynamic effect name for UI
          flags: { fit: { hungerEffect: true } }, // ✅ Marks this as a hunger effect for easy removal
          changes: [
              { key: 'system.attributes.hp.tempmax', mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: -daysHungry }
          ],
          duration: { rounds: 10 }
      };
  }
  

/* =========================
   Exhaustion Mechanics
   ========================= */
  // Function to update exhaustion without modifying the UI
  export const updateExhaustion = (actor) => {
  
    // ✅ Stops exhaustion if disabled
  if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "exhaustionTracking")) return; // ✅ Stops exhaustion reset if disabled
  exhaustionIndex(actor);
};

  // Function to integrate exhaustion tracking with dnd5e.js
  export const integrateExhaustionWithDnd5e = (actor) => {
  updateExhaustion(actor);
};
  // Hook into Foundry's updateExhaustionEffect to update the character's exhaustion attribute
  Hooks.on('updateExhaustionEffect', async (actor, exhaustionLevel) => {
  
  // ✅ Stops exhaustion if disabled
  if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "exhaustionTracking")) return; // ✅ Stops exhaustion reset if disabled

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

      // ✅ Always use the pre-defined instance
      await resetExhaustionAfterRest(actor);
    }
  }
});  // ✅ FINAL Correct closing brace for the class








 

  
