/**
 * This script is responsible for preloading Handlebars templates used by the module.
 * By preloading templates, the module ensures that they are available for immediate use
 * when rendering components in the UI, reducing potential delays during runtime.
 *
 * The `hunger_table.html` template is specifically loaded here. It defines the structure
 * and appearance of the hunger tracking table displayed to the Game Master (GM).
 */

export const preloadTemplates = async function () {
  // An array of paths to Handlebars templates to be preloaded.
  const templatePaths = [
    'modules/fit/templates/hunger_table.html' // Path to the hunger table template.
  ];

  // Use the Foundry VTT `loadTemplates` function to preload the specified templates.
  return loadTemplates(templatePaths);
}