// This script integrates the hunger mechanics into the D&D 5e system within the Time-2-Eat module.
// It includes logic to track hunger, notify players, and apply effects based on hunger levels.


import { daysFromSeconds } from "../time.js"; // Utility functions to calculate time differences.
import { hungerChatMessage, sendHungerNotification } from "../chat.js"; // Function to send hunger notifications to the chat.
import { hungerLevel, hungerIcon, addOrUpdateHungerEffect, removeHungerEffects, daysHungryForActor, consumeFood,hungerIndex } from "../hunger.js"; // Functions and utilities for managing hunger levels and effects.
import { resetRestAfterRest, restIndex, restLevel } from "../rested.js"; // Function to set the last rest timestamp for an actor.
import { consumeWater, thirstLevel,thirstIndex } from "../thirst.js"; // Function to set the last rest timestamp for an actor.
import { terrainData, exhaustionData } from "../constants.js";




/* ======================================
 DND5e Legacy Character Sheet UI Updates
======================================== */
/*----------------------------------------------------
Function to track hunger and rest
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
Hooks for the DND5e Legacy Character Sheet UI Updates
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


    (async () => {
    const hunger = hungerLevel(actor) || "Unknown";
    const rationName = game.settings.get("fit", "rationName") ?? "Rations";
    const rationItem = actor.items.find(i => i.name === rationName);
    const hungerVictual = rationItem?.name || "Unknown";
    const hungerQty = rationItem?.system?.quantity ?? 0;
    const hungerCharges = rationItem?.system?.uses?.value ?? 0;
    const hungerIcon = rationItem?.img || "icons/consumables/grains/bread-loaf-boule-rustic-brown.webp";
    const hungerDescription = rationItem?.system.description?.value || "No description";
    const enrichedHungerDescription = await TextEditor.enrichHTML(hungerDescription, { async: true });

     
    const thirst = thirstLevel(actor) || "Unknown";
    const waterName = game.settings.get("fit", "waterName") ?? "Waterskin";  // ✅ Add this
    const thirstItem = actor.items.find(i => i.name === waterName);
    const thirstVictual = thirstItem?.name || "Unknown";
    const thirstQty = thirstItem?.system?.quantity ?? 0;
    const thirstCharges = thirstItem?.system?.uses?.value ?? 0;
    const thirstIcon = thirstItem?.img || "icons/sundries/survival/wetskin-leather-purple.webp";
    const thirstDescription = thirstItem?.system.description?.value || "No description";
    const enrichedThirstDescription = await TextEditor.enrichHTML(thirstDescription, { async: true });

  
    const terrainKey = game.settings.get("fit", "terrain") || "normal";
    const terrain = terrainData[terrainKey];
    const terrainName = terrain.name;
    const terrainIcon = terrain.icon;
    const terrainDescription = await TextEditor.enrichHTML(terrain.description, { async: true });

    const exhaustionLevel = actor.system?.attributes?.exhaustion ?? 0;
    const exhaustionKey = `level_${exhaustionLevel}`;
    const exhaustion = exhaustionData[exhaustionKey] ?? exhaustionData["level_0"];
    
    const enrichedExhaustionDescription = await TextEditor.enrichHTML(
      exhaustion.description ?? "No description available.",
      { async: true }
    );

    


    const htmlToInject = `
      <section class="items-list fit-survival-header">
        <div class="fit-survival" style="margin-top: 1rem;">
          <div class="items-section card">
            <div class="items-header header">
              <h3 class="item-name"><i class="fas fa-leaf"></i> Survival Needs</h3>
            </div>
       
        <ul class="item-list">
                <li class="item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
            <!-- Left: Terrain Info -->
            <div style="display: flex; align-items: center; gap: 0.75em;">
              <strong>Terrain Type:</strong>
              <span>${terrainName}</span>

              <div class="fit-item-icon">
                <img src="${terrainIcon}" class="fit-terrain-icon" />
                <div class="fit-item-tooltip">
                  <div class="fit-item-tooltip-title">${terrainName}</div>
                  <div class="fit-item-tooltip-body">${terrainDescription}</div>
                </div>
                <div class="fit-item-label">${terrain.label}</div>
              </div>
            </div>

            <!-- Right: Exhaustion Placeholder -->
            <div style="display: flex; align-items: center; gap: 0.75em;">
  <strong>Exhaustion Level:</strong>
  <span>${exhaustion.name}</span>

  <div class="fit-item-icon">
    <img src="${exhaustion.icon}" class="fit-exhaustion-icon" />

    <div class="fit-item-tooltip">
      <div class="fit-item-tooltip-title">Exhaustion Level: ${exhaustion.name}</div>
      <div class="fit-item-tooltip-body">${enrichedExhaustionDescription}</div>
    </div>

    <div class="fit-item-label">${exhaustion.label}</div>
  </div>
</div>
          </li>

        </ul>
        </div> <!-- ends items-section.card -->
        </div> <!-- ends fit-survival -->

      <section class="items-list fit-survival-header">
        <div class="fit-survival" style="margin-top: 1rem;">
          <div class="items-section card">
            <div class="items-header header" style="
              display: grid;
              grid-template-columns: 3fr 3fr 2fr 1fr 1fr 1fr 1fr;
              align-items: center;
              font-size: 0.75em;
            ">
              <h3 class="item-name" style="margin: 0;">
                <i class="fas fa-leaf"></i> Condition
              </h3>
              <div style="padding-left: 1rem;">STATUS</div>
              <div style="text-align: left;">VICTUAL TYPE</div>
              <div style="text-align: left;">QUANTITY</div>
              <div style="text-align: center;">CHARGES</div>
              <div style="text-align: center;">REFILL</div>
              <div style="text-align: center;">USE ITEM</div>
            </div>

            <ul class="item-list">
              ${hungerEnabled ? `
                  <li class="item" style="display: grid; grid-template-columns: 3fr 3fr 2fr 1fr 1fr 1fr 1fr; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                  <div>Hunger</div>
                  <div>${hunger}</div>
                  <div>${hungerVictual}</div>
                  <div style="text-align: center;">${hungerQty}</div>
                  <div style="text-align: center;">${hungerCharges}</div>
                  <div style="text-align: center;">-</div>
                  <div class="fit-item-icon">
                    <img src="${hungerIcon}" class="fit-eat-button" data-actor-id="${actor.id}" data-item-id="${rationItem?.id}" />
                    
                    <div class="fit-item-tooltip">
                      <div class="fit-item-tooltip-title">${hungerVictual}</div>
                      <div class="fit-item-tooltip-body">${enrichedHungerDescription}</div>
                    </div>

                    <div class="fit-item-charges">${hungerCharges}</div>
                    <div class="fit-item-label">${hungerVictual}</div>
                  </div>
                </li>
              ` : ''}
              ${thirstEnabled ? `
                <li class="item" style="display: grid; grid-template-columns: 3fr 3fr 2fr 1fr 1fr 1fr 1fr; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                  <div>Thirst</div>
                  <div>${thirst}</div>
                  <div style="text-align: ;">${thirstVictual}</div>
                  <div style="text-align: center;">${thirstQty}</div>
                  <div style="text-align: center;">${thirstCharges}</div>
                  <div style="text-align: center;">
                    <button class="fit-refill-water" data-actor-id="${actor.id}" title="Refill water">↺</button>
                  </div>
                  <div class="fit-item-icon">
                    <img src="${thirstIcon}" class="fit-drink-button" data-actor-id="${actor.id}" data-item-id="${thirstItem?.id}" />
                    
                    <div class="fit-item-tooltip">
                      <div class="fit-item-tooltip-title">${thirstVictual}</div>
                      <div class="fit-item-tooltip-body">${enrichedThirstDescription}</div>
                    </div>

                    <div class="fit-item-charges">${thirstCharges}</div>
                    <div class="fit-item-label">${thirstVictual}</div>
                </div>
                </li>
              ` : ''}

              ${restEnabled ? `
                <li class="item" style="display: grid; grid-template-columns: 3fr 3fr 2fr 1fr 1fr 1fr 1fr; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                  <div>Rest</div>
                  <div>${restLevel(actor)}</div>
                  <div> Long Rest</div>
                  <div style="text-align: center;">-</div>
                  <div style="text-align: center;">-</div>
                  <div style="text-align: center;">-</div>
                  <div class="fit-item-icon" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                    <img src="modules/fit/templates/icons/bedroll-grey.webp" class="fit-rest-button" data-actor-id="${actor.id}" />

                    <div class="fit-item-tooltip">
                      <div class="fit-item-tooltip-title">Long Rest</div>
                      <div class="fit-item-tooltip-body">Take a long rest to recover health and reset fatigue.</div>
                    </div>

                    <div class="fit-item-label">Long Rest</div>
                  </div>
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

    
  })();

  }, 0);
});


/*==================================================
Mechanics for Hunger, Thirst, and Rest
===================================================*/

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
    /*===============================================================
   Update Exhaustion based on Hunger, thirst and rest
    ==================================================================*/
  
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


