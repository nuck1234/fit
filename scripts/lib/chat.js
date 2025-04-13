import { hungerIcon } from "./hunger.js";
import { daysHungryForActor, hungerLevel } from "./hunger.js";
import { daysSinceLastDrinkForActor, thirstLevel } from "./thirst.js";
import { daysSinceLastRestForActor, restLevel } from "./rested.js";
import { localize } from './utils.js';
import { updateExhaustion } from "./systems/dnd5e.js";
/**
 * Generates and sends a chat message to the GM(s) notifying them of hunger changes for an actor.
 *
 * @param {Object} actor - The actor who consumed rations.
 * @param {number} rations - The number of rations d by the actor.
 * @param {number} newHungerLevel - The updated hunger level of the actor after consuming rations.
 */
export function hungerChatMessageToGMs(actor, rations, newHungerLevel) {
  // Identify all users with GM permissions in the game.
  const gmUsers = game.users
    .filter((user) => user.isGM)// Filter users who are GMs.
    .map((user) => user.id); // Extract their user IDs.

  // Construct the content of the chat message, including actor's name, rations consumed, and new hunger level.
  const messageContent = 
    `<strong> ${actor.name} </strong> consumed ${rations} ration(s) and reduced their hunger to <strong>Hunger Level ${newHungerLevel}</strong>.
    `;
  
  // Create and send the chat message.
  ChatMessage.create({
    whisper: gmUsers, // Send the message as a whisper visible only to the GMs.
    type: CONST.CHAT_MESSAGE_TYPES.OTHER, // Define the message type as 'Other'.
    speaker: { actor: actor.id }, // Specify the actor as the message speaker.
    content: messageContent, // Set the message content.
    flavor: `${localize('chat.hungerUpdate')}`,// Add a localized flavor text to the message.
    user: game.user.id, // Indicate the user sending the message.
  });
}

/**
 * Function to send a hunger notification to the chat without actor's name and "To: game master" text.
 *
 * @param {string} content - The content of the chat message.
 * @param {Object} actor - The actor who should receive the message.
 */
export function hungerChatMessage(content, actor) {
  ChatMessage.create({
    user: game.user.id,
    speaker: {
      alias: actor.name,
      actor: actor.id
    },
    content: content,
    type: CONST.CHAT_MESSAGE_TYPES.OTHER
  });
}

