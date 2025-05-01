import { hungerLevel } from "./hunger.js";
import { thirstLevel } from "./thirst.js";
import { restLevel } from "./rested.js";

let fitTable;

export default class FitTable extends Application {
  constructor(object = {}, options = null) {
    super(object, options);
  }

  static activate(system) {
    if (fitTable) {
      // fitTable.render(true); // ✅ Comment this out to disable auto-open
    } else {
      fitTable = new FitTable();
      fitTable.system = system;
  
      const rerender = () => {
        if (fitTable.rendered) fitTable.render(true); // ✅ only re-render if it's open
      };
  
      Hooks.on('evaluateNeeds', rerender);
      Hooks.on('consumeFood', rerender);
      Hooks.on('consumeWater', rerender);
      Hooks.on('restTaken', rerender);
      Hooks.on('initializeHunger', rerender);
      Hooks.on('initializeThirst', rerender);
      Hooks.on('initializeRest', rerender);
  
      // ✅ No auto-render here
    }
    return fitTable;
  }
  

  getData() {
    const onCanvas = [];
    const offCanvas = [];
  
    const actorIdsOnCanvas = (canvas?.tokens?.placeables || [])
      .filter(t => t.actor?.hasPlayerOwner)
      .map(t => t.actor.id);
  
    for (const actor of game.actors) {
      if (!actor.hasPlayerOwner) continue;
  
      const entry = {
        name: actor.name,
        hunger: hungerLevel(actor),
        thirst: thirstLevel(actor),
        rest: restLevel(actor)
      };
  
      if (actorIdsOnCanvas.includes(actor.id)) {
        onCanvas.push(entry);
      } else {
        offCanvas.push(entry);
      }
    }
  
    return { onCanvas, offCanvas };
  }
  

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.template = "modules/fit/templates/fit_table.html";
    options.minimizable = true;
    options.resizable = true;
    options.title = "Fit Table";
    return options;
  }
}