/*==================================================
DND5e Trigger Eat or Drink
===================================================*/

/*-------------------------------------------------
DND5e clickEatOrDrink function
---------------------------------------------------*/

const clickEatOrDrink = async (event, type) => {
  event.preventDefault();
  const actorId = event.currentTarget.dataset.actorId;
  const itemId = event.currentTarget.dataset.itemId;
  const actor = game.actors.get(actorId);
  const item = actor?.items.get(itemId);

  if (!actor || !item) {
    return ui.notifications.error("Actor or item not found.");
  }

  const result = await item.use({ event, legacy: false }, { event });
  if (result !== false) {
    const flagKey = type === 'drink' ? "lastDrinkAt" : "lastEatAt";
    await actor.setFlag("fit", flagKey, game.time.worldTime);

    if (game.settings.get("fit", "confirmChat")) {
      const action = type === "drink" ? "drinks from" : "eats";
      ChatMessage.create({ content: `${actor.name} ${action} ${item.name}. ${type === "drink" ? "Thirst" : "Hunger"} reset.` });
    }

    updateExhaustion(actor);
  }
};

const openItemSheet = async (event) => {
  event.preventDefault();
  const actorId = event.currentTarget.dataset.actorId;
  const itemId = event.currentTarget.dataset.itemId;
  const actor = game.actors.get(actorId);
  const item = actor?.items.get(itemId);
  if (item?.sheet) item.sheet.render(true);
};


