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
Function Legacy updateCharacterSheet to track hunger and rest
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

/*----------------------------------------------------
Function "Default" updateCharacterSheet to track hunger and rest
-----------------------------------------------------*/
Hooks.on("renderActorSheet5eCharacter2", (app, html, sheet) => {
  if (!game.settings.get("fit", "enabled")) return;
  //console.log("[fit] Injecting Survival heading into Effects tab...");

  setTimeout(() => {
    const actor = app.actor || sheet.actor;
    if (!actor) {
      console.warn("[fit] No actor found.");
      return;
    }

    const hungerEnabled = game.settings.get("fit", "hungerTracking");
    const thirstEnabled = game.settings.get("fit", "thirstTracking");
    const restEnabled = game.settings.get("fit", "restTracking");

    if (!hungerEnabled && !thirstEnabled && !restEnabled) return;

    const effectsTab = html.find(`.tab[data-tab="effects"]`);
    if (!effectsTab.length) {
      console.warn("[fit] Could not find Effects tab.");
      return;
    }

    if (effectsTab.find(".fit-survival-header").length > 0) return;

    const terrain = game.settings.get("fit", "terrain") || "Unknown";

    const hunger = hungerLevel(actor) || "Unknown";
    const rationItem = actor.items.find(i => i.name === game.settings.get('fit', 'rationName'));
    const hungerVictual = rationItem?.name || "Unknown";
    const hungerQty = rationItem?.system?.quantity ?? 0;
    const hungerCharges = rationItem?.system?.uses?.value ?? 0;

    const thirst = thirstLevel(actor) || "Unknown";
    const waterItem = actor.items.find(i => i.name === game.settings.get('fit', 'waterName'));
    const thirstVictual = waterItem?.name || "Unknown";
    const thirstQty = waterItem?.system?.quantity ?? 0;
    const thirstCharges = waterItem?.system?.uses?.value ?? 0;

    const htmlToInject = `
      <section class="items-list fit-survival-header">
        <div class="fit-survival" style="margin-top: 1rem;">
          <div class="items-section card">
            <div class="items-header header">
              <h3 class="item-name"><i class="fas fa-leaf"></i> Survival Needs</h3>
            </div>
            <ul class="item-list"></ul>
          </div>
        </div>
      </section>

      <section class="items-list fit-survival-header">
        <div class="fit-survival" style="margin-top: 1rem;">
          <div class="items-section card">
            <div class="items-header header" style="
              display: grid;
              grid-template-columns: 3fr 3fr 2fr 1fr 1fr 1fr;
              align-items: center;
              font-size: 0.75em;
            ">
              <h3 class="item-name" style="margin: 0;">
                <i class="fas fa-leaf"></i> Condition
              </h3>
              <div style="padding-left: 1rem;">STATUS</div>
              <div style="text-align: left;">VICTUAL TYPE</div>
              <div style="text-align: center;">QUANTITY</div>
              <div style="text-align: center;">CHARGES</div>
              <div style="text-align: center;">REFILL</div>
            </div>

            <ul class="item-list">
              ${hungerEnabled ? `
                <li class="item" style="display: grid; grid-template-columns: 3fr 3fr 2fr 1fr 1fr 1fr; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                  <div>Hunger</div>
                  <div>${hunger}</div>
                  <div>${hungerVictual}</div>
                  <div style="text-align: center;">${hungerQty}</div>
                  <div style="text-align: center;">${hungerCharges}</div>
                  <div style="text-align: center;">-</div>
                </li>
              ` : ''}

              ${thirstEnabled ? `
                <li class="item" style="display: grid; grid-template-columns: 3fr 3fr 2fr 1fr 1fr 1fr; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                  <div>Thirst</div>
                  <div>${thirst}</div>
                  <div>${thirstVictual}</div>
                  <div style="text-align: center;">${thirstQty}</div>
                  <div style="text-align: center;">${thirstCharges}</div>       
                  <div style="text-align: center;"> <button class="fit-refill-water" data-actor-id="${actor.id}" title="Refill water">↺</button>
                  </div>
                </li>
              ` : ''}

              ${restEnabled ? `
                <li class="item" style="display: grid; grid-template-columns: 3fr 3fr 2fr 1fr 1fr 1fr; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                  <div>Rest</div>
                  <div>${restLevel(actor)}</div>
                  <div>Long Rest</div>
                  <div style="text-align: center;">-</div>
                  <div style="text-align: center;">-</div>
                  <div style="text-align: center;">-</div>
                </li>
              ` : ''}
            </ul>
          </div>
        </div>
      </section>
    `;

    effectsTab.append(htmlToInject);
    //console.log("[fit] ✅ Injected Survival Needs header with terrain row.");

    // ✅ Attach Refill button handler
    html.find('.fit-refill-water').on('click', async (event) => {
      event.preventDefault();
      const actorId = event.currentTarget.dataset.actorId;
      const actor = game.actors.get(actorId);
      if (!actor) return;

      const waterName = game.settings.get('fit', 'waterName');
      const waterskin = actor.items.getName(waterName);
      if (!waterskin) {
        ui.notifications.warn(`${actor.name} has no ${waterName} to refill.`);
        return;
      }

      await waterskin.update({
        "system.uses.value": waterskin.system.uses.max,
        "system.uses.spent": 0
      });

      ui.notifications.info(`${actor.name}'s ${waterskin.name} has been refilled.`);
      actor.sheet.render(true);
    });

  }, 0);
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
    if (chatContent && chatContent.trim()) { // ✅ Fix: prevent .trim() on undefined
      hungerChatMessage(chatContent, actor);
    } else {
      console.warn(`[fit] Skipped sending empty chat message for ${actor.name}`);
    }
  }

  Hooks.call('evaluateNeeds', actor);
}




  
    // Helper function to configure active effects based on hunger.
    export function activeEffectConfig(actor, daysHungry) {
      if (!game.settings.get("fit", "enabled") || !game.settings.get("fit", "hungerEffect")) return;
    
      const currentHungerLevel = hungerLevel(actor);
      const iconPath = hungerIcon(currentHungerLevel);
    
      // ✅ Check Foundry version and choose the right property
      const foundryMajorVersion = parseInt(game.version?.split(".")[0]) || 10; // fallback to 10 if undefined
      const isV12OrNewer = foundryMajorVersion >= 12;
    
      const effectConfig = {
        label: `Hunger Level (${currentHungerLevel})`,
        flags: { fit: { hungerEffect: true } },
        changes: [
          {
            key: 'system.attributes.hp.tempmax',
            mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
            value: -daysHungry
          }
        ],
        duration: { rounds: 10 }
      };
    
      // 🔄 Add appropriate image property
      if (isV12OrNewer) {
        effectConfig.img = iconPath;
      } else {
        effectConfig.icon = iconPath;
      }
    
      return effectConfig;
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

  //console.group(`🧪 [fit] updateItem DETECTED for ${item.name} (Actor: ${actor.name})`);
  //console.log("Item:", item);
  //console.log("Change Object:", change);
  //console.groupEnd();

  if (isFood) {
    //console.log(`✅ [fit] Detected Ration use. Running consumeFood for ${actor.name}`);
    await consumeFood(actor);
  }

  if (isWater) {
    //console.log(`✅ [fit] Detected Water use. Running consumeWater for ${actor.name}`);
    await consumeWater(actor);
  }
});


