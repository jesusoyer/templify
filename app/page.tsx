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

  // Search scope
  const [searchScopeBoardId, setSearchScopeBoardId] = useState<string>("all");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");

  // Creator — hidden by default, toggled from SearchBar
  const [showCreator, setShowCreator] = useState(false);

  // Dark mode
  const [darkMode, setDarkMode] = useState(false);

  // Recently added highlight
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Create-board modal
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  // Assign-to-board modal
  const [showAssignBoardModal, setShowAssignBoardModal] = useState(false);
  const [assignBoardId, setAssignBoardId] = useState<string>("");
  const [assignSource, setAssignSource] = useState<"existing" | "new" | null>(null);
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null);
  const [pendingNewTemplateTitle, setPendingNewTemplateTitle] = useState<string>("");
  const [pendingNewTemplateBody, setPendingNewTemplateBody] = useState<string>("");
  const [assignNewBoardName, setAssignNewBoardName] = useState("");

  // Delete-board modal
  const [showDeleteBoardModal, setShowDeleteBoardModal] = useState(false);
  const [boardToDeleteId, setBoardToDeleteId] = useState<string | null>(null);
  const [boardToDeleteName, setBoardToDeleteName] = useState<string>("");

  // Load templates from localStorage
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
          const storedActive = localStorage.getItem("clipboard-active-board");
          if (storedActive && parsed.some((b) => b.id === storedActive)) {
            setActiveBoardId(storedActive);
          } else {
            setActiveBoardId(parsed[0].id);
          }
          return;
        }
      }
      const homeBoard: Board = { id: HOME_BOARD_ID, name: "Home", isDefault: true };
      setBoards([homeBoard]);
      setActiveBoardId(HOME_BOARD_ID);
    } catch (err) {
      console.error("Failed to load boards from localStorage", err);
      const homeBoard: Board = { id: HOME_BOARD_ID, name: "Home", isDefault: true };
      setBoards([homeBoard]);
      setActiveBoardId(HOME_BOARD_ID);
    }
  }, []);

  // Save templates to localStorage
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

  // Clear highlight after ~1s
  useEffect(() => {
    if (!recentlyAddedId) return;
    const timeout = setTimeout(() => setRecentlyAddedId(null), 1000);
    return () => clearTimeout(timeout);
  }, [recentlyAddedId]);

  // ---------- Template creation ----------

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
    setShowCreator(false);
  }

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
    const defaultBoardId = activeBoardId || boards[0]?.id || HOME_BOARD_ID;
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
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  }

  function handleStartEdit(template: Template) {
    setEditingId(template.id);
    setEditingTitle(template.title);
    setEditingBody(template.body);
  }

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
        t.id === id ? { ...t, pinned: true, pinnedAt: t.pinnedAt ?? now } : t
      )
    );
  }

  function handleUnpinTemplate(id: string) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, pinned: false, pinnedAt: null } : t
      )
    );
  }

  // ---------- Boards ----------

  function handleCreateBoard() {
    const trimmed = newBoardName.trim();
    if (!trimmed) {
      alert("Board name is required.");
      return;
    }
    const id =
      trimmed.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const newBoard: Board = { id, name: trimmed, isDefault: false };
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

  // ---------- Assign to board ----------

  function handleRequestAssignBoard(templateId: string) {
    if (!boards.length) {
      alert("Please create a board first.");
      return;
    }
    const template = templates.find((t) => t.id === templateId);
    const defaultBoardId =
      template?.boardId || activeBoardId || boards[0]?.id || HOME_BOARD_ID;
    setAssignSource("existing");
    setAssignTemplateId(templateId);
    setAssignBoardId(defaultBoardId);
    setShowAssignBoardModal(true);
  }

  function performAssignToBoard(boardId: string) {
    if (!boardId) {
      alert("Please choose a board.");
      return;
    }
    if (assignSource === "existing" && assignTemplateId) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === assignTemplateId ? { ...t, boardId } : t
        )
      );
    } else if (assignSource === "new") {
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
    setShowAssignBoardModal(false);
    setAssignBoardId("");
    setAssignTemplateId(null);
    setAssignSource(null);
    setPendingNewTemplateTitle("");
    setPendingNewTemplateBody("");
    setAssignNewBoardName("");
    setShowCreator(false);
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

  function handleCreateBoardFromAssign() {
    const trimmed = assignNewBoardName.trim();
    if (!trimmed) {
      alert("Board name is required.");
      return;
    }
    const id =
      trimmed.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const newBoard: Board = { id, name: trimmed, isDefault: false };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    setAssignBoardId(id);
    setAssignNewBoardName("");
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
    if (!boardToDeleteId) { setShowDeleteBoardModal(false); return; }
    if (boardToDeleteId === HOME_BOARD_ID) { setShowDeleteBoardModal(false); return; }
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
    setTemplates((prev) => prev.filter((t) => t.boardId !== boardToDeleteId));
    setShowDeleteBoardModal(false);
    setBoardToDeleteId(null);
    setBoardToDeleteName("");
  }

  function handleCancelDeleteBoard() {
    setShowDeleteBoardModal(false);
    setBoardToDeleteId(null);
    setBoardToDeleteName("");
  }

  // ---------- Filtering ----------

  const normalizedSearch = search.toLowerCase().trim();
  const baseActiveBoardTemplates = templates.filter((t) =>
    activeBoardId ? t.boardId === activeBoardId : true
  );

  let filteredTemplates: Template[];
  let gridBoardName: string;
  let gridCanDeleteBoard: boolean;

  if (normalizedSearch) {
    if (searchScopeBoardId === "all") {
      filteredTemplates = templates.filter((t) =>
        t.title.toLowerCase().includes(normalizedSearch)
      );
      gridBoardName = `Search: "${search}" (all boards)`;
    } else {
      filteredTemplates = templates.filter(
        (t) =>
          t.boardId === searchScopeBoardId &&
          t.title.toLowerCase().includes(normalizedSearch)
      );
      const scopeBoardName =
        boards.find((b) => b.id === searchScopeBoardId)?.name || "Selected board";
      gridBoardName = `Search: "${search}" (${scopeBoardName})`;
    }
    gridCanDeleteBoard = false;
  } else {
    filteredTemplates = baseActiveBoardTemplates;
    gridBoardName =
      boards.find((b) => b.id === activeBoardId)?.name ??
      boards.find((b) => b.id === HOME_BOARD_ID)?.name ??
      "Home";
    gridCanDeleteBoard = !!activeBoardId && activeBoardId !== HOME_BOARD_ID;
  }

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
      {/* HEADER + BOARD CONTROLS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: mainText }}>
            TEMPLIFY - A clipboard on Steroids!
          </h1>

          {/* Board selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.9rem", color: darkMode ? "#9ca3af" : "#4b5563" }}>
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
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            {activeBoardId && activeBoardId !== HOME_BOARD_ID && (
              <button
                type="button"
                onClick={handleRequestDeleteBoard}
                style={{
                  padding: "0.25rem 0.6rem",
                  borderRadius: "999px",
                  border: "1px solid #b91c1c",
                  backgroundColor: darkMode ? "#111827" : "#fef2f2",
                  color: "#b91c1c",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Right-side: only Dark mode toggle remains */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
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
        </div>
      </div>

      {/* SEARCH BAR — owns Create Board + New Template buttons */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        darkMode={darkMode}
        boards={boards}
        searchScopeBoardId={searchScopeBoardId}
        onSearchScopeChange={setSearchScopeBoardId}
        showCreator={showCreator}
        onToggleCreator={() => setShowCreator((prev) => !prev)}
        onCreateBoard={handleOpenCreateBoardModal}
      />

      {/* TEMPLATE CREATOR — hidden by default */}
      {showCreator && (
        <TemplateCreator
          title={title}
          body={body}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onSubmit={handleAddTemplateToActiveBoard}
          onAddToBoardClick={handleCreatorAddToBoardClick}
          darkMode={darkMode}
          currentBoardName={creatorBoardName}
        />
      )}

      {/* CLIPBOARD GRID */}
      <section style={{ flex: 1, overflowY: "auto", paddingRight: "0.25rem", width: "100%" }}>
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
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
          }}
          onClick={handleCancelCreateBoard}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: darkMode ? "#1f2937" : "white",
              padding: "2rem", borderRadius: "0.5rem",
              maxWidth: "28rem", width: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: mainText }}>
              Create New Board
            </h2>
            <input
              type="text"
              placeholder="Board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateBoard(); }}
              style={{
                width: "100%", padding: "0.5rem", borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                backgroundColor: darkMode ? "#374151" : "white",
                color: mainText, marginBottom: "1rem",
              }}
            />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button" onClick={handleCancelCreateBoard}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: darkMode ? "#374151" : "#f9fafb",
                  color: mainText, cursor: "pointer", fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleCreateBoard}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "0.375rem",
                  border: "none", backgroundColor: "#3b82f6",
                  color: "white", cursor: "pointer", fontWeight: 500,
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
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
          }}
          onClick={handleCancelAssignBoard}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: darkMode ? "#1f2937" : "white",
              padding: "2rem", borderRadius: "0.5rem",
              maxWidth: "28rem", width: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: mainText }}>
              Assign to Board
            </h2>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>
              Select a board:
            </label>
            <select
              value={assignBoardId}
              onChange={(e) => setAssignBoardId(e.target.value)}
              style={{
                width: "100%", padding: "0.5rem", borderRadius: "0.375rem",
                border: "1px solid #d1d5db",
                backgroundColor: darkMode ? "#374151" : "white",
                color: mainText, marginBottom: "1rem",
              }}
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <div style={{
              marginBottom: "1rem", padding: "0.75rem",
              backgroundColor: darkMode ? "#374151" : "#f9fafb",
              borderRadius: "0.375rem", border: "1px solid #d1d5db",
            }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>
                Or create a new board:
              </label>
              <input
                type="text"
                placeholder="New board name"
                value={assignNewBoardName}
                onChange={(e) => setAssignNewBoardName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateBoardFromAssign(); }}
                style={{
                  width: "100%", padding: "0.4rem", borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: darkMode ? "#1f2937" : "white",
                  color: mainText, marginBottom: "0.5rem",
                }}
              />
              <button
                type="button" onClick={handleCreateBoardFromAssign}
                style={{
                  padding: "0.4rem 0.8rem", borderRadius: "0.375rem",
                  border: "none", backgroundColor: "#10b981",
                  color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500,
                }}
              >
                Create & Use
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button" onClick={handleCancelAssignBoard}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: darkMode ? "#374151" : "#f9fafb",
                  color: mainText, cursor: "pointer", fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleConfirmAssignBoard}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "0.375rem",
                  border: "none", backgroundColor: "#3b82f6",
                  color: "white", cursor: "pointer", fontWeight: 500,
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
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70,
          }}
          onClick={handleCancelDeleteBoard}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: darkMode ? "#1f2937" : "white",
              padding: "2rem", borderRadius: "0.5rem",
              maxWidth: "28rem", width: "90%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: mainText }}>
              Delete Board?
            </h2>
            <p style={{ marginBottom: "1.5rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>
              Are you sure you want to delete the board{" "}
              <strong>"{boardToDeleteName}"</strong>? This will also delete all
              templates in this board. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button" onClick={handleCancelDeleteBoard}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: darkMode ? "#374151" : "#f9fafb",
                  color: mainText, cursor: "pointer", fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                type="button" onClick={handleConfirmDeleteBoard}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "0.375rem",
                  border: "none", backgroundColor: "#dc2626",
                  color: "white", cursor: "pointer", fontWeight: 500,
                }}
              >
                Delete Board
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}