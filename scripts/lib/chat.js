import { hungerIcon } from "./hunger.js"; // Import hungerIcon
import { daysHungryForActor, hungerLevel } from "./hunger.js"; // Import daysHungryForActor and hungerLevel
import { daysSinceLastDrinkForActor, thirstLevel } from "./thirst.js"; // Import daysHungryForActor and hungerLevel
import { daysSinceLastRestForActor, restLevel } from "./rested.js"; // Import daysHungryForActor and hungerLevel
import { localize } from './utils.js'; // Import the localize function
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
    .filter((user) => user.isGM) // Filter users who are GMs.
    .map((user) => user.id); // Extract their user IDs.

  // Construct the content of the chat message, including actor's name, rations consumed, and new hunger level.
  const messageContent = `
    <strong> ${actor.name} </strong> consumed ${rations} ration(s) and reduced their hunger to <strong>Hunger Level ${newHungerLevel}</strong>.
  `;

  // Create and send the chat message.
  ChatMessage.create({
    whisper: gmUsers, // Send the message as a whisper visible only to the GMs.
    type: CONST.CHAT_MESSAGE_TYPES.OTHER, // Define the message type as 'Other'.
    speaker: { actor: actor.id }, // Specify the actor as the message speaker.
    content: messageContent, // Set the message content.
    flavor: `${localize('chat.hungerUpdate')}`, // Add a localized flavor text to the message.
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
    user: game.user.id, // Indicate the user sending the message.
    speaker: {
      alias: actor.name, // Use the actor's name as the alias.
      actor: actor.id // Specify the actor as the message speaker.
    },
    content: content, // Set the message content.
    type: CONST.CHAT_MESSAGE_STYLES.OTHER // Define the message type as 'Other'. changed due to issue raised with TYPES
  });
}
export async function sendHungerNotification(actor) {
  const daysHungry = daysHungryForActor(actor);
  const daysThirsty = daysSinceLastDrinkForActor(actor); // ✅ New thirst tracking function
  const daysRested = daysSinceLastRestForActor(actor); // ✅ Add Rest Tracking

  const rations = actor.items.find(i => i.name === game.settings.get('fit', 'rationName'));
  const waterskin = actor.items.find(i => i.name === game.settings.get('fit', 'waterName')); // ✅ New drinkable item

  const lastMealAt = actor.getFlag('fit', 'lastMealAt') || 0;
  const lastMealDate = new Date(lastMealAt * 1000);
  const lastDrinkAt = actor.getFlag('fit', 'lastDrinkAt') || 0;
  const lastDrinkDate = new Date(lastDrinkAt * 1000);
  const lastRestAt = actor.getFlag('fit', 'lastRestAt') || 0; // ✅ Get last rest timestamp
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

  // ✅ Action buttons for eating and drinking
  const eatButton = rations && rations.system && rations.system.quantity > 0
      ? `<button data-action="consumeFood" data-actor-id="${actor.id}" data-item-id="${rations.id}">${localize('chat.eat')}</button>`
      : `<span style="color: red;">${localize('chat.no_food')}</span>`;

  const drinkButton = waterskin && waterskin.system && waterskin.system.quantity > 0
      ? `<button data-action="consumeDrink" data-actor-id="${actor.id}" data-item-id="${waterskin.id}">${localize('chat.drink')}</button>`
      : `<span style="color: red;">${localize('chat.no_water')}</span>`;

  const restButton = game.settings.get("fit", "restTracking") 
      ? `<button data-action="longRest" data-actor-id="${actor.id}">${localize('chat.rest')}</button>`
      : `<span style="color: red;">${localize('chat.no_rest_available')}</span>`;

  const hunger = hungerLevel(actor);
  const thirst = thirstLevel(actor); // ✅ New thirst tracking function
  const rest = restLevel(actor); // ✅ Get Rest Level
  
  // ✅ Check if Hunger and Thirst tracking are enabled
const hungerEnabled = game.settings.get("fit", "hungerTracking");
const thirstEnabled = game.settings.get("fit", "thirstTracking");
const restEnabled = game.settings.get("fit", "restTracking");


// ✅ Construct chat message
let chatContent = `
<div class='dnd5e chat-card'>
    <!-- ✅ Header -->
    <div class='card-header flexrow' style="align-items: center; text-align: center;">
        <img src="modules/fit/templates/Icons/day-and-night.png" width="36" height="36">
        <h3>${game.i18n.localize("fit.chat.another_day_passed")}</h3>            
    </div>

    <!-- ✅ Body -->
    <div class='card-content' style="text-align: left; font-family: 'Modesto Condensed', serif; font-size: 16px; font-weight: bold;">
`;

// ✅ Add Hunger Section (Only if tracking is enabled)
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

// ✅ Add Thirst Section (Only if tracking is enabled)
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
// ✅ Add Thirst Section (Only if tracking is enabled)
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

// ✅ Close Body Section
chatContent += `</div>`;

// ✅ Add Buttons (Only if at least one system is enabled)
if (hungerEnabled || thirstEnabled || restEnabled) {
    chatContent += `
        <div style="display: flex; justify-content: center; gap: 10px; margin-top: 8px;">
            ${hungerEnabled ? eatButton : ""}
            ${thirstEnabled ? drinkButton : ""}
            ${restEnabled ? restButton : ""}
        </div>
    `;
}

// ✅ Add Footer (Only if at least one system is enabled)
if (hungerEnabled || thirstEnabled || restEnabled) {
    chatContent += `
        <div class='card-footer' style="text-align: left;">
    `;

    if (hungerEnabled) {
        chatContent += `<span>${game.i18n.localize("fit.chat.rations")}: ${rations?.system?.quantity ?? game.i18n.localize("fit.none").toUpperCase()}</span>`;
    }

    if (hungerEnabled && thirstEnabled) {
        chatContent += ` | `;
    }

    if (thirstEnabled) {
        chatContent += `<span>${game.i18n.localize("fit.chat.water")}: ${waterskin?.system?.quantity ?? game.i18n.localize("fit.none").toUpperCase()}</span>`;
    }

    chatContent += `</div>`; // ✅ Close footer
}

// ✅ Close the chat card
chatContent += `</div>`;

// ✅ Send message to chat
ChatMessage.create({
    content: chatContent,
    speaker: ChatMessage.getSpeaker({ actor })
});
}

