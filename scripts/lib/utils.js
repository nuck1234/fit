// This file provides utility functions that are used throughout the module.
// It aims to streamline repeated operations and centralize key logic for maintainability.

/**
 * Utility Function: localize
 * Description: This function retrieves a localized string for a given key.
 * It interacts with the Foundry VTT i18n (internationalization) system.
 * @param {string} key - The localization key to retrieve the string for.
 * @returns {string} - The localized string.
 * Usage: Used to ensure all displayed text conforms to the selected language.
 */
export const localize = (key) => {
  return game.i18n.localize(`fit.${key}`);
};
