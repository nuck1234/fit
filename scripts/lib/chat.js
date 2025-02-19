import { hungerIcon } from "./hunger.js"; // Import hungerIcon
import { daysHungryForActor, hungerLevel } from "./hunger.js"; // Import daysHungryForActor and hungerLevel
import { localize } from './utils.js'; // Import the localize function
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
  const rations = actor.items.find(i => i.name === game.settings.get('fit', 'rationName'));

  const lastMealAt = actor.getFlag('fit', 'lastMealAt') || 0;
  const lastMealDate = new Date(lastMealAt * 1000);
  const display = {
      date: lastMealDate.toLocaleDateString(),
      time: lastMealDate.toLocaleTimeString(),
  };

  const actionHtml = rations && rations.system && rations.system.quantity > 0
      ? `<button data-action="consumeFood" data-actor-id="${actor.id}" data-item-id="${rations.id}">Use Rations</button>`
      : `Find ${game.settings.get('fit', 'rationName')} soon!`;

  const hunger = hungerLevel(actor);

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
  // Hook to handle custom chat interactions for consumption
       Hooks.on('renderChatLog', async (app, html, data) => {
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
  
          // Consume one ration
          await item.update({ "system.quantity": quantity - 1 });
          await actor.setFlag('fit', 'lastMealAt', game.time.worldTime);
  
          ChatMessage.create({ content: `${actor.name} consumes a ration. Hunger has been reset.` });
          ui.notifications.info(`${actor.name} has consumed a ration. Remaining: ${quantity - 1}`);
        });
      });
  