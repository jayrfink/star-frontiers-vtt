# Skills Card Inventory-Style Formatting & Catalog Modal Design

**Date:** 2026-11-07  
**Status:** Approved  
**Author:** Antigravity & User  

---

## 1. Overview & Goals

In the Star Frontiers VTT Character Sheet (`client/src/views/CharacterSheetsView.vue`), the **Skills & Experience** list card previously rendered each skill's name in an in-row `<select>` dropdown (`select-official-skill`). 

The goal of this enhancement is to format the Skills card to mirror the **Inventory & Mass** card:
1. **Row Text Presentation**: Display skill names directly as styled text (`item-name-text`), matching the inventory item format, alongside its PSA category tag and calculated success chance badge.
2. **Search Capability**: Add a search bar directly beneath the card header to filter character skills by name or PSA category.
3. **Skills Catalog Modal**: Introduce an **"Available Skills Catalog"** modal (similar to the Available Equipment Catalog modal) triggered by the `+ Add Skill` button, enabling players to browse, filter by PSA category, search, and add official skills with duplicate protection.
4. **Preserved Gameplay Functionality**: Retain drag-and-drop reordering, manual reorder buttons (`▲`/`▼`), level inputs (`Lvl: [1-6]`), `+Lvl (XP)` upgrade buttons, success chance badges, and deletion.

---

## 2. UI / UX Design

### 2.1 Skills Card Layout

* **Header**:
  * Title: `Skills & Experience`
  * Action Button: `+ Add Skill` (`btn-secondary`) which sets `showSkillsModal = true`.
* **Search Input (`.skills-search-wrap`)**:
  * Input placeholder: `Search Skills...`
  * Responsive width (`width: 100%; box-sizing: border-box;`)
  * Displays empty state when filtered:
    * If query has no matches: `"No matching skills."`
    * If character has no skills: `"No skills added. Click + Add Skill to add from catalog!"`
* **Skill Row (`.item-row.skill-row`)**:
  * **Drag Handle**: `<span class="drag-handle" title="Drag to reorder skill">⋮⋮</span>`
  * **Skill Info Container** (`flex: 1`):
    * Skill Name: `<span class="item-name-text">{{ skill.name }}</span>` (`#cecece`, font-weight 600, line-height 1.2).
    * PSA Tag: `<span class="skill-psa-tag">[{{ getSkillPSA(skill.name) }}]</span>` (muted text `#8b949e`, font-size 0.75rem).
    * Chance Badge: `<span class="skill-chance-badge" title="Calculated Success Chance">{{ getSkillSuccessChance(skill) }}%</span>` (cyan badge).
  * **Level Controls**:
    * Label `Lvl:` with number input `item-level-input` (min 1, max 6).
    * Upgrade Button: `btn-xp-upgrade` (displays `+Lvl (<cost> XP)` when level < 6).
  * **Reorder Actions**:
    * Move Up: `btn-reorder btn-move-up` (`▲`).
    * Move Down: `btn-reorder btn-move-down` (`▼`).
  * **Remove Action**:
    * Remove Button: `btn-remove` (`✕`).

### 2.2 Available Skills Catalog Modal (`showSkillsModal`)

* **Backdrop**: Standard modal backdrop (`.modal-backdrop`) with click-to-dismiss on outer backdrop.
* **Header**:
  * Title: `Available Skills Catalog`
  * Close Button: `✕` (`btn-close-modal`).
  * Description: *"Browse official Star Frontiers skills. Click + Add to add a skill to your character sheet."*
* **Category Tabs**:
  * Tabs: `All`, `Military`, `Technological`, `Biosocial`, `Spaceship`.
  * Displays count per category: `{{ cat }} ({{ getSkillCategoryCount(cat) }})`.
* **Search Filter**:
  * Search input: `Search skills by name, PSA, or base attribute...`
* **Skill Catalog Grid**:
  * Grid of skill cards displaying:
    * Skill Name (`.eq-name` / `.skill-cat-name`).
    * Tags: PSA Category (`Military`, etc.) and Base Attribute (`Base: Dexterity`, `Base: Logic`, etc.).
    * Action button:
      * If not yet acquired: `+ Add` button (`btn-secondary`). On click, adds the skill at Level 1 and temporarily changes to `✓ Added`.
      * If already acquired: `Added (Lvl X)` disabled or styled to indicate it's already on the character sheet.
* **Footer Actions**:
  * `Done` button (`btn-secondary`) to close modal.

---

## 3. Component Architecture & Data Flow

### 3.1 State in `CharacterSheetsView.vue`

```javascript
data() {
  return {
    // ...existing state
    showSkillsModal: false,
    searchSkillsQuery: '',
    activeSkillCategory: 'All',
    skillsCatalogSearchQuery: '',
    recentlyAddedSkillMap: {},
    // ...
  };
}
```

### 3.2 Computed Properties

* `filteredSkills`:
  Filters `this.selectedChar.skills` based on `this.searchSkillsQuery` (matching skill name or resolved PSA category).
* `filteredSkillsCatalog`:
  Filters `OFFICIAL_SKILLS` by:
  1. `this.activeSkillCategory` (matches skill PSA, or allows all if 'All').
  2. `this.skillsCatalogSearchQuery` (case-insensitive substring match on name, PSA, or baseChance).
* `skillCategories`:
  Constant list: `['All', 'Military', 'Technological', 'Biosocial', 'Spaceship']`.

### 3.3 Methods

* `getSkillPSA(skillName)`:
  Finds official skill in `OFFICIAL_SKILLS` and returns `psa` (or `'Custom'`).
* `getSkillCategoryCount(category)`:
  Counts items in `OFFICIAL_SKILLS` matching category (or total count if 'All').
* `isSkillInSheet(skillName)`:
  Finds matching item in `this.selectedChar.skills` and returns its level or `null`.
* `addSkillFromCatalog(offSk)`:
  Appends `{ name: offSk.name, level: 1 }` to `this.selectedChar.skills`, triggers `this.updateCharacter()`, and flashes `this.recentlyAddedSkillMap[offSk.name] = true` with a timeout of 1500ms.
* `moveSkill(skillOrIndex, direction)`:
  Updated to safely handle reordering whether viewing all skills or a filtered list (mirroring `moveInventoryItem`).

---

## 4. Verification & Testing Plan

1. **Unit Tests (`client/test/CharacterSheetsView.test.js`)**:
   * Verify skill name is rendered as text (`.item-name-text`) instead of a dropdown `<select class="select-official-skill">`.
   * Verify the Skills card search bar exists and filters skills by query.
   * Verify `+ Add Skill` opens the skills catalog modal (`showSkillsModal = true`).
   * Verify catalog category tabs (`All`, `Military`, `Technological`, `Biosocial`, `Spaceship`) filter skills correctly.
   * Verify adding a skill from the catalog adds `{ name, level: 1 }` to `selectedChar.skills` and updates the character.
   * Verify existing skill features (level increment, XP upgrade, reordering, drag/drop, deletion) remain functional.
2. **Regression Check**:
   * Run full test suite: `cd client && npx vitest run`.
