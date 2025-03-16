// This script integrates the hunger mechanics into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track hunger, notify players, and apply effects based on hunger levels.


import { daysFromSeconds } from "../time.js"; // Utility functions to calculate time differences.
import { hungerChatMessage, sendHungerNotification } from "../chat.js"; // Function to send hunger notifications to the chat.
import { hungerLevel, hungerIcon, addOrUpdateHungerEffect, removeHungerEffects, daysHungryForActor, consumeFood,hungerIndex } from "../hunger.js"; // Functions and utilities for managing hunger levels and effects.
import { resetRestAfterRest, restIndex, restLevel, } from "../rested.js"; // Function to set the last rest timestamp for an actor.
import { consumeWater, thirstLevel,thirstIndex } from "../thirst.js"; // Function to set the last rest timestamp for an actor.
  
/* =======================
 Mechanics
========================= */

/*----------------------------------------------------
Function updateCharacterSheet to track hunger and rest
-----------------------------------------------------*/
function updateCharacterSheet(app, html, sheet) {
  // ✅ Check if the module is enabled
  if (!game.settings.get("fit", "enabled")) return;

  const trackHunger = game.settings.get("fit", "hungerTracking");
  const trackThirst = game.settings.get("fit", "thirstTracking");
  const trackRest = game.settings.get("fit", "restTracking");

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

  // ✅ Remove existing counters before adding new ones
  $(html).find('.counter.hunger, .counter.rest').remove();

  // ✅ If Hunger Tracking is enabled, display it
  if (trackHunger) {
      el.append(`<div class='counter flexrow hunger'><h4>Hunger</h4><div class='counter-value'>${hungerLevel(actor)}</div></div>`);
  }
  // ✅ If Thirst Tracking is enabled, display it
  if (trackThirst) {
    el.append(`<div class='counter flexrow thirst'><h4>Thirst</h4><div class='counter-value'>${thirstLevel(actor)}</div></div>`);
}
  // ✅ If Rest Tracking is enabled, display it
  if (trackRest) {
      el.append(`<div class='counter flexrow rest'><h4>Rest</h4><div class='counter-value'>${restLevel(actor)}</div></div>`);
  }
}

/*-------------------------------------------------
Hooks for Character Sheet UI Updates
---------------------------------------------------*/
Hooks.once('ready', () => {
  Hooks.on('renderActorSheet5eCharacter', (app, html, sheet) => {
      updateCharacterSheet(app, html, sheet); // ✅ Add Hunger and Rest lines without modifying exhaustion
  });
});
  

    

    /*-------------------------------------------------
    HUNGER EFFECTS
    ---------------------------------------------------*/

    // Main function to evaluate and update an actor's hunger status.
    export async function evaluateHunger(actor) {
      const lastMealNotificationAt = actor.getFlag('fit', 'lastMealNotificationAt') || 0;
      const daysSinceLastMealNotification = daysFromSeconds(game.time.worldTime - lastMealNotificationAt);
      const daysHungry = daysHungryForActor(actor);
    
          // ✅ Always update the last notification time when hunger increases
      await actor.setFlag('fit', 'lastMealNotificationAt', game.time.worldTime);
    
      // ✅ Notify players if hunger has increased and at least one day has passed
      if (daysSinceLastMealNotification >= 1) {
    
        // Notify players about hunger
        const chatContent = await sendHungerNotification(actor);
        hungerChatMessage(chatContent, actor);
      } else {
      }
    
      // ✅ Apply or update hunger effects if the actor is hungry.
      if (daysHungry >= 1) {
        if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "hungerEffect")) return;
        await removeHungerEffects(actor);
        const config = activeEffectConfig(actor, daysHungry);
        await addOrUpdateHungerEffect(actor, config);
      }
    
      Hooks.call('evaluateHunger', actor);
    }
  
    // Helper function to configure active effects based on hunger.
    export function activeEffectConfig(actor, daysHungry) {
      if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "hungerEffect")) return; // ✅ Stops additional hunger effects if disabled
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

    /*============================================
    Update Exhaustion UI based on Rest and Hunger
    =============================================*/
  
    export const updateExhaustion = (actor) => {
        if (!game.settings.get("fit", "enabled")) return;

        const trackRest = game.settings.get("fit", "restTracking");
        const trackHunger = game.settings.get("fit", "hungerTracking");
        const trackThirst = game.settings.get("fit", "thirstTracking");
        const rest = trackRest ? restIndex(actor) : 0;
        const hunger = trackHunger ? hungerIndex(actor) : 0;
        const thirst = trackThirst ? thirstIndex(actor) : 0;
        const highestLevel = Math.max(rest, hunger, thirst);
        
        actor.update({ "system.attributes.exhaustion": highestLevel });
    };


    Hooks.on('updateExhaustionEffect', async (actor) => {
      if (!game.settings.get("fit", "enabled")) return;
  
 
      updateExhaustion(actor);
  
      // ✅ Only refresh the UI if the sheet is already open
      if (actor.sheet?.rendered) {
          actor.sheet.render(true);
      } else {
      }

          // ✅ Refresh the Hunger Table if it's open
    const hungerTable = game.modules.get("fit")?.api?.hungerTable;
    if (hungerTable?.rendered) {
        hungerTable.render(true);
    }
});
    

/*==================================================
RESET REST AFTER LONG REST
===================================================*/
Hooks.on('createChatMessage', async (message) => {

  const content = message.content.toLowerCase();
  if (content.includes("takes a long rest")) {
      const actor = game.actors.get(message.speaker.actor);
      if (actor) {
          await resetRestAfterRest(actor);
      }
  }
});

/*==================================================
CONSUME FOOD
===================================================*/  
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
          
    // ✅ Now calls `consumeFood()` from hunger.js inside dnd5e.js
       await consumeFood(actor);
    // ✅ Refresh the Hunger Table if it's open
    const hungerTable = game.modules.get("fit")?.api?.hungerTable;
    if (hungerTable?.rendered) {
        console.log("🔄 Refreshing Hunger Table after consuming food");
        hungerTable.render(true);
    }
          }
        }
      });

/*==================================================
CONSUME Drink
===================================================*/  
  //Consume drink from inventory
  Hooks.on('preUpdateItem', async (item, change) => {
    if (change.hasOwnProperty('sort')) return; // Ignore reordering
     
    // Check if the item's name matches the configured ration name
    if (game.settings.get('fit', 'waterName') === item.name) {
      const actor = game.actors.get(item.actor.id);
   
      if (!actor) {
      console.error("Actor not found for item:", item);
    return;
      }
   
    // Determine if the item was consumed based on its uses or quantity
       const consumedUses = item.system.uses?.value !== undefined && change.system.uses?.value === item.system.uses.value - 1;
       const consumedQuantity = item.system.quantity !== undefined && change.system.quantity === item.system.quantity - 1;
      
       if (consumedUses || consumedQuantity) {
          
    // ✅ Now calls `consumeWater()` from thirst.js inside dnd5e.js
       await consumeWater(actor);
   
          }
        }
      });
      








 

  
