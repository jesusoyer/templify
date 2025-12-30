"use client";

import React, { useEffect, useState } from "react";
import TemplateCreator from "./components/TemplateCreator";
import SearchBar from "./components/SearchBar";
import TemplatesGrid from "./components/TemplatesGrid";

type Template = {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  pinnedAt?: number | null;
  boardId?: string;
};

type Board = {
  id: string;
  name: string;
  isDefault?: boolean;
};

const HOME_BOARD_ID = "home-board";

export default function ClipboardTemplatesPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);

  // Boards
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  // Search scope: "all" or a specific board.id
  const [searchScopeBoardId, setSearchScopeBoardId] =
    useState<string>("all");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");

  // Show/hide creator
  const [showCreator, setShowCreator] = useState(true);

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);

  // Which template was just added (for highlight)
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(
    null
  );

  // Create-board modal
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  // Assign-to-board modal
  const [showAssignBoardModal, setShowAssignBoardModal] = useState(false);
  const [assignBoardId, setAssignBoardId] = useState<string>("");
  const [assignSource, setAssignSource] = useState<
    "existing" | "new" | null
  >(null);
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(
    null
  );
  const [pendingNewTemplateTitle, setPendingNewTemplateTitle] =
    useState<string>("");
  const [pendingNewTemplateBody, setPendingNewTemplateBody] =
    useState<string>("");

  // inline "create board" from assign modal
  const [assignNewBoardName, setAssignNewBoardName] = useState("");

  // delete-board modal
  const [showDeleteBoardModal, setShowDeleteBoardModal] = useState(false);
  const [boardToDeleteId, setBoardToDeleteId] = useState<string | null>(
    null
  );
  const [boardToDeleteName, setBoardToDeleteName] = useState<string>("");

  // Load templates from localStorage (and migrate to Home board if needed)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("clipboard-templates");
      if (stored) {
        const parsed = JSON.parse(stored) as Template[];
        const withBoard = parsed.map((t) => ({
          ...t,
          boardId: t.boardId ?? HOME_BOARD_ID,
        }));
        setTemplates(withBoard);
      }
    } catch (err) {
      console.error("Failed to load templates from localStorage", err);
    }
  }, []);

  // Load boards & active board from localStorage
  useEffect(() => {
    try {
      const storedBoards = localStorage.getItem("clipboard-boards");
      if (storedBoards) {
        const parsed = JSON.parse(storedBoards) as Board[];
        if (parsed.length > 0) {
          setBoards(parsed);
          const storedActive =
            localStorage.getItem("clipboard-active-board");
          if (storedActive && parsed.some((b) => b.id === storedActive)) {
            setActiveBoardId(storedActive);
          } else {
            setActiveBoardId(parsed[0].id);
          }
          return;
        }
      }

      // If no boards stored, create Home board
      const homeBoard: Board = {
        id: HOME_BOARD_ID,
        name: "Home",
        isDefault: true,
      };
      setBoards([homeBoard]);
      setActiveBoardId(HOME_BOARD_ID);
    } catch (err) {
      console.error("Failed to load boards from localStorage", err);
      const homeBoard: Board = {
        id: HOME_BOARD_ID,
        name: "Home",
        isDefault: true,
      };
      setBoards([homeBoard]);
      setActiveBoardId(HOME_BOARD_ID);
    }
  }, []);

  // Save templates to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("clipboard-templates", JSON.stringify(templates));
    } catch (err) {
      console.error("Failed to save templates to localStorage", err);
    }
  }, [templates]);

  // Save boards to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("clipboard-boards", JSON.stringify(boards));
    } catch (err) {
      console.error("Failed to save boards to localStorage", err);
    }
  }, [boards]);

  // Save active board to localStorage
  useEffect(() => {
    if (!activeBoardId) return;
    try {
      localStorage.setItem("clipboard-active-board", activeBoardId);
    } catch (err) {
      console.error("Failed to save active board", err);
    }
  }, [activeBoardId]);

  // Clear the highlight after ~1s
  useEffect(() => {
    if (!recentlyAddedId) return;
    const timeout = setTimeout(() => {
      setRecentlyAddedId(null);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [recentlyAddedId]);

  // ---------- Template creation ----------

  // Save to the *currently active* board (or Home if missing)
  function handleAddTemplateToActiveBoard(e: React.FormEvent) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      alert("Title and body are required.");
      return;
    }

    const targetBoardId = activeBoardId || HOME_BOARD_ID;

    const newTemplate: Template = {
      id: Date.now().toString() + Math.random().toString(16),
      title: trimmedTitle,
      body: trimmedBody,
      pinned: false,
      pinnedAt: null,
      boardId: targetBoardId,
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    setTitle("");
    setBody("");
    setRecentlyAddedId(newTemplate.id);
  }

  // Creator: "Add to" → open assign-board modal for a NEW template
  function handleCreatorAddToBoardClick() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      alert("Title and body are required before adding to a board.");
      return;
    }

    if (!boards.length) {
      alert("Please create a board first.");
      return;
    }

    setPendingNewTemplateTitle(trimmedTitle);
    setPendingNewTemplateBody(trimmedBody);
    setAssignSource("new");
    setAssignTemplateId(null);

    const defaultBoardId =
      activeBoardId || boards[0]?.id || HOME_BOARD_ID;
    setAssignBoardId(defaultBoardId);
    setShowAssignBoardModal(true);
  }

  function handleDeleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setEditingTitle("");
      setEditingBody("");
    }
  }

  async function handleCopy(text: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        alert("Template body copied to clipboard!");
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        alert("Template body copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to copy text", err);
      alert("Could not copy to clipboard.");
    }
  }

  // Start editing a template
  function handleStartEdit(template: Template) {
    setEditingId(template.id);
    setEditingTitle(template.title);
    setEditingBody(template.body);
  }

  // Save edits
  function handleSaveEdit(id: string) {
    const trimmedTitle = editingTitle.trim();
    const trimmedBody = editingBody.trim();

    if (!trimmedTitle || !trimmedBody) {
      alert("Title and body are required.");
      return;
    }

    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title: trimmedTitle, body: trimmedBody } : t
      )
    );

    setEditingId(null);
    setEditingTitle("");
    setEditingBody("");
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setEditingBody("");
  }

  // ---------- Pin / Unpin ----------

  function handlePinTemplate(id: string) {
    const now = Date.now();
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              pinned: true,
              pinnedAt: t.pinnedAt ?? now,
            }
          : t
      )
    );
  }

  function handleUnpinTemplate(id: string) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              pinned: false,
              pinnedAt: null,
            }
          : t
      )
    );
  }

  // ---------- Boards (standalone create) ----------

  function handleCreateBoard() {
    const trimmed = newBoardName.trim();
    if (!trimmed) {
      alert("Board name is required.");
      return;
    }

    const id =
      trimmed.toLowerCase().replace(/\s+/g, "-") +
      "-" +
      Date.now().toString(36);

    const newBoard: Board = {
      id,
      name: trimmed,
      isDefault: false,
    };

    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    setNewBoardName("");
    setShowCreateBoardModal(false);
  }

  function handleOpenCreateBoardModal() {
    setNewBoardName("");
    setShowCreateBoardModal(true);
  }

  function handleCancelCreateBoard() {
    setNewBoardName("");
    setShowCreateBoardModal(false);
  }

  // ---------- Assign template to board (existing template) ----------

  function handleRequestAssignBoard(templateId: string) {
    if (!boards.length) {
      alert("Please create a board first.");
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    const defaultBoardId =
      template?.boardId ||
      activeBoardId ||
      boards[0]?.id ||
      HOME_BOARD_ID;

    setAssignSource("existing");
    setAssignTemplateId(templateId);
    setAssignBoardId(defaultBoardId);
    setShowAssignBoardModal(true);
  }

  // Helper: do the actual assignment (used by Confirm and "Create & use")
  function performAssignToBoard(boardId: string) {
    if (!boardId) {
      alert("Please choose a board.");
      return;
    }

    if (assignSource === "existing" && assignTemplateId) {
      // move existing template to chosen board
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === assignTemplateId ? { ...t, boardId } : t
        )
      );
    } else if (assignSource === "new") {
      // create a brand new template into chosen board
      const trimmedTitle = pendingNewTemplateTitle.trim();
      const trimmedBody = pendingNewTemplateBody.trim();

      if (!trimmedTitle || !trimmedBody) {
        alert("Title and body are required.");
        return;
      }

      const newTemplate: Template = {
        id: Date.now().toString() + Math.random().toString(16),
        title: trimmedTitle,
        body: trimmedBody,
        pinned: false,
        pinnedAt: null,
        boardId,
      };

      setTemplates((prev) => [newTemplate, ...prev]);
      setTitle("");
      setBody("");
      setRecentlyAddedId(newTemplate.id);
    }

    // reset assign state
    setShowAssignBoardModal(false);
    setAssignBoardId("");
    setAssignTemplateId(null);
    setAssignSource(null);
    setPendingNewTemplateTitle("");
    setPendingNewTemplateBody("");
    setAssignNewBoardName("");
  }

  function handleConfirmAssignBoard() {
    performAssignToBoard(assignBoardId);
  }

  function handleCancelAssignBoard() {
    setShowAssignBoardModal(false);
    setAssignBoardId("");
    setAssignTemplateId(null);
    setAssignSource(null);
    setPendingNewTemplateTitle("");
    setPendingNewTemplateBody("");
    setAssignNewBoardName("");
  }

  // create a board *from* the assign modal and immediately use it
  function handleCreateBoardFromAssign() {
    const trimmed = assignNewBoardName.trim();
    if (!trimmed) {
      alert("Board name is required.");
      return;
    }

    const id =
      trimmed.toLowerCase().replace(/\s+/g, "-") +
      "-" +
      Date.now().toString(36);

    const newBoard: Board = {
      id,
      name: trimmed,
      isDefault: false,
    };

    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    setAssignBoardId(id);
    setAssignNewBoardName("");

    // Immediately assign this template / new template into the new board
    performAssignToBoard(id);
  }

  // ---------- Delete board ----------

  function handleRequestDeleteBoard() {
    if (!activeBoardId || activeBoardId === HOME_BOARD_ID) return;

    const board = boards.find((b) => b.id === activeBoardId);
    setBoardToDeleteId(activeBoardId);
    setBoardToDeleteName(board?.name || "this board");
    setShowDeleteBoardModal(true);
  }

  function handleConfirmDeleteBoard() {
    if (!boardToDeleteId) {
      setShowDeleteBoardModal(false);
      return;
    }
    if (boardToDeleteId === HOME_BOARD_ID) {
      setShowDeleteBoardModal(false);
      return;
    }

    setBoards((prevBoards) => {
      const updated = prevBoards.filter((b) => b.id !== boardToDeleteId);

      setActiveBoardId((prevActive) => {
        if (prevActive && prevActive !== boardToDeleteId) return prevActive;

        const home = updated.find((b) => b.id === HOME_BOARD_ID);
        if (home) return home.id;

        return updated[0]?.id ?? null;
      });

      return updated;
    });

    setTemplates((prev) =>
      prev.filter((t) => t.boardId !== boardToDeleteId)
    );

    setShowDeleteBoardModal(false);
    setBoardToDeleteId(null);
    setBoardToDeleteName("");
  }

  function handleCancelDeleteBoard() {
    setShowDeleteBoardModal(false);
    setBoardToDeleteId(null);
    setBoardToDeleteName("");
  }

  // ---------- Filtering (with search scope) ----------

  const normalizedSearch = search.toLowerCase().trim();

  const baseActiveBoardTemplates = templates.filter((t) =>
    activeBoardId ? t.boardId === activeBoardId : true
  );

  let filteredTemplates: Template[];
  let gridBoardName: string;
  let gridCanDeleteBoard: boolean;

  if (normalizedSearch) {
    // We are searching
    if (searchScopeBoardId === "all") {
      // search across all boards
      filteredTemplates = templates.filter((t) =>
        t.title.toLowerCase().includes(normalizedSearch)
      );
      gridBoardName = `Search: "${search}" (all boards)`;
    } else {
      // search within a specific board
      filteredTemplates = templates.filter(
        (t) =>
          t.boardId === searchScopeBoardId &&
          t.title.toLowerCase().includes(normalizedSearch)
      );
      const scopeBoardName =
        boards.find((b) => b.id === searchScopeBoardId)?.name ||
        "Selected board";
      gridBoardName = `Search: "${search}" (${scopeBoardName})`;
    }

    // In search mode we don't show "Delete Board" in the grid header
    gridCanDeleteBoard = false;
  } else {
    // Normal per-board view (no search text)
    filteredTemplates = baseActiveBoardTemplates;

    gridBoardName =
      boards.find((b) => b.id === activeBoardId)?.name ??
      boards.find((b) => b.id === HOME_BOARD_ID)?.name ??
      "Home";

    gridCanDeleteBoard =
      !!activeBoardId && activeBoardId !== HOME_BOARD_ID;
  }

  // For the creator button label: always based on the actual active board, not search
  const creatorBoardName =
    boards.find((b) => b.id === activeBoardId)?.name ??
    boards.find((b) => b.id === HOME_BOARD_ID)?.name ??
    "Home";

  const mainBg = darkMode ? "#020617" : "#e5e7eb";
  const mainText = darkMode ? "#e5e7eb" : "#111827";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "1rem 2rem",
        width: "100vw",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        backgroundColor: mainBg,
        color: mainText,
      }}
    >
      {/* HEADER + BOARD CONTROLS + TOGGLES */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
          }}
        >
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              margin: 0,
              color: mainText,
            }}
          >
            TEMPLIFY - A clipboard on Steroids!
          </h1>

          {/* Board selector (still controls active board even if search is global) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "0.9rem",
                color: darkMode ? "#9ca3af" : "#4b5563",
              }}
            >
              Board:
            </span>
            <select
              value={activeBoardId ?? HOME_BOARD_ID}
              onChange={(e) => setActiveBoardId(e.target.value)}
              style={{
                padding: "0.3rem 0.6rem",
                borderRadius: "999px",
                border: "1px solid #9ca3af",
                backgroundColor: darkMode ? "#020617" : "white",
                color: mainText,
                fontSize: "0.9rem",
              }}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right-side controls */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Create board button – to the LEFT of dark mode */}
          <button
            type="button"
            onClick={handleOpenCreateBoardModal}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid #3b82f6",
              backgroundColor: darkMode ? "#020617" : "#eff6ff",
              color: darkMode ? "#bfdbfe" : "#1d4ed8",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            + Create Board
          </button>

          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid #4b5563",
              backgroundColor: darkMode ? "#111827" : "#f9fafb",
              color: darkMode ? "#e5e7eb" : "#111827",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {darkMode ? "Light mode" : "Dark mode"}
          </button>

          {/* Creator toggle */}
          <button
            type="button"
            onClick={() => setShowCreator((prev) => !prev)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              backgroundColor: showCreator
                ? darkMode
                  ? "#0f172a"
                  : "#f9fafb"
                : darkMode
                ? "#e5e7eb"
                : "#111827",
              color: showCreator
                ? darkMode
                  ? "#e5e7eb"
                  : "#111827"
                : darkMode
                ? "#020617"
                : "#f9fafb",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {showCreator ? "Hide Creator" : "Show Creator"}
          </button>
        </div>
      </div>

      {/* TEMPLATE CREATOR (can be hidden) */}
      {showCreator && (
        <>
          <TemplateCreator
            title={title}
            body={body}
            onTitleChange={setTitle}
            onBodyChange={setBody}
            onSubmit={handleAddTemplateToActiveBoard} // save to current board
            onAddToBoardClick={handleCreatorAddToBoardClick}
            darkMode={darkMode}
            currentBoardName={creatorBoardName}
          />
          {/* Small safety notice under the creator */}
          <p
            style={{
              marginTop: "0.25rem",
              fontSize: "0.75rem",
              color: darkMode ? "#9ca3af" : "#6b7280",
              maxWidth: "480px",
            }}
          >
            Your templates are stored locally in this browser.
            <br />
            Please don&apos;t paste passwords, API keys, or highly sensitive
            data.
          </p>
        </>
      )}

      {/* SEARCH BAR */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        darkMode={darkMode}
        boards={boards}
        searchScopeBoardId={searchScopeBoardId}
        onSearchScopeChange={setSearchScopeBoardId}
      />

      {/* CLIPBOARD GRID */}
      <section
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: "0.25rem",
          width: "100%",
        }}
      >
        <TemplatesGrid
          templates={filteredTemplates}
          onCopy={handleCopy}
          onDelete={handleDeleteTemplate}
          editingId={editingId}
          editingTitle={editingTitle}
          editingBody={editingBody}
          onStartEdit={handleStartEdit}
          onChangeEditingTitle={setEditingTitle}
          onChangeEditingBody={setEditingBody}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          recentlyAddedId={recentlyAddedId}
          darkMode={darkMode}
          onPin={handlePinTemplate}
          onUnpin={handleUnpinTemplate}
          onRequestAssignBoard={handleRequestAssignBoard}
          activeBoardName={gridBoardName}
          canDeleteBoard={gridCanDeleteBoard}
          onRequestDeleteBoard={handleRequestDeleteBoard}
        />
      </section>

      {/* CREATE BOARD MODAL */}
      {showCreateBoardModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: darkMode ? "#020617" : "white",
              padding: "1.25rem 1.5rem",
              borderRadius: "10px",
              minWidth: "280px",
              maxWidth: "90vw",
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5)",
              border: darkMode ? "1px solid #4b5563" : "none",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "0.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: darkMode ? "#e5e7eb" : "#111827",
              }}
            >
              Create custom board
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: "0.75rem",
                fontSize: "0.9rem",
                color: darkMode ? "#9ca3af" : "#4b5563",
              }}
            >
              What is the name of your custom board?
            </p>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="e.g. Sales replies, Support snippets..."
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #9ca3af",
                backgroundColor: darkMode ? "#020617" : "white",
                color: darkMode ? "#e5e7eb" : "#111827",
                marginBottom: "0.75rem",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={handleCancelCreateBoard}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: "6px",
                  border: `1px solid ${
                    darkMode ? "#4b5563" : "#d1d5db"
                  }`,
                  backgroundColor: darkMode ? "#020617" : "white",
                  color: darkMode ? "#e5e7eb" : "#111827",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateBoard}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "white",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN TO BOARD MODAL */}
      {showAssignBoardModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
          }}
        >
          <div
            style={{
              backgroundColor: darkMode ? "#020617" : "white",
              padding: "1.25rem 1.5rem",
              borderRadius: "10px",
              minWidth: "280px",
              maxWidth: "90vw",
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5)",
              border: darkMode ? "1px solid #4b5563" : "none",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "0.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: darkMode ? "#e5e7eb" : "#111827",
              }}
            >
              {assignSource === "existing"
                ? "Add template to board"
                : "Save template to board"}
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: "0.75rem",
                fontSize: "0.9rem",
                color: darkMode ? "#9ca3af" : "#4b5563",
              }}
            >
              Choose a board, or create a new one and use it right away.
            </p>

            {/* existing boards dropdown */}
            <select
              value={assignBoardId}
              onChange={(e) => setAssignBoardId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.7rem",
                borderRadius: "6px",
                border: "1px solid #9ca3af",
                backgroundColor: darkMode ? "#020617" : "white",
                color: darkMode ? "#e5e7eb" : "#111827",
                marginBottom: "0.75rem",
              }}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Inline create-new-board + use it */}
            <div
              style={{
                marginBottom: "0.75rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  marginBottom: "0.35rem",
                  fontSize: "0.85rem",
                  color: darkMode ? "#9ca3af" : "#6b7280",
                }}
              >
                Or create a new board and assign this template to it:
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  value={assignNewBoardName}
                  onChange={(e) => setAssignNewBoardName(e.target.value)}
                  placeholder="New board name"
                  style={{
                    flex: 1,
                    minWidth: "140px",
                    padding: "0.4rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #9ca3af",
                    backgroundColor: darkMode ? "#020617" : "white",
                    color: darkMode ? "#e5e7eb" : "#111827",
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateBoardFromAssign}
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#2563eb",
                    color: "white",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                  }}
                >
                  Create &amp; use
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={handleCancelAssignBoard}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: "6px",
                  border: `1px solid ${
                    darkMode ? "#4b5563" : "#d1d5db"
                  }`,
                  backgroundColor: darkMode ? "#020617" : "white",
                  color: darkMode ? "#e5e7eb" : "#111827",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignBoard}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#2563eb",
                  color: "white",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BOARD MODAL */}
      {showDeleteBoardModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 70,
          }}
        >
          <div
            style={{
              backgroundColor: darkMode ? "#020617" : "white",
              padding: "1.25rem 1.5rem",
              borderRadius: "10px",
              minWidth: "280px",
              maxWidth: "90vw",
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5)",
              border: darkMode ? "1px solid #4b5563" : "none",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "0.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: darkMode ? "#e5e7eb" : "#111827",
              }}
            >
              Delete board?
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: "0.75rem",
                fontSize: "0.9rem",
                color: darkMode ? "#9ca3af" : "#4b5563",
              }}
            >
              Are you sure you want to delete the board{" "}
              <strong>{boardToDeleteName}</strong> and all templates in it?
              This cannot be undone.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={handleCancelDeleteBoard}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: "6px",
                  border: `1px solid ${
                    darkMode ? "#4b5563" : "#d1d5db"
                  }`,
                  backgroundColor: darkMode ? "#020617" : "white",
                  color: darkMode ? "#e5e7eb" : "#111827",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBoard}
                style={{
                  padding: "0.35rem 0.8rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#b91c1c",
                  color: "white",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Delete board
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
