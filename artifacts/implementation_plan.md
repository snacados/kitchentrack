# Implementation Plan: Kitchen Track Enhancements

This document outlines the proposed changes to address your requested enhancements.

## User Review Required

> [!IMPORTANT]
> **API/Database Schema Assumption:**
> For adding Categories to Recipes, I will add a `category` property to the recipe JSON object. If your backend relies on a strict schema that rejects unknown columns, this might cause an issue. I assume the `/api/recipes` endpoint can safely absorb extra JSON fields or a new `category` property. 
> 
> **Simplifying Inventory Names:**
> I propose making the **Name** field optional or auto-filled. When you select a Type (e.g., `Paprika`), the item name will default to "Paprika". If you type something in a new optional field (e.g., "Clarification: Smoked"), the final saved name will be "Smoked Paprika". Does this behavior sound good?

## Proposed Changes

### 1. Categorize Recipes
- **Categories:** Chicken, Beef, Pork, Seafood/Fish, Sides, Soups, Pasta, Beverages, Salads, Desserts, Breakfast, Vegetarian, Other.
- **`AddRecipeForm` Component:** 
  - Add a **Category** dropdown when adding recipes manually. 
  - For URL-imported recipes, we'll prompt the user for a category before or after importing, or set it to "Other" by default and allow them to edit it.
- **`RecipesPage` Component:**
  - Add a horizontal, draggable category filter (similar to the inventory pages) below the main header.
- **Recipe Cards:** Show a small icon or badge for the category.

### 2. Edit Recipes and Inventory Items
- **Edit Inventory (`ItemCard`):**
  - Add an "Edit" button (✏️) next to the transfer/delete actions.
  - Clicking it will open a pre-filled `AddItemForm` modal in "Edit Mode".
  - Submitting will call the existing `updateItem` API.
- **Edit Recipes (`RecipeDetail`):**
  - Add an "Edit Recipe" button.
  - Clicking it will open an "Edit Recipe" form (re-using the manual Add Recipe layout) pre-filled with the recipe's title, ingredients, steps, and category.
  - Submitting will call `client.updateRecipe`.

### 3. Simplify Inventory Name Input
- **`AddItemForm` Component:**
  - When the User selects a `Location`, `Category`, and `Type` (subtype), the app will automatically build a default name (e.g., selecting "Milk" sets the base name to "Milk").
  - A new input called **"Details/Clarification (Optional)"** will replace the required Name input. 
  - If the user types "2%", the final item name shown in the UI will combine them: "2% Milk".

### 4. Inventory Sorting Feature
- **`LocationPage` Component:**
  - Add a "Sort by" dropdown menu next to the category tabs.
  - Options: 
    - **Closest to Expiry** (Default)
    - **Alphabetical (A-Z)**
    - **Recently Bought**
    - **Quantity (High to Low)**
  - Ensure the selected sort order is applied to the filtered list.

### 5. Fix Category Tab Bug
- **`DraggableScroll` Component:**
  - **Issue:** The component traps pointer events to allow dragging, which sometimes prevents clicks on the child category buttons.
  - **Fix:** Remove `setPointerCapture` and increase the movement threshold from `3px` to `5px` to prevent false drags (e.g., from slight finger rolls). We'll also attach a regular `onClick` handler that checks the `isDragging` state rather than relying entirely on `addEventListener` suppression.

## Open Questions

> [!TIP]
> Do you prefer the "Edit" screens to open as full-page views or as overlay modals (like the current Add Item)? I plan to use overlays to maintain consistency with the current design unless you specify otherwise.

## Verification Plan

### Automated Tests
- *(No automated tests are strictly defined in this project, but we will ensure React cleanly compiles.)*

### Manual Verification
1. **Add/Edit Inventory:** Add Milk, provide "2%" as clarification, verify Name is "2% Milk". Edit the quantity and expiry, verify it saves correctly.
2. **Sort Inventory:** Open Fridge, add 3 items with different expiry and purchase dates. Toggle the "Sort by" dropdown to verify correct ordering.
3. **Draggable Tabs:** Verify that clicking tabs like "Meat" or "Dairy" on mobile/desktop instantly filters the list without being eaten by the drag listener.
4. **Recipes:** Import a recipe, set it to "Pasta". Edit it, change title and category to "Chicken". Check if the category tab filters it successfully.
