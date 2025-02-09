// Import necessary constants from the constants.js file
import {
  DEFAULT_HUNGER_LEVEL,
  HUNGER_LEVELS,
  HUNGER_ICONS,
} from './constants.js'

import { daysFromSeconds, secondsAgo } from './time.js';

let _sessionTime = 0; // ✅ Tracks elapsed time for hunger updates
const EVAL_FREQUENCY = 30; // ✅ Adjust as needed (default: 1 hour in seconds)


import { localize } from './utils.js';
// Function to get the hunger level description based on the number of days hungry
export const hungerLevel = (actor) => {
  const level = HUNGER_LEVELS[hungerIndex(actor)] || "unknown";
  return game.i18n.localize(`${level}`);
  console.log(`🛠 Debug: Hunger Level for ${actor.name}: ${level} (Index: ${hungerIndex(actor)})`);// added for table and chat issue
  
  return game.i18n.localize(`${level}`);// added for table and chat issue

}

// Function to get the hunger icon based on the number of days hungry
export const hungerIcon = (actor) => {
  return HUNGER_ICONS[hungerIndex(actor)];
}

// Function to calculate the hunger index based on the number of days hungry
import { daysHungryForActor } from './systems/dnd5e.js';

export const hungerIndex = (actor) => {
 
  if (!actor || typeof actor !== "object") {
      return 0;
  }

  const daysHungry = daysHungryForActor(actor);
  const index = Math.min(DEFAULT_HUNGER_LEVEL + daysHungry, HUNGER_LEVELS.length - 1);

   return index;
}

// Function to update the hunger state of an actor based on elapsed time
export const updateHunger = async (actor, elapsed) => {
  const seconds = actor.getFlag('fit', 'secondsSinceLastMeal')
  if (typeof seconds === 'undefined') return

  await actor.setFlag('fit', 'secondsSinceLastMeal', seconds + elapsed)

  Hooks.call('updateHunger', actor)
}
export async function evaluateHunger(actor) {
  console.log(`🛠 Debug: Evaluating hunger for ${actor.name}`);

  const lastMealNotificationAt = actor.getFlag('fit', 'lastMealNotificationAt') || 0;
  const daysSinceLastMealNotification = daysFromSeconds(game.time.worldTime - lastMealNotificationAt);

  if (daysSinceLastMealNotification >= 1) {
      const daysHungry = daysHungryForActor(actor);

      if (daysHungry >= 1) {
          await removeHungerEffects(actor);
          if (daysHungry <= 5) {
              const config = activeEffectConfig(actor, daysHungry);
              await addOrUpdateHungerEffect(actor, config);
          } else {
              console.warn(`⚠️ ${actor.name} is starving! Apply extreme effects here.`);
          }
      } else {
          await removeHungerEffects(actor);
      }

      await actor.setFlag('fit', 'lastMealNotificationAt', game.time.worldTime);
      Hooks.call('evaluateHunger', actor);
  }
}


// Function to get active hunger effects for an actor
export const activeHungerEffectsFor = (actor) => {
  return actor.effects.filter(effect => effect.flags['fit'] && effect.flags['fit']['effect'] === 'hunger')
}

// Function to add or update hunger effects for an actor
export const addOrUpdateHungerEffect = async (actor, activeEffectConfig) => {
  await removeHungerEffects(actor); // ✅ Ensure previous hunger effects are removed
  let effect = await ActiveEffect.create(activeEffectConfig, { parent: actor });
  await actor.setFlag('fit', 'hungerActiveEffect', effect.id);
  Hooks.call('addOrUpdateHungerEffect', actor, effect);
  }

  

// Function to consume food and reset the hunger state of an actor
export const consumeFood = async (actor) => {
  await removeHungerEffects(actor)
  await initializeHunger(actor)
  
  Hooks.call('consumeFood', actor)
}
  
// Function to remove hunger effects from an actor
export const removeHungerEffects = async (actor) => {
  const hungerEffectLabel = localize('hungerEffect');

  // Get existing hunger effects
  const hungerEffects = actor.effects.filter(effect => effect.name === hungerEffectLabel);

  for (const effect of hungerEffects) {
    if (!actor.effects.has(effect.id)) {
      console.warn(`⚠️ Warning: Hunger Effect ID ${effect.id} does not exist for ${actor.name}. Skipping deletion.`);
      continue;
    }
    console.log(`🛠 Debug: Removing Hunger Effect from ${actor.name}: ${effect.name}`);
    await effect.delete();
  }

  // Clear the hungerActiveEffect flag if effects were found
  if (hungerEffects.length > 0) {
    await actor.setFlag('fit', 'hungerActiveEffect', null);
  }

  Hooks.call('removeHungerEffects', actor);
}

// Function to initialize the hunger state of an actor
export const initializeHunger = async (actor) => {
  const now = game.time.worldTime
  await Promise.all([
    actor.setFlag('fit', 'secondsSinceLastMeal', 0),
    actor.setFlag('fit', 'lastMealAt', now),
    actor.setFlag('fit', 'lastMealNotificationAt', now),
    actor.setFlag('fit', 'lastDrinkAt', now),
  ])
  Hooks.call('initializeHunger', actor)
}

// Function to unset all hunger-related flags for an actor
export const unsetHunger = async (actor) => {
  for (const key in actor.flags['fit']) {
    await actor.unsetFlag('fit', key)
  }
  Hooks.call('unsetHunger', actor)
}
// Hook to evaluate hunger periodically based on elapsed world time
Hooks.on('updateWorldTime', async (seconds, elapsed) => {
  console.log('updateWorldTime triggered in hunger.js:', { seconds, elapsed });

  _sessionTime += elapsed;
  if (_sessionTime < EVAL_FREQUENCY) return;
  _sessionTime = 0;

  if (!game.scenes.active) return;
  if (!game.user.isGM) return;

  const activeUsers = game.users.filter(user => user.active && !user.isGM);

  game.scenes.active.tokens.forEach(async token => {
    const actor = game.actors.get(token.actorId);
    // We want to skip non-actors and non-player controlled characters
    if (typeof actor === 'undefined') return;
    if (!actor.hasPlayerOwner) return;

    // Reset hunger if time skips backward more than 5 minutes
    if (elapsed < -300) {
      await initializeHunger(actor);
      return;
    }
    // We also want to skip any player who is not logged in if skipMissingPlayers is on
    let activeUser = activeUsers.find(user => actor.testUserPermission(user, "OWNER"));
    if (!activeUser && game.settings.get('fit', 'skipMissingPlayers')) return;

    await updateHunger(actor, elapsed);
    await evaluateHunger(actor);
  });
});
