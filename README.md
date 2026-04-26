## How It Works

This section walks through the main flows in Templify.

---

### 1. Boards

#### What Is a Board?

A board is a collection of templates, like a folder. For example:

- **Home**
- **Sales replies**
- **Support snippets**
- **Bug report templates**

#### Creating a Board

1. Click **“+ Create Board”** in the header.
2. Enter a name (e.g. **Sales Replies**).
3. Click **Create**.
4. The new board becomes the **active board**, and new templates will save there by default.

#### Switching Boards

1. Use the **Board** dropdown in the header.
2. Choose any board (Home or custom).
3. The grid now shows templates from that board.
4. The **Template Creator** button text updates to match the active board (e.g. **“Save to Home Board”**, **“Save to Sales Replies”**).

#### Deleting a Board

> ❗ You **cannot** delete the **Home** board.

To delete any other board:

1. Switch to the board you want to delete via the **Board** dropdown.
2. In the grid header, click **“Delete board”**.
3. Confirm in the modal:
   - The board is removed.
   - All templates in that board are removed.
   - You are switched back to **Home** (or another available board).

---

### 2. Creating Templates

There are two main ways to save a template:

#### Save Directly to the Active Board

1. Confirm you’re on the right board using the **Board** dropdown.
2. In the **Template Creator**:
   - Enter a **Title**.
   - Enter the **Template body**.
3. Click the primary button:
   - If active board is **Home** → **“Save to Home Board”**
   - If active board is e.g. **Sales Replies** → **“Save to Sales Replies”**
4. The new template appears at the top of the grid and briefly highlights.

#### Save via “Add to board…”

1. Fill in **Title** and **Template body**.
2. Click **“Add to board…”** instead of the primary save button.
3. In the modal:
   - Choose an existing board from the dropdown, **or**
   - Enter a new board name and click **“Create & use”**.
4. The template is saved to the selected/created board.
5. The creator input fields are cleared and the new template is highlighted.

---

### 3. Editing, Copying, Deleting Templates

#### Edit a Template

1. On a template card, click **Edit**.
2. Modify the **title** and/or **body** inline.
3. Click **Save** to persist, or **Cancel** to discard changes.

#### Copy a Template

1. On a template card, click **Copy**.
2. The body text is copied to your clipboard.
3. A simple alert confirms the copy (with a fallback for older browsers).

#### Delete a Template

1. Click the **✕** button in the top-right of a template card.
2. Confirm the delete in the modal:
   - The template is removed from the board.
   - If you were editing that template, edit mode is exited.

---

### 4. Pinning & Layout

#### Pin / Unpin Templates

- Click **Pin** to mark a template as important.
- Pinned templates:
  - Appear at the top.
  - Have a special visual accent.
- Click **Unpin** to move it back into the normal list.

#### Collapse / Expand

- **Per-card:**  
  Click **“Minimize” / “Expand”** to hide or show the body of a single template.
- **All at once:**  
  Use **“Minimize all” / “Expand all”** in the grid header to collapse or expand every template card.

#### Show / Hide Creator

- Use the **“Hide Creator / Show Creator”** button in the header to toggle the Template Creator panel.

#### Dark Mode

- Use the **“Dark mode / Light mode”** toggle in the header.
- The entire UI adjusts colors for dark or light themes.

---

### 5. Search

The search system supports **scopes** so you can search everywhere or just within a specific board.

#### Search Scopes

In the search area:

- Choose **“All boards”** to search across all boards.
- Or choose a **specific board** to only search templates inside that board.

#### Searching

1. Type into the **Search templates** input.
2. The grid updates live:
   - If scope = **all** → matches titles from every board.
   - If scope = **a board** → matches titles only in that board.
3. The header above the grid indicates the search context, e.g.:
   - `Search: "welcome" (all boards)`
   - `Search: "bug" (Support Snippets)`

#### No Results

If no templates match:

- You see:  
  **“No templates match your search. Clear the search box to see your saved templates again.”**

This prevents the grid from feeling “empty and broken”.

#### Clear Search

Use the **“Clear Search Bar”** button next to **“Search templates”**.

This:

- Clears the search text.
- Restores the normal per-board view.

---

## Data & Privacy

Templify is **local-first**:

- All data is stored in **`localStorage`** on the user’s device:
  - `clipboard-templates`
  - `clipboard-boards`
  - `clipboard-active-board`
- No data is sent to a server by default.
- Clearing browser storage, using private browsing, or switching devices/browsers will reset the app.

> ⚠️ **Reminder**  
> Your templates are stored locally in this browser.  
> Please don’t paste passwords, API keys, or highly sensitive data.

---

## Roadmap Ideas

Potential future improvements:

- Tags and advanced filters (e.g. `#sales`, `#urgent`)
- Search in **template body** as well as title
- Export / import templates (JSON file)
- Multi-device sync with a real backend
- Keyboard shortcuts (copy, pin, search, create)
- Better notifications (toasts instead of alerts)
## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.
