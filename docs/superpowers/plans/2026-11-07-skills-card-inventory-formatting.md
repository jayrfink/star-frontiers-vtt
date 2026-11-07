# Skills Card Inventory-Style Formatting & Catalog Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformat the Skills & Experience card in `CharacterSheetsView.vue` to mirror the Inventory card (skill name as styled text rather than dropdown, with search bar), and provide an Available Skills Catalog modal for adding official skills.

**Architecture:** Update Vue template, component state, and methods in `CharacterSheetsView.vue`. Skill names will be displayed via `<span class="item-name-text">{{ skill.name }}</span>` with PSA category tag and success chance badge. `+ Add Skill` will open a catalog modal with tabs for PSA categories and search filtering. Tests in `client/test/CharacterSheetsView.test.js` will verify layout, catalog filtering, and skill addition.

**Tech Stack:** Vue 3 (Options API), Vitest, HTML5 Drag & Drop, CSS3.

## Global Constraints

- Do not break existing skill operations: level editing (min 1, max 6), XP upgrades, reordering (drag/drop and ▲/▼ buttons), or deletion (✕).
- Style matching: Text color `#cecece`, weight 600, matching `.item-name-text`.
- PSA category tags: Muted secondary text `#8b949e`, font-size 0.75rem.
- Available Skills Catalog modal: Follows the same visual layout, tab navigation, and search conventions as the Available Equipment Catalog modal.

---

### Task 1: Add Unit Tests for Skills Card Text Layout and Catalog Modal

**Files:**
- Modify: `client/test/CharacterSheetsView.test.js`

**Interfaces:**
- Consumes: `OFFICIAL_SKILLS` from `client/src/constants/characterRules.js`
- Produces: Test assertions for `.item-name-text` in skill row, absence of `.select-official-skill` `<select>`, presence of `.skills-search-wrap`, and `showSkillsModal` behavior.

- [ ] **Step 1: Write the failing tests in `client/test/CharacterSheetsView.test.js`**
Add a describe block `Skills Card Inventory Formatting & Catalog Modal`:
1. Renders skill name as text element (`.item-name-text`) and does not render `<select class="select-official-skill">`.
2. Includes a search input for skills (`.skills-search-wrap` / `searchSkillsQuery`) and filters character skills by name and PSA.
3. Opens the Available Skills Catalog modal when `+ Add Skill` is clicked (`showSkillsModal = true`).
4. Adds an official skill from the catalog into `selectedChar.skills` at Level 1 and marks it as added.

- [ ] **Step 2: Run test to verify it fails**
Run: `cd client && npx vitest run test/CharacterSheetsView.test.js -t "Skills Card Inventory Formatting"`
Expected: FAIL due to `.select-official-skill` still being present or missing `showSkillsModal`.

- [ ] **Step 3: Commit test additions**
```bash
git add client/test/CharacterSheetsView.test.js
git commit -m "test(character-sheets): add test cases for skills card text formatting and catalog modal"
```

---

### Task 2: Implement Skills Card Text Row Layout & Search Bar

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`

**Interfaces:**
- Consumes: `selectedChar.skills`, `OFFICIAL_SKILLS`
- Produces: `filteredSkills` computed property, `searchSkillsQuery` state, updated `.skill-row` template displaying `<span class="item-name-text">` and PSA badge, `getSkillPSA` helper method.

- [ ] **Step 1: Add reactive state and computed property for skills search**
In `client/src/views/CharacterSheetsView.vue`:
Add to `data()`:
```javascript
searchSkillsQuery: '',
```
Add to `computed`:
```javascript
filteredSkills() {
  if (!this.selectedChar || !Array.isArray(this.selectedChar.skills)) return [];
  const q = (this.searchSkillsQuery || '').trim().toLowerCase();
  if (!q) return this.selectedChar.skills;
  return this.selectedChar.skills.filter((sk) => {
    const nameMatch = sk.name && sk.name.toLowerCase().includes(q);
    const psa = this.getSkillPSA(sk.name);
    const psaMatch = psa && psa.toLowerCase().includes(q);
    return nameMatch || psaMatch;
  });
},
```

- [ ] **Step 2: Add `getSkillPSA` helper method**
In `methods`:
```javascript
getSkillPSA(skillName) {
  if (!skillName) return 'Custom';
  const found = OFFICIAL_SKILLS.find((s) => s.name.toLowerCase() === skillName.toLowerCase());
  return found ? found.psa : 'Custom';
},
```

- [ ] **Step 3: Update Skills card template**
In `client/src/views/CharacterSheetsView.vue`:
Replace the skills list section:
- Header button `@click="showSkillsModal = true"`
- Add `.skills-search-wrap` search input:
```html
<div class="skills-search-wrap" style="margin-bottom: 12px;">
  <input 
    type="text" 
    v-model="searchSkillsQuery" 
    placeholder="Search Skills..." 
    class="item-name-input" 
    style="width: 100%; box-sizing: border-box;"
  />
