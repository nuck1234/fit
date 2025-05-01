// This script integrates the hunger mechanics into the D&D 5e system

// This script integrates the hunger mechanics into the D&D 5e system

import { daysFromSeconds } from "../time.js"; // Utility to calculate time differences
import { hungerChatMessage, sendHungerNotification } from "../chat.js"; // Send hunger messages to chat
import {
  hungerLevel,
  hungerIcon,
  addOrUpdateHungerEffect,
  removeHungerEffects,
  daysHungryForActor,
  consumeFood,
  hungerIndex
} from "../hunger.js";
import {
  resetRestAfterRest,
  restIndex,
  restLevel
} from "../rested.js";
import {
  consumeWater,
  thirstLevel,
  thirstIndex
} from "../thirst.js";
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

  
/*========================================================================
Fit Module: Inject Survival UI into CharacterSheets for default and Tidy5e
=========================================================================*/
async function generateSurvivalHtml({ actor, timestamp }) {  
  const hungerEnabled = game.settings.get("fit", "hungerTracking");
  const thirstEnabled = game.settings.get("fit", "thirstTracking");
  const restEnabled = game.settings.get("fit", "restTracking");

  const isTidySheet = document.querySelector(".tidy5e-sheet") !== null;

if (!hungerEnabled && !thirstEnabled && !restEnabled) return;

  // Retrieve the hunger data
  const hunger = hungerLevel(actor) || "Unknown";
  const rationName = game.settings.get("fit", "rationName") ?? "Rations";
  const rationItem = actor.items.find(i => i.name === rationName);
  const hungerVictual = rationItem?.name || "Unknown";
  const hungerQty = rationItem?.system?.quantity ?? 0;
  const hungerCharges = rationItem?.system?.uses?.value ?? 0;
  const hungerIcon = rationItem?.img || "icons/consumables/grains/bread-loaf-boule-rustic-brown.webp";
  const hungerDescription = rationItem?.system.description?.value || "No description";
  const enrichedHungerDescription = await TextEditor.enrichHTML(hungerDescription, { async: true });

  // Retrieve the thirst data 
  const thirst = thirstLevel(actor) || "Unknown";
  const waterName = game.settings.get("fit", "waterName") ?? "Waterskin";  // ✅ Add this
  const thirstItem = actor.items.find(i => i.name === waterName);
  const thirstVictual = thirstItem?.name || "Unknown";
  const thirstQty = thirstItem?.system?.quantity ?? 0;
  const thirstCharges = thirstItem?.system?.uses?.value ?? 0;
  const thirstIcon = thirstItem?.img || "icons/sundries/survival/wetskin-leather-purple.webp";
  const thirstDescription = thirstItem?.system.description?.value || "No description";
  const enrichedThirstDescription = await TextEditor.enrichHTML(thirstDescription, { async: true });

  // Retrieve terrain data
  const terrainKey = game.settings.get("fit", "terrain") || "normal";
  const terrain = terrainData[terrainKey];
  const terrainName = terrain.name;
  const terrainIcon = terrain.icon;
  const terrainDescription = await TextEditor.enrichHTML(terrain.description, { async: true });

  // Retrieve exhaustion data
  const exhaustionLevel = actor.system?.attributes?.exhaustion ?? 0;
  const exhaustionKey = `level_${exhaustionLevel}`;
  const exhaustion = exhaustionData[exhaustionKey] ?? exhaustionData["level_0"];
  const enrichedExhaustionDescription = await TextEditor.enrichHTML(
    exhaustion.description ?? "No description available.",
    { async: true }
  );

  return `
          <section class="items-list fit-survival-needs-section">
            <div class="fit-survival" style="margin-top: 1rem;">
              <div class="items-section card">
                <div class="items-header header fit-toggle-survival" id="fit-toggle-survival-${timestamp}" style="
                cursor: pointer;">
                  <h3 class="item-name">
                    <i class="fas fa-chevron-down" id="fit-survival-icon-${timestamp}" style="margin-right: 0.5em;"></i>
                    Terrain & Exhaustion
                  </h3>
                </div>
                <ul class="item-list" id="fit-survival-body-${timestamp}">
                <li class="item fit-survival-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                  <div class="fit-survival-item-left" style="display: flex; align-items: center; gap: 0.75em;">
                    <strong>Terrain Type:</strong>
                    <span>${terrainName}</span>
                    <div class="fit-item-icon">
                      <img src="${terrainIcon}" class="fit-terrain-icon" />
                      <div class="fit-item-tooltip2">
                        <div class="fit-item-tooltip-title">${terrainName}</div>
                        <div class="fit-item-tooltip-body">${terrainDescription}</div>
                      </div>
                      <div class="fit-item-label">${terrain.label}</div>
                    </div>
                  </div>
                  <div class="fit-survival-item-right" style="display: flex; align-items: center; gap: 0.75em;">
                    <strong>Exhaustion Level:</strong>
                    <span>${exhaustion.name}</span>
                    <div class="fit-item-icon" style="margin-left: 1.5em;"style="margin-right: 1.5em;">
                      <img src="${exhaustion.icon}" class="fit-exhaustion-icon" />
                      <div class="fit-item-tooltip3">
                        <div class="fit-item-tooltip-title">Exhaustion Level: ${exhaustion.name}</div>
                        <div class="fit-item-tooltip-body">${enrichedExhaustionDescription}</div>
                      </div>
                      <div class="fit-item-label">${exhaustion.label}</div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="items-list fit-condition-section">
        <div class="fit-survival" style="margin-top: 1rem;">
        <div class="items-section card">
        <div class="items-header header fit-toggle-condition ${!isTidySheet ? 'fit-default-headings' : ''}" id="fit-toggle-condition-${timestamp}" style="
                    cursor: pointer;
                    display: grid;
                    justify-content: center;
                    grid-template-columns: 2fr 2fr 2fr 1fr 1fr 1fr 1fr;
                    font-size: 0.85em;
                  ">
                  <h3 class="item-name">
                  <i class="fas fa-chevron-down" id="fit-condition-icon-${timestamp}"></i>
                  Fitness and Supplies
                </h3>
                <div class="fit-condition-header-cell" style="${isTidySheet ? 'font-weight: normal;' : 'text-transform: uppercase; display: flex; align-items: center; justify-content: center;'}">Status</div>
                <div class="fit-condition-header-cell" style="${isTidySheet ? 'font-weight: normal;' : 'text-transform: uppercase; display: flex; align-items: center; justify-content: center;'}">Victual Type</div>
                <div class="fit-condition-header-cell" style="${isTidySheet ? 'font-weight: normal;' : 'text-transform: uppercase; display: flex; align-items: center; justify-content: center;'}">Quantity</div>
                <div class="fit-condition-header-cell" style="${isTidySheet ? 'font-weight: normal;' : 'text-transform: uppercase; display: flex; align-items: center; justify-content: center;'}">Charges</div>
                <div class="fit-condition-header-cell" style="${isTidySheet ? 'font-weight: normal;' : 'text-transform: uppercase; display: flex; align-items: center; justify-content: center;'}">Refill</div>
                <div class="fit-condition-header-cell" style="${isTidySheet ? 'font-weight: normal;' : 'text-transform: uppercase; display: flex; align-items: center; justify-content: center;'}">Use Item</div>
              </div>
              <ul class="item-list" id="fit-condition-body-${timestamp}">
                ${hungerEnabled
                  ? `
                    <li class="item fit-condition-item" style="display: grid; grid-template-columns: 2fr 2fr 2fr 1fr 1fr 1fr 1fr; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                      <div class="fit-condition-cell">Hunger</div>
                      <div class="fit-condition-cell" style="text-align: center;">${hunger}</div>
                      <div class="fit-condition-cell" style="text-align: center;">${hungerVictual}</div>
                      <div class="fit-condition-cell" style="text-align: center;">${hungerQty}</div>
                      <div class="fit-condition-cell" style="text-align: center;">${hungerCharges}</div>
                      <div class="fit-condition-cell" style="text-align: center;">-</div>
                      <div class="fit-item-icon">
                        <img src="${hungerIcon}" class="fit-eat-button" data-actor-id="${actor.id}" data-item-id="${
                        rationItem?.id
                      }" />
                        <div class="fit-item-tooltip">
                          <div class="fit-item-tooltip-title">${hungerVictual}</div>
                          <div class="fit-item-tooltip-body">${enrichedHungerDescription}</div>
                        </div>
                        <div class="fit-item-charges">${hungerCharges}</div>
                        <div class="fit-item-label">${hungerVictual}</div>
                      </div>
                    </li>
                  `
                  : ''}
                ${thirstEnabled
                  ? `
                    <li class="item fit-condition-item" style="display: grid; grid-template-columns: 2fr 2fr 2fr 1fr 1fr 1fr 1fr; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                      <div class="fit-condition-cell">Thirst</div>
                      <div class="fit-condition-cell"  style="text-align: center;" >${thirst}</div>
                      <div class="fit-condition-cell"  style="text-align: center;">${thirstVictual}</div>
                      <div class="fit-condition-cell"  style="text-align: center;">${thirstQty}</div>
                      <div class="fit-condition-cell"  style="text-align: center;">${thirstCharges}</div>
                      <div class="fit-condition-cell"  style="text-align: center;">
                        <button class="fit-refill-water" data-actor-id="${actor.id}" title="Refill water">↺</button>
                      </div>
                      <div class="fit-item-icon">
                        <img src="${thirstIcon}" class="fit-drink-button" data-actor-id="${actor.id}" data-item-id="${
                        thirstItem?.id
                      }" />
                        <div class="fit-item-tooltip">
                          <div class="fit-item-tooltip-title">${thirstVictual}</div>
                          <div class="fit-item-tooltip-body">${enrichedThirstDescription}</div>
                        </div>
                        <div class="fit-item-charges">${thirstCharges}</div>
                        <div class="fit-item-label">${thirstVictual}</div>
                    </div>
                    </li>
                  `
                  : ''}
                ${restEnabled
                  ? `
                    <li class="item fit-condition-item" style="display: grid; grid-template-columns: 2fr 2fr 2fr 1fr 1fr 1fr 1fr; align-items: center; padding: 0.5em 1em; border-top: 1px solid var(--dnd5e-color-faint);">
                      <div class="fit-condition-cell">Rest</div>
                      <div class="fit-condition-cell"  style="text-align: center;">${restLevel(actor)}</div>
                      <div class="fit-condition-cell"  style="text-align: center;"> Long Rest</div>
                      <div class="fit-condition-cell"  style="text-align: center;">-</div>
                      <div class="fit-condition-cell"  style="text-align: center;">-</div>
                      <div class="fit-condition-cell"  style="text-align: center;">-</div>
                      <div class="fit-item-icon" style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <img src="modules/fit/templates/icons/bedroll-grey.webp" class="fit-rest-button" data-actor-id="${actor.id}" />
                        <div class="fit-item-tooltip">
                          <div class="fit-item-tooltip-title">Long Rest</div>
                          <div class="fit-item-tooltip-body">Take a long rest to recover health and reset fatigue.</div>
                        </div>
                        <div class="fit-item-label">Long Rest</div>
                      </div>
                    </li>
                  `
                  : ''}
              </ul>
            </div>
          </div>
        </section>
      `;
    }
    /*=========================================
    Inject Survival UI
    =========================================*/
      async function renderSurvivalUI(app, html, data) {
      const actor = app.actor;
      if (!actor || actor.type !== "character") return;


      if (html instanceof jQuery) {
        html = html[0]; // Always use raw DOM element
      }
    
      const timestamp = Date.now();
      const isTidy = html.classList.contains("tidy5e-sheet");
    
      let effectsTab;
      let container;
    
      if (isTidy) {
        effectsTab = html.querySelector(".tidy-tab.effects");
        container = effectsTab?.querySelector(".scroll-container.flex-column.small-gap");
      } else {
        effectsTab = html.querySelector('.tab[data-tab="effects"]');
        container = effectsTab?.querySelector(".items-list");
      }
    
      if (!container) {
        console.warn("[fit] ❌ Could not find Effects tab container.");
        return;
      }
    
      // Remove old
      container.querySelector(".fit-survival-needs-section")?.remove();
      container.querySelector(".fit-condition-section")?.remove();
      container.querySelector(".fit-survival-header")?.remove();
    
      // Generate unified HTML
      const htmlContent = await generateSurvivalHtml({ actor, timestamp });
      if (!htmlContent) return;
    
      if (isTidy) {
        container.insertAdjacentHTML("beforeend", htmlContent);
      } else {
        $(container).append(htmlContent);
      }
    
      const $container = $(container);
      
         
      /*=========================================
      Fixed Position Floating Tooltips - Right
      =========================================*/
      $container.find(".fit-item-icon").hover(
        function (event) {
          const tooltipContent = $(this).find(".fit-item-tooltip2");
          if (!tooltipContent.length) return;
      
          const floatingTooltip = $('<div class="floating-fit-tooltip2"></div>')
            .html(tooltipContent.html())
            .appendTo(document.body);
      
          floatingTooltip.css({
            position: "absolute",
            top: event.pageY + 10,
            left: event.pageX + 10
          });
        },
        function () {
          $(".floating-fit-tooltip2").remove();
        }
      );

      /*=========================================
        Fixed Position Floating Tooltips - Left
        =========================================*/
      $container.find(".fit-item-icon").hover(
        function (event) {
          const tooltipContent = $(this).find(".fit-item-tooltip3");
          if (!tooltipContent.length) return;

          const floatingTooltip = $('<div class="floating-fit-tooltip3"></div>')
            .html(tooltipContent.html())
            .appendTo(document.body);

          floatingTooltip.css({
            position: "absolute",
            top: event.pageY + 10,
            // Change this line to position on the left
            left: event.pageX - floatingTooltip.outerWidth() - 10 
          });
        },
        function () {
          $(".floating-fit-tooltip3").remove();
        }
      );
      
      
 
      /*=========================================
      Toggle Collapse Functionality
      =========================================*/
      // ✅ Add click event to toggle collapse
      $container.find(`#fit-toggle-condition-${timestamp}`).on("click", () => { // ✅ Use the same timestamp
        const body = $container.find(`#fit-condition-body-${timestamp}`); // ✅ Use the same timestamp
        const icon = $container.find(`#fit-condition-icon-${timestamp}`); // ✅ Use the same timestamp
           
      body.toggle();
      icon.toggleClass("collapsed");
    });
    
    // ✅ Survival Needs Toggle (new part)
    $container.find(`#fit-toggle-survival-${timestamp}`).on("click", () => { // ✅ Use the same timestamp
      const body = $container.find(`#fit-survival-body-${timestamp}`); // ✅ Use the same timestamp
      const icon = $container.find(`#fit-survival-icon-${timestamp}`); // ✅ Use the same timestamp
            
      body.toggle();
      icon.toggleClass("collapsed");
      
      });
      
    // ✅ Add style for rotation ONCE
      if (!document.getElementById("fit-collapse-style")) {
        const style = document.createElement("style");
        style.id = "fit-collapse-style";
        style.innerHTML = `
          #fit-condition-icon.collapsed,
          #fit-survival-icon.collapsed {
          transform: rotate(-90deg);
          transition: transform 0.2s ease;
       }
     `;
     document.head.appendChild(style);
    }
      
      // ✅ Attach button handlers here     
      const $html = $(html);
      
      $html.find("img.fit-eat-button").off("click").on("click", async (event) => {
        event.preventDefault();
        await clickEatOrDrink(event, "eat");
      });   

      $html.find("img.fit-drink-button").off("click").on("click", async (event) => {
        event.preventDefault();
        await clickEatOrDrink(event, "drink");
      });
          
      $html.find("img.fit-eat-button").off("contextmenu").on("contextmenu", (event) => openItemSheet(event));
      $html.find("img.fit-drink-button").off("contextmenu").on("contextmenu", (event) => openItemSheet(event));
      
      $html.find("img.fit-rest-button").off("click").on("click", async (event) => {
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
          
      $html.find(".fit-refill-water").off("click").on("click", async (event) => {
        event.preventDefault();
        const actorId = event.currentTarget.dataset.actorId;
        const actor = game.actors.get(actorId);
        if (!actor) return;
          
        const waterName = game.settings.get("fit", "waterName");
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
          
      }

      /*=========================================
      Hook Survival UI into Sheet Renders
      =========================================*/

      // Hook into Tidy5e and Default D&D5e character sheets
      ["tidy5e-sheet.renderActorSheet", "renderActorSheet5eCharacter2"].forEach(hook => {
        Hooks.on(hook, async (app, html, data) => {
          await renderSurvivalUI(app, html, data);
        });
      });
  /*=========================================
  Survival Needs Changed
  =========================================*/
      
  Hooks.on("fitSurvivalNeedsChanged", async (actor, timestamp) => {
    if (!actor || actor.type !== "character") return;
  
    const html = actor.sheet?.element?.[0];
    if (!html) return;
  
    const isTidy = html.classList.contains("tidy5e-sheet");
  
    let container;
    if (isTidy) {
      const effectsTab = html.querySelector(".tidy-tab.effects");
      container = effectsTab?.querySelector(".scroll-container.flex-column.small-gap");
    } else {
      const effectsTab = html.querySelector('.tab[data-tab="effects"]');
      container = effectsTab?.querySelector(".items-list") || html.querySelector(".items-list");
    }
  
    if (!container) {
      console.warn("[fit] ❌ No container found in Survival Needs Changed");
      return;
    }
  
    if (hasInjectedThisTimeAdvance.has(actor)) {
      console.log("[fit] Skipping Survival Header Injection (Already Injected This Cycle)");
      return;
    }
  
    // Clean up old
    container.querySelector(".fit-survival-needs-section")?.remove();
    container.querySelector(".fit-condition-section")?.remove();
    container.querySelector(".fit-survival-header")?.remove();
  
    const htmlContent = await generateSurvivalHtml({ actor, timestamp });
    if (!htmlContent) return;
  
    container.insertAdjacentHTML("beforeend", htmlContent);
  
    console.log("[fit] Injecting Survival Header (fitSurvivalNeedsChanged - This Cycle)");
    hasInjectedThisTimeAdvance.add(actor);
  
    const $container = $(container);
    setupTooltips($container);
    setupCollapseToggles($container, timestamp);
    attachButtonHandlers($(html));
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


  if (isFood) {
    
    await consumeFood(actor);
  }

  if (isWater) {
    
    await consumeWater(actor);
  }
});

/*==================================================
DND5e Trigger Eat or Drink
===================================================*/

/*-------------------------------------------------
clickEatOrDrink: Handles chat button use of item
---------------------------------------------------*/
export const clickEatOrDrink = async (event, type) => {
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
      const stat = type === "drink" ? "Thirst" : "Hunger";
    
      ui.notifications.info(`${actor.name} ${action} ${item.name}. ${stat} reset.`);
    }

    updateExhaustion(actor);
  }
};

/*-------------------------------------------------
openItemSheet: Right-click to open item sheet
---------------------------------------------------*/
export const openItemSheet = async (event) => {
  event.preventDefault();
  const actorId = event.currentTarget.dataset.actorId;
  const itemId = event.currentTarget.dataset.itemId;
  const actor = game.actors.get(actorId);
  const item = actor?.items.get(itemId);
  if (item?.sheet) item.sheet.render(true);
};

/*--------------------------------------------------
Attach Chat Button Handlers to Sheet
--------------------------------------------------*/
Hooks.on("renderActorSheet5eCharacter2", (app, html, data) => {
  html.find('img.fit-eat-button').off('click').on('click', async event => clickEatOrDrink(event, "eat"));
  html.find('img.fit-drink-button').off('click').on('click', async event => clickEatOrDrink(event, "drink"));

  html.find('img.fit-eat-button').off('contextmenu').on('contextmenu', event => openItemSheet(event));
  html.find('img.fit-drink-button').off('contextmenu').on('contextmenu', event => openItemSheet(event));

  html.find('img.fit-rest-button').off('click').on('click', async (event) => {
    event.preventDefault();
    const actorId = event.currentTarget.dataset.actorId;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    await actor.longRest();

    if (game.settings.get("fit", "confirmChat")) {
      ui.notifications.info(`${actor.name} takes a long rest.`, { permanent: false });
    }

    updateExhaustion(actor);
  });
});

/**
 * ==========================================
 * DND5e: Auto-Patch Consumables (Waterskin & Rations)
 * Ensures they have correct activation & consumption data.
 * ==========================================
 */
export async function autoPatchConsumables() {
  const rationName = game.settings.get("fit", "rationName")?.toLowerCase();
  const waterName = game.settings.get("fit", "waterName")?.toLowerCase();
  const consumptionType = "itemUses";

  /**
   * 🔁 Loop over all actors and their items
   * Automatically configure Waterskin and Rations if needed
   */
  for (const actor of game.actors.contents) {
    for (const item of actor.items.contents) {
      const itemName = item.name.toLowerCase();
      if (![rationName, waterName].includes(itemName)) continue;

      const consumptionTarget = item.id;
      const useActivity = item.system.activities?.use ?? null;

      const needsPatch =
        !useActivity ||
        !useActivity.type ||
        item.system.consumption?.target !== consumptionTarget;

      if (!needsPatch) continue;

      // ✅ Patch the item with standard activation/consumption config
      await item.update({
        "system.activation.type": "action",
        "system.consumption.type": consumptionType,
        "system.consumption.amount": 1,
        "system.consumption.target": consumptionTarget,
        "system.consume": {
          "type": "charges",
          "amount": 1
        },
        "system.activities.use": {
          "activation": { "type": "action", "cost": 1 },
          "consumption": {
            "type": consumptionType,
            "amount": 1,
            "target": consumptionTarget
          }
        }
      });
    }
  }

  /**
   * 🪝 Hook: Pre-patch late-added items (like newly dropped or imported items)
   */
  Hooks.on("preUseItem", async (item, config, options) => {
    const actor = item.actor;
    if (!actor) return;

    const itemName = item.name.toLowerCase();
    if (![rationName, waterName].includes(itemName)) return;

    const consumptionTarget = item.id;
    const needsPatch =
      !item.system.activation?.type ||
      item.system.consumption?.target !== consumptionTarget ||
      !item.system.activities?.use;

    if (!needsPatch) return;

    // ✅ Patch the item before use to ensure it works with item.use()
    await item.update({
      "system.activation.type": "action",
      "system.consumption.type": consumptionType,
      "system.consumption.amount": 1,
      "system.consumption.target": consumptionTarget,
      "system.consume": {
        "type": "charges",
        "amount": 1
      },
      "system.activities.use": {
        "activation": { "type": "action", "cost": 1 },
        "consumption": {
          "type": consumptionType,
          "amount": 1,
          "target": consumptionTarget
        }
      }
    });

    if (game.user.isGM) {
      ui.notifications.info(`[fit] ${item.name} was auto-configured for usage.`);
    }
  });
}