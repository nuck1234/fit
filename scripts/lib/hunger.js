// Import necessary constants from the constants.js file
import { DEFAULT_HUNGER_LEVEL, HUNGER_LEVELS, HUNGER_ICONS } from './constants.js'
import { daysFromSeconds } from './time.js';
import { localize } from './utils.js';

 // Helper function to calculate days hungry for an actor.
 export const daysHungryForActor = (actor) => {
  const baseTolerance = game.settings.get('fit', 'baseTolerance') || 0;
  const lastMealAt = actor.getFlag('fit', 'lastMealAt') || 0;
  const secondsSinceLastMeal = game.time.worldTime - lastMealAt;
  const daysSinceLastMeal = daysFromSeconds(secondsSinceLastMeal);

  let conMod = actor.system?.abilities?.con?.mod ?? 0;


  return Math.max(daysSinceLastMeal - (baseTolerance + conMod), 0);
};


// Function to get the hunger level description based on the number of days hungry
export const hungerLevel = (actor) => {
  const level = HUNGER_LEVELS[hungerIndex(actor)] || "unknown";
  return game.i18n.localize(`${level}`);
 // console.log(`🛠 Debug: Hunger Level for ${actor.name}: ${level} (Index: ${hungerIndex(actor)})`);// added for table and chat issue
  
  return game.i18n.localize(`${level}`);// added for table and chat issue

}

// Function to get the hunger icon based on the number of days hungry
export const hungerIcon = (actor) => {
  return HUNGER_ICONS[hungerIndex(actor)];
}

// Function to calculate the hunger index based on the number of days hungry
//import { daysHungryForActor } from './systems/dnd5e.js';

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
  //  console.log(`🛠 Debug: Removing Hunger Effect from ${actor.name}: ${effect.name}`);
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