</div>
```
- In `v-if="!filteredSkills || filteredSkills.length === 0"`:
  Display `{{ searchSkillsQuery ? 'No matching skills.' : 'No skills added. Click + Add Skill to add from catalog!' }}`
- In `v-for="(skill, index) in filteredSkills"`:
  Replace `.skill-main-select` containing `<select class="select-official-skill">` with:
```html
<div style="flex: 1; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
  <span class="item-name-text">{{ skill.name }}</span>
  <span class="skill-psa-tag">[{{ getSkillPSA(skill.name) }}]</span>
  <span class="skill-chance-badge" title="Calculated Success Chance">
    {{ getSkillSuccessChance(skill) }}%
  </span>
</div>
```
- Ensure `moveSkill` supports passing `skill` or `index` even when filtered (mirroring `moveInventoryItem`).

- [ ] **Step 4: Update CSS styles for skill text & tag**
Add styles for `.skill-psa-tag`:
```css
.skill-psa-tag {
  font-size: 0.75rem;
  color: #8b949e;
  font-weight: 500;
  white-space: nowrap;
}
```
Update any existing CSS that referenced `.select-official-skill` to keep it clean.

- [ ] **Step 5: Run tests to verify progress**
Run: `cd client && npx vitest run test/CharacterSheetsView.test.js`

- [ ] **Step 6: Commit changes**
```bash
git add client/src/views/CharacterSheetsView.vue
git commit -m "feat(character-sheets): format skills card like inventory with text names and search"
```

---

### Task 3: Implement Available Skills Catalog Modal

**Files:**
- Modify: `client/src/views/CharacterSheetsView.vue`

**Interfaces:**
- Consumes: `OFFICIAL_SKILLS`
- Produces: `showSkillsModal`, `activeSkillCategory`, `skillsCatalogSearchQuery`, `recentlyAddedSkillMap`, `filteredSkillsCatalog`, `skillCategories`, `addSkillFromCatalog`, `isSkillInSheet`, `getSkillCategoryCount`.

- [ ] **Step 1: Add modal state and computed properties**
In `client/src/views/CharacterSheetsView.vue`:
In `data()`:
```javascript
showSkillsModal: false,
activeSkillCategory: 'All',
skillsCatalogSearchQuery: '',
recentlyAddedSkillMap: {},
skillCategories: ['All', 'Military', 'Technological', 'Biosocial', 'Spaceship'],
```
In `computed`:
```javascript
filteredSkillsCatalog() {
  let list = this.officialSkills || [];
  const cat = this.activeSkillCategory || 'All';
  if (cat !== 'All') {
    list = list.filter((sk) => sk.psa === cat);
  }
  const q = (this.skillsCatalogSearchQuery || '').trim().toLowerCase();
  if (q) {
    list = list.filter((sk) =>
      sk.name.toLowerCase().includes(q) ||
      (sk.psa && sk.psa.toLowerCase().includes(q)) ||
      (sk.baseChance && sk.baseChance.toLowerCase().includes(q))
    );
  }
  return list;
},
```

- [ ] **Step 2: Add modal helper methods**
In `methods`:
```javascript
getSkillCategoryCount(category) {
  if (!this.officialSkills) return 0;
  if (!category || category === 'All') return this.officialSkills.length;
  return this.officialSkills.filter((sk) => sk.psa === category).length;
},
isSkillInSheet(skillName) {
  if (!this.selectedChar || !Array.isArray(this.selectedChar.skills)) return null;
  return this.selectedChar.skills.find(
    (sk) => sk.name && sk.name.toLowerCase() === skillName.toLowerCase()
  ) || null;
},
addSkillFromCatalog(offSkill) {
  if (!this.selectedChar) return;
  if (!Array.isArray(this.selectedChar.skills)) this.selectedChar.skills = [];
  const existing = this.isSkillInSheet(offSkill.name);
  if (existing) {
    return;
  }
  this.selectedChar.skills.push({ name: offSkill.name, level: 1 });
  this.updateCharacter();
  this.recentlyAddedSkillMap = { ...this.recentlyAddedSkillMap, [offSkill.name]: true };
  setTimeout(() => {
    this.recentlyAddedSkillMap = { ...this.recentlyAddedSkillMap, [offSkill.name]: false };
  }, 1500);
},
```

- [ ] **Step 3: Add Skills Catalog Modal Template**
Directly adjacent to the Equipment Catalog Modal in `client/src/views/CharacterSheetsView.vue`:
```html
<!-- Skills Catalog Modal -->
<div v-if="showSkillsModal" class="modal-backdrop" @click.self="showSkillsModal = false">
  <div class="modal-card equipment-modal">
    <div class="equipment-modal-header">
      <h3>Available Skills Catalog</h3>
      <button class="btn-close-modal" title="Close" @click="showSkillsModal = false">✕</button>
    </div>
    <p class="equipment-modal-desc">
      Browse official Star Frontiers skills. Click <strong>+ Add</strong> to add a skill to your character sheet.
    </p>

    <!-- Category Filter Tabs -->
    <div class="equipment-category-tabs" role="tablist" aria-label="Skill Categories">
      <button
        v-for="cat in skillCategories"
        :key="cat"
        type="button"
        role="tab"
        class="cat-tab"
        :class="{ active: (activeSkillCategory || 'All') === cat }"
        :aria-selected="(activeSkillCategory || 'All') === cat"
        @click="activeSkillCategory = cat"
      >
        {{ cat }} <span class="cat-count">({{ getSkillCategoryCount(cat) }})</span>
      </button>
    </div>

    <!-- Search Input -->
    <div class="equipment-search-wrap">
      <input
        type="text"
        v-model="skillsCatalogSearchQuery"
        placeholder="Search skills by name, PSA, or base attribute..."
        class="equipment-search-input"
      />
    </div>

    <!-- Skills List -->
    <div class="equipment-catalog-list">
      <div v-if="filteredSkillsCatalog.length === 0" class="empty-list">
        No skills found matching your filter criteria.
      </div>
      <div v-for="skill in filteredSkillsCatalog" :key="skill.name" class="equipment-card">
        <div class="eq-header">
          <span class="eq-name">{{ skill.name }}</span>
          <button
            class="btn-secondary eq-add-btn"
            :class="{
              'btn-added': recentlyAddedSkillMap[skill.name] || isSkillInSheet(skill.name)
            }"
            :disabled="!!isSkillInSheet(skill.name)"
            @click="addSkillFromCatalog(skill)"
          >
            {{
              recentlyAddedSkillMap[skill.name]
                ? '✓ Added'
                : isSkillInSheet(skill.name)
                ? `In Sheet (Lvl ${isSkillInSheet(skill.name).level})`
                : '+ Add'
            }}
          </button>
        </div>
        <div class="eq-details">
          <span class="eq-tag">{{ skill.psa }}</span>
          <span class="eq-cost">Base: {{ skill.baseChance }}</span>
        </div>
      </div>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn-secondary" @click="showSkillsModal = false">Done</button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Run tests to verify all tests pass**
Run: `cd client && npx vitest run test/CharacterSheetsView.test.js`

- [ ] **Step 5: Commit changes**
```bash
git add client/src/views/CharacterSheetsView.vue
git commit -m "feat(character-sheets): add available skills catalog modal"
```

---

### Task 4: Full Suite Verification & Regression Check

**Files:**
- Test: `client/test/CharacterSheetsView.test.js`

- [ ] **Step 1: Run complete client test suite**
Run: `cd client && npx vitest run`
Verify that all suites and tests pass with 0 failures.

- [ ] **Step 2: Inspect git diff**
Run: `git diff HEAD~3`
Ensure clean diff and no extraneous changes or unintended edits.

- [ ] **Step 3: Verification commit if any polish needed**
```bash
git status
```
