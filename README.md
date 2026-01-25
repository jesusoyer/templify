# Templify

**Templify** is a local-first template manager — basically a **clipboard on steroids** 💪

It lets you create, organize, and reuse text snippets across different **boards**, with search, pinning, editing, and dark mode. Everything is stored locally in your browser using `localStorage`, so there’s no backend or account system.

> ⚠️ **Important**  
> Your templates are stored locally in this browser.  
> Please don’t paste passwords, API keys, or highly sensitive data.

---

## Features

- 🧩 **Boards**
  - Default **Home** board (cannot be deleted)
  - Create custom boards (e.g. “Sales replies”, “Bug reports”, “Support snippets”)
  - Delete any non-Home board (with confirmation)
  - Move templates between boards

- 📝 **Templates**
  - Title + body for each template
  - Save directly into the **current active board**
  - Or use **“Add to board…”** to choose/create a board on the fly
  - Edit, save, and cancel edits inline
  - Delete templates with a confirmation modal

- 📌 **Pinning**
  - Pin important templates
  - Pinned templates are shown first and visually highlighted
  - Unpin whenever you want

- 🔍 **Search**
  - Search template **titles**
  - Choose search scope:
    - **All boards**
    - Or a specific board only
  - A **“Clear Search Bar”** button resets search
  - If nothing matches, a friendly message tells you to clear the search to see templates again

- 🎛️ **View & UI Controls**
  - **Minimize / Expand** per template
  - **Minimize all / Expand all** templates in one click
  - Toggle the **Template Creator** (show/hide)
  - **Dark mode / Light mode** toggle

- 💾 **Local persistence**
  - Templates, boards, and active board selection are saved in `localStorage`
  - No backend, no accounts, no external storage

---

## Tech Stack

- **Framework:** Next.js (App Router, client components)
- **Language:** TypeScript / TSX
- **Storage:** Browser `localStorage`
- **Styling:** Inline styles (no external CSS framework required)

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- Package manager: **npm**, **yarn**, or **pnpm**

### Install

```bash
# clone your repo
git clone <your-repo-url>
cd templify

# install dependencies
npm install
# or
yarn
# or
pnpm install
```