/*--------------------------------------------------
DND5e Chat button click handlers
--------------------------------------------------*/
Hooks.on("renderActorSheet5e", (app, html, data) => {
  html.on('click', 'img.fit-eat-button', event => clickEatOrDrink(event, "eat"));
  html.on('click', 'img.fit-drink-button', event => clickEatOrDrink(event, "drink"));

  html.on('contextmenu', 'img.fit-eat-button', event => openItemSheet(event));
  html.on('contextmenu', 'img.fit-drink-button', event => openItemSheet(event));
  
  /*--------------------------------------------------
  DND5e UI button click handlers
  --------------------------------------------------*/

  // Left-click interactions
  html.on('click', 'img.fit-drink-button', async (event) => clickEatOrDrink(event, "drink"));
  html.on('click', 'img.fit-eat-button', async (event) => clickEatOrDrink(event, "eat"));

  // Right-click to open sheet
  html.on('contextmenu', 'img.fit-drink-button', async (event) => {
    const actor = game.actors.get(event.currentTarget.dataset.actorId);
    const item = actor?.items.get(event.currentTarget.dataset.itemId);
    if (item?.sheet) item.sheet.render(true);
  });

  html.on('contextmenu', 'img.fit-eat-button', async (event) => {
    event.preventDefault();
    event.preventDefault();
    const actor = game.actors.get(event.currentTarget.dataset.actorId);
    const item = actor?.items.get(event.currentTarget.dataset.itemId);
    if (item?.sheet) item.sheet.render(true);
  });
  html.on('click', 'img.fit-rest-button', async (event) => {
    event.preventDefault();
    const actorId = event.currentTarget.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (!actor) return;
  
    await actor.longRest();
  
    if (game.settings.get("fit", "confirmChat")) {
      ChatMessage.create({ content: `${actor.name} takes a long rest.` });
    }
  
    updateExhaustion(actor);
  });
  
});

