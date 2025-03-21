# FIT (Food, Intake & Thirst)

A comprehensive hunger, thirst, and rest tracking module for **Dungeons & Dragons 5e** in **Foundry VTT**.

FIT enhances survival gameplay by automating hunger, thirst, and rest mechanics, ensuring players stay aware of their needs without excessive bookkeeping. This module integrates seamlessly with Foundry’s item usage system, automatically adjusting hunger and thirst levels when rations and waterskins are consumed.

---

## **Why Use FIT?**
Survival mechanics in D&D are often ignored due to the hassle of manual tracking. FIT automates this process, ensuring that players face meaningful survival challenges without burdening the GM.

Whether you're running **wilderness survival**, **dungeon delves**, or **resource-driven campaigns**, FIT ensures **food, water, and rest matter** while keeping gameplay smooth.

---

## **How It Works**
FIT tracks **hunger**, **thirst**, and **rest** based on:
- **In-game time progression**
- **Item consumption (rations, waterskins, etc.)**
- **Constitution modifiers affecting metabolism**
- **Environmental effects (configurable in settings)**

FIT updates actor states automatically, with configurable base thresholds for when **hunger, thirst, and fatigue** take effect. - Configured in the settings

### **Hunger, Thirst & Rest System**
- **Time-based tracking** automatically increases hunger and thirst.
- **Consuming food and water items** resets hunger/thirst timers.
- **Multi-use consumables (e.g., waterskins)** are fully supported.
- **Rest affects fatigue but does not remove hunger/thirst** unless explicitly set.

### **Constitution & Survival**
- **Constitution modifies hunger and thirst tolerance**:
  - Higher **Constitution scores** allow characters to go longer without food/water.
  - Lower **Constitution scores** increase depletion rates.

---

## **Hunger, Thirst & Rest Effects**
FIT applies progressive effects based on a character’s **deprivation level**:

| **Level** | **Hunger**               | **Thirst**               | **Rest**                | **Effect** |
|-----------|--------------------------|--------------------------|-------------------------|------------|
| **Level 0 (default state)** | Fully Satisfied | Fully Hydrated | Fully Rested | No effect |
| **Level 1** | Peckish | Parched | Weary | Disadvantage on Ability Checks |
| **Level 2** | Hungry | Dehydrated | Fatigued | Speed halved |
| **Level 3** | Desperate for Food | Desperate for Water | Desperate for Sleep | Disadvantage on Attack Rolls and Saving Throws |
| **Level 4** | Severely Hungry | Severely Dehydrated | Severely Tired | Hit Point Maximum halved |
| **Level 5** | Critically Hungry | Critically Dehydrated | Critically Tired | Speed reduced to 0 |
| **Level 6 (final state)** | Death | Death | Death | Death |

By default, **Exhaustion levels are applied using the Foundry starvation/dehydration/Rest** This maybe reviewed in the future.

---

## **Configuration Options**
FIT is fully customizable to fit your campaign needs.

### **Base Rates for Hunger, Thirst & Rest**
- **Hunger Rate**: Default is **1 meal per 24 hours**.
- **Thirst Rate**: Default is **1 waterskin charge per 24 hours**.
- **Rest Requirement**: Tracks **One long rest per 24 hours**.

### **Constitution Modifier Impact**
- A **higher Constitution** score extends the time before hunger and thirst effects begin.
- A **lower Constitution** Penalties will apply after 24 hours.

---

## **How to Consume Food & Water**
Players can consume food and water **as normal**:
1. Click the **"Use"** button in the item sheet.
2. FIT detects item consumption and updates the hunger/thirst system.
3. Effects are removed or adjusted accordingly.

GMs can configure which items count as **food** and **water** in the module settings.

---

## **Foundry’s Exhaustion System**
FIT applies **Exhaustion effects automatically** when deprivation reaches certain levels. However, Foundry’s built-in **Exhaustion condition** only automates some effects.

| **Exhaustion Level** | **Effect** | **Automatically Applied by Foundry?** |
|----------------------|-----------|--------------------------------------|
| **1** | Disadvantage on Ability Checks | ✅ Yes |
| **2** | Speed Halved | ✅ Yes |
| **3** | Disadvantage on Attack Rolls & Saving Throws | ✅ Yes |
| **4** | Hit Point Maximum Halved | ✅ Yes |
| **5** | Speed Reduced to 0 |  ✅ Yes |
| **6** | Death |  ✅ Yes |


---
Furture enhgancements
### **Environmental Effects (Future Feature)**
- **Desert environments** will increase thirst rate.
- **Cold environments** may increase hunger rate (for warmth).
- **High altitudes** could affect fatigue tracking.

---

## **Troubleshooting**
### **1. Hunger/Thirst Not Updating?**
Ensure the **game clock is running**:
```js
game.Gametime.startRunning()