export function sendHungerNotification(actor) {
  const daysHungry = daysHungryForActor(actor);
  const daysThirsty = daysSinceLastDrinkForActor(actor);
  const daysRested = daysSinceLastRestForActor(actor);

  const rations = actor.items.find(i => i.name === game.settings.get('fit', 'rationName'));
  const waterskin = actor.items.find(i => i.name === game.settings.get('fit', 'waterName'));
  const waterUses = waterskin?.system?.uses?.value ?? 0;
  const waterQty = waterskin?.system?.quantity ?? 0;

  const lastMealAt = actor.getFlag('fit', 'lastMealAt') || 0;
  const lastMealDate = new Date(lastMealAt * 1000);
  const lastDrinkAt = actor.getFlag('fit', 'lastDrinkAt') || 0;
  const lastDrinkDate = new Date(lastDrinkAt * 1000);
  const lastRestAt = actor.getFlag('fit', 'lastRestAt') || 0;
  const lastRestDate = new Date(lastRestAt * 1000);

  const displayMeal = {
    date: lastMealDate.toLocaleDateString(),
    time: lastMealDate.toLocaleTimeString(),
  };

  const displayDrink = {
    date: lastDrinkDate.toLocaleDateString(),
    time: lastDrinkDate.toLocaleTimeString(),
  };

  const displayRest = {
    date: lastRestDate.toLocaleDateString(),
    time: lastRestDate.toLocaleTimeString(),
  };

  const eatButton = rations && rations.system.quantity > 0
    ? `<button data-action="consumeFood" data-actor-id="${actor.id}" data-item-id="${rations.id}">${localize('chat.eat')}</button>`
    : `<button style="color: red;">${localize('chat.no_food')}</button>`;

  const drinkButton = waterskin && waterUses > 0
    ? `<button data-action="consumeDrink" data-actor-id="${actor.id}" data-item-id="${waterskin.id}">${localize('chat.drink')}</button>`
    : `<button style="color: red;">${localize('chat.no_water')}</button>`;

  const restButton = game.settings.get("fit", "restTracking")
    ? `<button data-action="longRest" data-actor-id="${actor.id}">${localize('chat.rest')}</button>`
    : `<span style="color: red;">${localize('chat.no_rest_available')}</span>`;

  const hunger = hungerLevel(actor);
  const thirst = thirstLevel(actor);
  const rest = restLevel(actor);

  function getTerrainName() {
    const terrain = game.settings.get("fit", "terrain") || "normal";
    const names = {
      normal: "",
      desert: " in the desert",
      swamp: " in the swamp",
      mountain: " in the mountains"
    };
    return names[terrain] || "";
  }

  const terrainText = getTerrainName();
  let chatContent = `
  <div class='dnd5e chat-card'>
      <div class='card-header flexrow' style="align-items: center; text-align: left;">
          <img src="modules/fit/templates/Icons/day-and-night.png" width="36" height="36">
          <h3>${game.i18n.localize("fit.chat.another_day_passed")}${terrainText}.</h3>
      </div>
      <div class='card-content' style="text-align: left; font-family: 'Modesto Condensed', serif; font-size: 16px; font-weight: bold;">
  `;

  const hungerEnabled = game.settings.get("fit", "hungerTracking");
  const thirstEnabled = game.settings.get("fit", "thirstTracking");
  const restEnabled = game.settings.get("fit", "restTracking");

  if (hungerEnabled) {
    chatContent += `
        <div>
            ${game.i18n.localize("fit.chat.you_are")}:  ${(`${hunger}`)}
        </div>
        <div style="font-size: 11px; color: gray;">
            ${game.i18n.localize("fit.chat.eaten_since")} <strong>${displayMeal.date}</strong> ${game.i18n.localize("fit.at")} <strong>${displayMeal.time}</strong>.
        </div>
    `;
  }

  if (thirstEnabled) {
    chatContent += `
        <div>
            ${game.i18n.localize("fit.chat.you_are")}:  ${(`${thirst}`)}
        </div>
        <div style="font-size: 11px; color: gray;">
            ${game.i18n.localize("fit.chat.havent_drunk_since")} <strong>${displayDrink.date}</strong> ${game.i18n.localize("fit.at")} <strong>${displayDrink.time}</strong>.
        </div>
    `;
  }

  if (restEnabled) {
    chatContent += `
        <div>
            ${game.i18n.localize("fit.chat.you_are")}:  ${game.i18n.localize(`${rest}`)}
        </div>
        <div style="font-size: 11px; color: gray;">
            ${game.i18n.localize("fit.chat.havent_rested_since")} <strong>${displayRest.date}</strong> ${game.i18n.localize("fit.at")} <strong>${displayRest.time}</strong>.
        </div>
    `;
  }

  chatContent += `</div>`;

  if (hungerEnabled || thirstEnabled || restEnabled) {
    chatContent += `
        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 8px;">
            ${hungerEnabled ? eatButton : ""}
            ${thirstEnabled ? drinkButton : ""}
            ${restEnabled ? restButton : ""}
        </div>
    `;
  }

  if (hungerEnabled || thirstEnabled || restEnabled) {
    chatContent += `<div class='card-footer' style="text-align: left;">`;
    if (hungerEnabled) {
      chatContent += `<span>${game.i18n.localize("fit.chat.rations")}: ${rations?.system?.quantity ?? game.i18n.localize("fit.none").toUpperCase()}</span>`;
    }
    if (hungerEnabled && thirstEnabled) {
      chatContent += ` | `;
    }
    if (thirstEnabled) {
      chatContent += `<span>${game.i18n.localize("fit.chat.water")}: Qty ${waterQty}, Uses ${waterUses}</span>`;
    }
    chatContent += `</div>`;
  }

  chatContent += `</div>`;

  ChatMessage.create({
    content: chatContent,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}


// Hook to handle custom chat interactions for consuming food and drink
Hooks.on('renderChatLog', async (app, html, data) => {
 
 //Food button click
html.on('click', "button[data-action='consumeFood']", async (event) => {
  event.preventDefault();

  const actor = game.actors.get(event.target.dataset.actorId);
  const item = actor?.items.get(event.target.dataset.itemId);
  if (!actor || !item) return ui.notifications.warn(`${actor?.name ?? 'This character'} has no food to eat.`);

  const result = await item.use({ event, legacy: false }, { event });

  if (result !== false) {
    await game.modules.get("fit").api.consumeFood(actor);

    if (game.settings.get("fit", "confirmChat")) {
      ChatMessage.create({ content: `${actor.name} eats ${item.name}. Hunger reset.` });
    }

    if (actor.sheet?.rendered) actor.sheet.render(true);
   // item.sheet?.render(true);
  }
});

  
  // Drink button click
  html.on('click', "button[data-action='consumeDrink']", async (event) => {
    event.preventDefault();
  
    const actor = game.actors.get(event.target.dataset.actorId);
    if (!actor) {
      ui.notifications.warn("⚠️ Actor not found. They may have been deleted.");
      return;
    }
  
    const item = actor.items.get(event.target.dataset.itemId);
    if (!item) {
      const waterName = game.settings.get("fit", "waterName");
      ui.notifications.warn(`${actor.name} has no ${waterName} to drink.`);
      return;
    }
  
    const result = await item.use({ event, legacy: false }, { event });
  
    if (result !== false) {
      await actor.setFlag("fit", "lastDrinkAt", game.time.worldTime);
  
      if (game.settings.get("fit", "confirmChat")) {
        ChatMessage.create({ content: `${actor.name} drinks from ${item.name}. Thirst reset.` });
      }
  
      updateExhaustion(actor);
      //actor.sheet?.render(true);
     // item.sheet?.render(true);
    }
  });


  html.on('click', "button[data-action='longRest']", async (event) => {
    event.preventDefault();
    const actor = game.actors.get(event.target.dataset.actorId);
    if (!actor) return ui.notifications.error("Actor not found.");
   // console.log(`${actor.name} - Triggering Long Rest`);
    await actor.longRest();
    ui.notifications.info(`${actor.name} has taken a long rest.`);
    updateExhaustion(actor);
  });
});