// Hook to handle custom chat interactions for consuming food and water
Hooks.on('renderChatLog', async (app, html, data) => {

  // ✅ Handle Eating
  html.on('click', "button[data-action='consumeFood']", async (event) => {
      event.preventDefault();

      const actorId = event.target.dataset.actorId;
      const itemId = event.target.dataset.itemId;

      const actor = game.actors.get(actorId);
      const item = actor?.items.get(itemId);

      if (!actor || !item) {
          ui.notifications.error("Actor or item not found.");
          return;
      }

      const quantity = item.system.quantity || 0;
      if (quantity <= 0) {
          ui.notifications.warn(`${actor.name} has no ${item.name} left to consume.`);
          return;
      }

      // ✅ Consume one ration
      await item.update({ "system.quantity": quantity - 1 });
      await actor.setFlag('fit', 'lastMealAt', game.time.worldTime);

       // ✅ Only send chat message if setting is enabled
    if (game.settings.get("fit", "confirmChat")) {
        ChatMessage.create({ content: `${actor.name} consumes a ration. Hunger has been reset.` });
    }
      ui.notifications.info(`${actor.name} has consumed a ration. Remaining: ${quantity - 1}`);

      // ✅ Ensure exhaustion updates after eating
      updateExhaustion(actor);
  });

  // ✅ Handle Drinking Water
  html.on('click', "button[data-action='consumeDrink']", async (event) => {
      event.preventDefault();

      const actorId = event.target.dataset.actorId;
      const itemId = event.target.dataset.itemId;

      const actor = game.actors.get(actorId);
      const item = actor?.items.get(itemId);

      if (!actor || !item) {
          ui.notifications.error("Actor or item not found.");
          return;
      }

      const quantity = item.system.quantity || 0;
      if (quantity <= 0) {
          ui.notifications.warn(`${actor.name} has no ${item.name} left to drink.`);
          return;
      }

      // ✅ Consume one water unit
      await item.update({ "system.quantity": quantity - 1 });
      await actor.setFlag('fit', 'lastDrinkAt', game.time.worldTime);

      // ✅ Only send chat message if setting is enabled
    if (game.settings.get("fit", "confirmChat")) {
        ChatMessage.create({ content: `${actor.name} drinks water. Thirst has been reset.` });
    }
      ui.notifications.info(`${actor.name} has drunk water. Remaining: ${quantity - 1}`);

      // ✅ Ensure exhaustion updates after drinking
      updateExhaustion(actor);
      
  });
    // ✅ Handle Long Rest Button Click - Calls Foundry's Built-in Function
    html.on('click', "button[data-action='longRest']", async (event) => {
        event.preventDefault();

        const actorId = event.target.dataset.actorId;
        const actor = game.actors.get(actorId);
        if (!actor) return ui.notifications.error("Actor not found.");

        console.log(`${actor.name} - Triggering Long Rest`);
        await actor.longRest(); // ✅ Calls Foundry's built-in long rest function
        ui.notifications.info(`${actor.name} has taken a long rest.`);

        // ✅ Ensure exhaustion updates after resting
        updateExhaustion(actor);
    });
});