// This script integrates the hunger mechanics into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track hunger, notify players, and apply effects based on hunger levels.


import { daysFromSeconds } from "../time.js"; // Utility functions to calculate time differences.
import { hungerChatMessage, sendHungerNotification } from "../chat.js"; // Function to send hunger notifications to the chat.
import { hungerLevel, hungerIcon, addOrUpdateHungerEffect, removeHungerEffects, daysHungryForActor, consumeFood,hungerIndex } from "../hunger.js"; // Functions and utilities for managing hunger levels and effects.
import { resetRestAfterRest, restIndex, restLevel,daysSinceLastRestForActor } from "../rested.js"; // Function to set the last rest timestamp for an actor.
import { consumeWater, thirstLevel,daysSinceLastDrinkForActor,thirstIndex } from "../thirst.js"; // Function to set the last rest timestamp for an actor.
  
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
    EFFECTS
    ---------------------------------------------------*/
// ✅ Main function to evaluate and update an actor's hunger & thirst status.
export async function evaluateNeeds(actor) {
  const hungerEnabled = game.settings.get("fit", "hungerTracking");
  const thirstEnabled = game.settings.get("fit", "thirstTracking");
  const restEnabled = game.settings.get("fit", "restTracking");

  if (!hungerEnabled && !thirstEnabled && !restEnabled) return;

  const currentTime = game.time.worldTime;
  let shouldSendNotification = false;

  const hungerDue = hungerEnabled && daysFromSeconds(currentTime - (actor.getFlag('fit', 'lastMealNotificationAt') || 0)) >= 1;
  const thirstDue = thirstEnabled && daysFromSeconds(currentTime - (actor.getFlag('fit', 'lastDrinkNotificationAt') || 0)) >= 1;
  const restDue = restEnabled && daysFromSeconds(currentTime - (actor.getFlag('fit', 'lastRestNotificationAt') || 0)) >= 1;

  if (hungerDue || thirstDue || restDue) {
    shouldSendNotification = true;
    
    // 🔄 Update all relevant flags even if not all are due
    if (hungerDue) await actor.setFlag('fit', 'lastMealNotificationAt', currentTime);
    if (thirstDue) await actor.setFlag('fit', 'lastDrinkNotificationAt', currentTime);
    if (restDue) await actor.setFlag('fit', 'lastRestNotificationAt', currentTime);
  }

  // 🥘 Hunger Effects still happen independently
  if (hungerEnabled) {
    const daysHungry = daysHungryForActor(actor);
    if (daysHungry >= 1 && game.settings.get("fit", "hungerEffect")) {
      await removeHungerEffects(actor);
      const config = activeEffectConfig(actor, daysHungry);
      await addOrUpdateHungerEffect(actor, config);
    }
  }

  // 💬 Only send one chat message, even if multiple systems triggered
  if (shouldSendNotification) {
    const chatContent = await sendHungerNotification(actor); 
    if (chatContent.trim()) { // ✅ Only send if content is not empty
        hungerChatMessage(chatContent, actor);
    } else {
        console.warn(`[fit] Skipped sending empty chat message for ${actor.name}`);
    }
}


  Hooks.call('evaluateNeeds', actor);
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

        const trackHunger = game.settings.get("fit", "hungerTracking");
        const trackThirst = game.settings.get("fit", "thirstTracking");
        const trackRest = game.settings.get("fit", "restTracking");
        const hunger = trackHunger ? hungerIndex(actor) : 0;
        const thirst = trackThirst ? thirstIndex(actor) : 0;
        const rest = trackRest ? restIndex(actor) : 0;
        const highestLevel = Math.max(rest, hunger, thirst);
        
        actor.update({ "system.attributes.exhaustion": highestLevel });
    };


    export const updateNeedsUI = (actor) => {
      if (!game.settings.get("fit", "enabled")) return;
    
      updateExhaustion(actor);
    
      if (actor.sheet?.rendered) {
        actor.sheet.render(true);
      }
    
      
    };
    
    Hooks.on('updateExhaustionEffect', async (actor) => {
      updateNeedsUI(actor);
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
CONSUME FOOD OR WATER FROM INVENTORY
===================================================*/  
Hooks.on("updateItem", async (item, change, diff, userId) => {
  const actor = item.actor;
  if (!actor) return;

  const rationName = game.settings.get("fit", "rationName");
  const waterName = game.settings.get("fit", "waterName");
  const isFood = item.name === rationName;
  const isWater = item.name === waterName;
  if (!isFood && !isWater) return;

  console.group(`🧪 [fit] updateItem DETECTED for ${item.name} (Actor: ${actor.name})`);
  console.log("Item:", item);
  console.log("Change Object:", change);
  console.groupEnd();

  // ✅ Check if `uses.spent` exists and is greater than 0
  const spent = foundry.utils.getProperty(item.system, "uses.spent") ?? 0;
  const chargeUsed = spent >= 0; // Simply check if any charge is used

  console.log(`🔍 Uses spent: ${spent}, Charge Used? ${chargeUsed}`);

  if (chargeUsed) {
    console.log(`✅ [fit] Triggering ${isFood ? "consumeFood" : "consumeWater"} for ${actor.name}`);
    if (isFood) await consumeFood(actor);
    if (isWater) await consumeWater(actor);
  }
});
