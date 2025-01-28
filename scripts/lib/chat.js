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