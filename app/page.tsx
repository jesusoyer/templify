"use client";

import React, { useEffect, useRef, useState } from "react";
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

// ---------- Export helpers ----------

function exportJSON(boards: Board[], templates: Template[], scope: "all" | "current", activeBoardId: string | null) {
  const exportBoards = scope === "all" ? boards : boards.filter((b) => b.id === activeBoardId);
  const exportTemplates = scope === "all" ? templates : templates.filter((t) => t.boardId === activeBoardId);
  const data = { boards: exportBoards, templates: exportTemplates };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = scope === "all" ? "templify-all-boards.json" : `templify-${activeBoardId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(boards: Board[], templates: Template[], scope: "all" | "current", activeBoardId: string | null) {
  const exportTemplates = scope === "all" ? templates : templates.filter((t) => t.boardId === activeBoardId);
  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b.name]));

  const header = ["id", "title", "body", "boardId", "boardName", "pinned", "pinnedAt"];
  const rows = exportTemplates.map((t) => [
    t.id,
    `"${(t.title || "").replace(/"/g, '""')}"`,
    `"${(t.body || "").replace(/"/g, '""')}"`,
    t.boardId ?? "",
    `"${(boardMap[t.boardId ?? ""] || "").replace(/"/g, '""')}"`,
    t.pinned ? "true" : "false",
    t.pinnedAt ?? "",
  ]);

  const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = scope === "all" ? "templify-all-boards.csv" : `templify-${activeBoardId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Import helper (merge) ----------

function mergeImport(
  file: File,
  existingBoards: Board[],
  existingTemplates: Template[],
  onSuccess: (boards: Board[], templates: Template[]) => void,
  onError: (msg: string) => void
) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;

      if (file.name.endsWith(".json")) {
        const data = JSON.parse(text) as { boards?: Board[]; templates?: Template[] };

        if (!data.boards || !data.templates) {
          onError("Invalid JSON format. File must contain 'boards' and 'templates' arrays.");
          return;
        }

        // Merge boards — add only boards whose id doesn't already exist
        const existingBoardIds = new Set(existingBoards.map((b) => b.id));
        const newBoards = data.boards.filter((b) => !existingBoardIds.has(b.id));

        // Merge templates — add only templates whose id doesn't already exist
        const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));
        const newTemplates = data.templates
          .filter((t) => !existingTemplateIds.has(t.id))
          .map((t) => ({ ...t, boardId: t.boardId ?? HOME_BOARD_ID }));

        onSuccess(
          [...existingBoards, ...newBoards],
          [...existingTemplates, ...newTemplates]
        );

      } else if (file.name.endsWith(".csv")) {
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          onError("CSV file appears to be empty.");
          return;
        }

        // Parse CSV rows (handles quoted fields with commas inside)
        function parseCSVLine(line: string): string[] {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
              else { inQuotes = !inQuotes; }
            } else if (ch === "," && !inQuotes) {
              result.push(current);
              current = "";
            } else {
              current += ch;
            }
          }
          result.push(current);
          return result;
        }

        const headers = parseCSVLine(lines[0]);
        const idIdx = headers.indexOf("id");
        const titleIdx = headers.indexOf("title");
        const bodyIdx = headers.indexOf("body");
        const boardIdIdx = headers.indexOf("boardId");
        const boardNameIdx = headers.indexOf("boardName");
        const pinnedIdx = headers.indexOf("pinned");
        const pinnedAtIdx = headers.indexOf("pinnedAt");

        if (idIdx === -1 || titleIdx === -1 || bodyIdx === -1) {
          onError("CSV missing required columns: id, title, body.");
          return;
        }

        const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));
        const existingBoardIds = new Set(existingBoards.map((b) => b.id));

        const newBoards: Board[] = [];
        const newTemplates: Template[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          const id = cols[idIdx]?.trim();
          if (!id || existingTemplateIds.has(id)) continue;

          const boardId = cols[boardIdIdx]?.trim() || HOME_BOARD_ID;
          const boardName = cols[boardNameIdx]?.trim() || "Imported";

          // Auto-create board if it doesn't exist
          if (boardId && !existingBoardIds.has(boardId) && !newBoards.find((b) => b.id === boardId)) {
            newBoards.push({ id: boardId, name: boardName, isDefault: false });
            existingBoardIds.add(boardId);
          }

          newTemplates.push({
            id,
            title: cols[titleIdx]?.trim() || "Untitled",
            body: cols[bodyIdx]?.trim() || "",
            boardId,
            pinned: cols[pinnedIdx]?.trim() === "true",
            pinnedAt: pinnedAtIdx !== -1 && cols[pinnedAtIdx]?.trim()
              ? Number(cols[pinnedAtIdx].trim())
              : null,
          });
        }

        onSuccess(
          [...existingBoards, ...newBoards],
          [...existingTemplates, ...newTemplates]
        );

      } else {
        onError("Unsupported file type. Please import a .json or .csv file.");
      }
    } catch {
      onError("Failed to parse file. Please make sure it was exported from Templify.");
    }
  };

  reader.readAsText(file);
}

// ---------- Page component ----------

export default function ClipboardTemplatesPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);

  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [searchScopeBoardId, setSearchScopeBoardId] = useState<string>("all");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");

  const [showCreator, setShowCreator] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Modals
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");

  const [showAssignBoardModal, setShowAssignBoardModal] = useState(false);
  const [assignBoardId, setAssignBoardId] = useState<string>("");
  const [assignSource, setAssignSource] = useState<"existing" | "new" | null>(null);
  const [assignTemplateId, setAssignTemplateId] = useState<string | null>(null);
  const [pendingNewTemplateTitle, setPendingNewTemplateTitle] = useState<string>("");
  const [pendingNewTemplateBody, setPendingNewTemplateBody] = useState<string>("");
  const [assignNewBoardName, setAssignNewBoardName] = useState("");

  const [showDeleteBoardModal, setShowDeleteBoardModal] = useState(false);
  const [boardToDeleteId, setBoardToDeleteId] = useState<string | null>(null);
  const [boardToDeleteName, setBoardToDeleteName] = useState<string>("");

  // Export modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [exportScope, setExportScope] = useState<"all" | "current">("all");

  // Import
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // ---- localStorage load/save ----

  useEffect(() => {
    try {
      const stored = localStorage.getItem("clipboard-templates");
      if (stored) {
        const parsed = JSON.parse(stored) as Template[];
        setTemplates(parsed.map((t) => ({ ...t, boardId: t.boardId ?? HOME_BOARD_ID })));
      }
    } catch (err) { console.error(err); }
  }, []);

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
      const homeBoard: Board = { id: HOME_BOARD_ID, name: "Home", isDefault: true };
      setBoards([homeBoard]);
      setActiveBoardId(HOME_BOARD_ID);
      console.error(err);
    }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("clipboard-templates", JSON.stringify(templates)); } catch (err) { console.error(err); }
  }, [templates]);

  useEffect(() => {
    try { localStorage.setItem("clipboard-boards", JSON.stringify(boards)); } catch (err) { console.error(err); }
  }, [boards]);

  useEffect(() => {
    if (!activeBoardId) return;
    try { localStorage.setItem("clipboard-active-board", activeBoardId); } catch (err) { console.error(err); }
  }, [activeBoardId]);

  useEffect(() => {
    if (!recentlyAddedId) return;
    const t = setTimeout(() => setRecentlyAddedId(null), 1000);
    return () => clearTimeout(t);
  }, [recentlyAddedId]);

  // Auto-clear import message
  useEffect(() => {
    if (!importMessage) return;
    const t = setTimeout(() => setImportMessage(null), 4000);
    return () => clearTimeout(t);
  }, [importMessage]);

  // ---- Template creation ----

  function handleAddTemplateToActiveBoard(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) { alert("Title and body are required."); return; }
    const newTemplate: Template = {
      id: Date.now().toString() + Math.random().toString(16),
      title: trimmedTitle, body: trimmedBody,
      pinned: false, pinnedAt: null,
      boardId: activeBoardId || HOME_BOARD_ID,
    };
    setTemplates((prev) => [newTemplate, ...prev]);
    setTitle(""); setBody("");
    setRecentlyAddedId(newTemplate.id);
    setShowCreator(false);
  }

  function handleCreatorAddToBoardClick() {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) { alert("Title and body are required before adding to a board."); return; }
    if (!boards.length) { alert("Please create a board first."); return; }
    setPendingNewTemplateTitle(trimmedTitle);
    setPendingNewTemplateBody(trimmedBody);
    setAssignSource("new");
    setAssignTemplateId(null);
    setAssignBoardId(activeBoardId || boards[0]?.id || HOME_BOARD_ID);
    setShowAssignBoardModal(true);
  }

  function handleDeleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) { setEditingId(null); setEditingTitle(""); setEditingBody(""); }
  }

  async function handleCopy(text: string) {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); }
      else {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      }
    } catch (err) { console.error("Failed to copy text", err); }
  }

  function handleStartEdit(template: Template) {
    setEditingId(template.id); setEditingTitle(template.title); setEditingBody(template.body);
  }

  function handleSaveEdit(id: string) {
    const trimmedTitle = editingTitle.trim();
    const trimmedBody = editingBody.trim();
    if (!trimmedTitle || !trimmedBody) { alert("Title and body are required."); return; }
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, title: trimmedTitle, body: trimmedBody } : t));
    setEditingId(null); setEditingTitle(""); setEditingBody("");
  }

  function handleCancelEdit() { setEditingId(null); setEditingTitle(""); setEditingBody(""); }

  function handlePinTemplate(id: string) {
    const now = Date.now();
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, pinned: true, pinnedAt: t.pinnedAt ?? now } : t));
  }

  function handleUnpinTemplate(id: string) {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, pinned: false, pinnedAt: null } : t));
  }

  // ---- Boards ----

  function handleCreateBoard() {
    const trimmed = newBoardName.trim();
    if (!trimmed) { alert("Board name is required."); return; }
    const id = trimmed.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const newBoard: Board = { id, name: trimmed, isDefault: false };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    setNewBoardName(""); setShowCreateBoardModal(false);
  }

  function handleOpenCreateBoardModal() { setNewBoardName(""); setShowCreateBoardModal(true); }
  function handleCancelCreateBoard() { setNewBoardName(""); setShowCreateBoardModal(false); }

  function handleRequestAssignBoard(templateId: string) {
    if (!boards.length) { alert("Please create a board first."); return; }
    const template = templates.find((t) => t.id === templateId);
    setAssignSource("existing");
    setAssignTemplateId(templateId);
    setAssignBoardId(template?.boardId || activeBoardId || boards[0]?.id || HOME_BOARD_ID);
    setShowAssignBoardModal(true);
  }

  function performAssignToBoard(boardId: string) {
    if (!boardId) { alert("Please choose a board."); return; }
    if (assignSource === "existing" && assignTemplateId) {
      setTemplates((prev) => prev.map((t) => t.id === assignTemplateId ? { ...t, boardId } : t));
    } else if (assignSource === "new") {
      const trimmedTitle = pendingNewTemplateTitle.trim();
      const trimmedBody = pendingNewTemplateBody.trim();
      if (!trimmedTitle || !trimmedBody) { alert("Title and body are required."); return; }
      const newTemplate: Template = {
        id: Date.now().toString() + Math.random().toString(16),
        title: trimmedTitle, body: trimmedBody,
        pinned: false, pinnedAt: null, boardId,
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      setTitle(""); setBody("");
      setRecentlyAddedId(newTemplate.id);
    }
    setShowAssignBoardModal(false);
    setAssignBoardId(""); setAssignTemplateId(null); setAssignSource(null);
    setPendingNewTemplateTitle(""); setPendingNewTemplateBody(""); setAssignNewBoardName("");
    setShowCreator(false);
  }

  function handleConfirmAssignBoard() { performAssignToBoard(assignBoardId); }

  function handleCancelAssignBoard() {
    setShowAssignBoardModal(false);
    setAssignBoardId(""); setAssignTemplateId(null); setAssignSource(null);
    setPendingNewTemplateTitle(""); setPendingNewTemplateBody(""); setAssignNewBoardName("");
  }

  function handleCreateBoardFromAssign() {
    const trimmed = assignNewBoardName.trim();
    if (!trimmed) { alert("Board name is required."); return; }
    const id = trimmed.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const newBoard: Board = { id, name: trimmed, isDefault: false };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    setAssignBoardId(id); setAssignNewBoardName("");
    performAssignToBoard(id);
  }

  function handleRequestDeleteBoard() {
    if (!activeBoardId || activeBoardId === HOME_BOARD_ID) return;
    const board = boards.find((b) => b.id === activeBoardId);
    setBoardToDeleteId(activeBoardId);
    setBoardToDeleteName(board?.name || "this board");
    setShowDeleteBoardModal(true);
  }

  function handleConfirmDeleteBoard() {
    if (!boardToDeleteId || boardToDeleteId === HOME_BOARD_ID) { setShowDeleteBoardModal(false); return; }
    setBoards((prevBoards) => {
      const updated = prevBoards.filter((b) => b.id !== boardToDeleteId);
      setActiveBoardId((prevActive) => {
        if (prevActive && prevActive !== boardToDeleteId) return prevActive;
        return updated.find((b) => b.id === HOME_BOARD_ID)?.id ?? updated[0]?.id ?? null;
      });
      return updated;
    });
    setTemplates((prev) => prev.filter((t) => t.boardId !== boardToDeleteId));
    setShowDeleteBoardModal(false); setBoardToDeleteId(null); setBoardToDeleteName("");
  }

  function handleCancelDeleteBoard() {
    setShowDeleteBoardModal(false); setBoardToDeleteId(null); setBoardToDeleteName("");
  }

  // ---- Export ----

  function handleExport() {
    if (exportFormat === "json") {
      exportJSON(boards, templates, exportScope, activeBoardId);
    } else {
      exportCSV(boards, templates, exportScope, activeBoardId);
    }
    setShowExportModal(false);
  }

  // ---- Import ----

  function handleImportClick() {
    importInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    mergeImport(
      file,
      boards,
      templates,
      (mergedBoards, mergedTemplates) => {
        setBoards(mergedBoards);
        setTemplates(mergedTemplates);
        const added = mergedTemplates.length - templates.length;
        const addedBoards = mergedBoards.length - boards.length;
        setImportMessage({
          type: "success",
          text: `✓ Imported ${added} template${added !== 1 ? "s" : ""} and ${addedBoards} board${addedBoards !== 1 ? "s" : ""}.`,
        });
      },
      (msg) => setImportMessage({ type: "error", text: msg })
    );

    // Reset input so same file can be re-imported if needed
    e.target.value = "";
  }

  // ---- Filtering ----

  const normalizedSearch = search.toLowerCase().trim();
  const baseActiveBoardTemplates = templates.filter((t) => activeBoardId ? t.boardId === activeBoardId : true);

  let filteredTemplates: Template[];
  let gridBoardName: string;
  let gridCanDeleteBoard: boolean;

  if (normalizedSearch) {
    if (searchScopeBoardId === "all") {
      filteredTemplates = templates.filter((t) => t.title.toLowerCase().includes(normalizedSearch));
      gridBoardName = `Search: "${search}" (all boards)`;
    } else {
      filteredTemplates = templates.filter(
        (t) => t.boardId === searchScopeBoardId && t.title.toLowerCase().includes(normalizedSearch)
      );
      const scopeBoardName = boards.find((b) => b.id === searchScopeBoardId)?.name || "Selected board";
      gridBoardName = `Search: "${search}" (${scopeBoardName})`;
    }
    gridCanDeleteBoard = false;
  } else {
    filteredTemplates = baseActiveBoardTemplates;
    gridBoardName =
      boards.find((b) => b.id === activeBoardId)?.name ??
      boards.find((b) => b.id === HOME_BOARD_ID)?.name ?? "Home";
    gridCanDeleteBoard = !!activeBoardId && activeBoardId !== HOME_BOARD_ID;
  }

  const creatorBoardName =
    boards.find((b) => b.id === activeBoardId)?.name ??
    boards.find((b) => b.id === HOME_BOARD_ID)?.name ?? "Home";

  const mainBg = darkMode ? "#020617" : "#e5e7eb";
  const mainText = darkMode ? "#e5e7eb" : "#111827";

  const modalBoxStyle: React.CSSProperties = {
    backgroundColor: darkMode ? "#1f2937" : "white",
    padding: "2rem", borderRadius: "0.5rem",
    maxWidth: "28rem", width: "90%",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  };

  const radioLabelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.5rem",
    fontSize: "0.9rem", color: mainText, cursor: "pointer",
  };

  return (
    <main
      style={{
        minHeight: "100vh", padding: "1rem 2rem", width: "100vw",
        boxSizing: "border-box", fontFamily: "system-ui, sans-serif",
        display: "flex", flexDirection: "column", gap: "1rem",
        backgroundColor: mainBg, color: mainText,
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: mainText }}>
            TEMPLIFY - A clipboard on Steroids!
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.9rem", color: darkMode ? "#9ca3af" : "#4b5563" }}>Board:</span>
            <select
              value={activeBoardId ?? HOME_BOARD_ID}
              onChange={(e) => setActiveBoardId(e.target.value)}
              style={{
                padding: "0.3rem 0.6rem", borderRadius: "999px",
                border: "1px solid #9ca3af",
                backgroundColor: darkMode ? "#020617" : "white",
                color: mainText, fontSize: "0.9rem",
              }}
            >
              {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {activeBoardId && activeBoardId !== HOME_BOARD_ID && (
              <button type="button" onClick={handleRequestDeleteBoard}
                style={{
                  padding: "0.25rem 0.6rem", borderRadius: "999px",
                  border: "1px solid #b91c1c",
                  backgroundColor: darkMode ? "#111827" : "#fef2f2",
                  color: "#b91c1c", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500,
                }}
              >Delete</button>
            )}
          </div>
        </div>

        {/* Right-side header controls */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>

          {/* Import feedback message */}
          {importMessage && (
            <span style={{
              fontSize: "0.8rem", fontWeight: 500,
              color: importMessage.type === "success"
                ? (darkMode ? "#4ade80" : "#15803d")
                : (darkMode ? "#fca5a5" : "#dc2626"),
              backgroundColor: importMessage.type === "success"
                ? (darkMode ? "#052e16" : "#f0fdf4")
                : (darkMode ? "#1c0a0a" : "#fff5f5"),
              border: `1px solid ${importMessage.type === "success"
                ? (darkMode ? "#166534" : "#bbf7d0")
                : (darkMode ? "#fca5a5" : "#fca5a5")}`,
              borderRadius: "999px",
              padding: "0.25rem 0.75rem",
            }}>
              {importMessage.text}
            </span>
          )}

          {/* Export button */}
          <button type="button" onClick={() => setShowExportModal(true)}
            style={{
              padding: "0.4rem 0.8rem", borderRadius: "999px",
              border: "1px solid #7c3aed",
              backgroundColor: darkMode ? "#020617" : "#f5f3ff",
              color: darkMode ? "#c4b5fd" : "#6d28d9",
              fontSize: "0.9rem", cursor: "pointer", fontWeight: 500,
            }}
          >↑ Export</button>

          {/* Import button + hidden file input */}
          <button type="button" onClick={handleImportClick}
            style={{
              padding: "0.4rem 0.8rem", borderRadius: "999px",
              border: "1px solid #0891b2",
              backgroundColor: darkMode ? "#020617" : "#ecfeff",
              color: darkMode ? "#67e8f9" : "#0e7490",
              fontSize: "0.9rem", cursor: "pointer", fontWeight: 500,
            }}
          >↓ Import</button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,.csv"
            onChange={handleImportFile}
            style={{ display: "none" }}
          />

          {/* Dark mode */}
          <button type="button" onClick={() => setDarkMode((prev) => !prev)}
            style={{
              padding: "0.4rem 0.8rem", borderRadius: "999px",
              border: "1px solid #4b5563",
              backgroundColor: darkMode ? "#111827" : "#f9fafb",
              color: darkMode ? "#e5e7eb" : "#111827",
              fontSize: "0.9rem", cursor: "pointer", fontWeight: 500,
            }}
          >{darkMode ? "Light mode" : "Dark mode"}</button>
        </div>
      </div>

      {/* SEARCH BAR */}
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

      {/* TEMPLATE CREATOR */}
      {showCreator && (
        <TemplateCreator
          title={title} body={body}
          onTitleChange={setTitle} onBodyChange={setBody}
          onSubmit={handleAddTemplateToActiveBoard}
          onAddToBoardClick={handleCreatorAddToBoardClick}
          darkMode={darkMode}
          currentBoardName={creatorBoardName}
          onHide={() => setShowCreator(false)}
        />
      )}

      {/* CLIPBOARD GRID */}
      <section style={{ flex: 1, overflowY: "auto", paddingRight: "0.25rem", width: "100%" }}>
        <TemplatesGrid
          templates={filteredTemplates} onCopy={handleCopy} onDelete={handleDeleteTemplate}
          editingId={editingId} editingTitle={editingTitle} editingBody={editingBody}
          onStartEdit={handleStartEdit} onChangeEditingTitle={setEditingTitle}
          onChangeEditingBody={setEditingBody} onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit} recentlyAddedId={recentlyAddedId}
          darkMode={darkMode} onPin={handlePinTemplate} onUnpin={handleUnpinTemplate}
          onRequestAssignBoard={handleRequestAssignBoard}
          activeBoardName={gridBoardName} canDeleteBoard={gridCanDeleteBoard}
          onRequestDeleteBoard={handleRequestDeleteBoard}
        />
      </section>

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
          }}
          onClick={() => setShowExportModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.25rem", color: mainText, marginTop: 0 }}>
              Export Templates
            </h2>

            {/* Format */}
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: darkMode ? "#9ca3af" : "#6b7280", marginBottom: "0.5rem", marginTop: 0 }}>
              FORMAT
            </p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
              <label style={radioLabelStyle}>
                <input type="radio" name="format" value="json"
                  checked={exportFormat === "json"}
                  onChange={() => setExportFormat("json")} />
                JSON <span style={{ fontSize: "0.75rem", color: darkMode ? "#6b7280" : "#9ca3af" }}>(full data, reimportable)</span>
              </label>
              <label style={radioLabelStyle}>
                <input type="radio" name="format" value="csv"
                  checked={exportFormat === "csv"}
                  onChange={() => setExportFormat("csv")} />
                CSV <span style={{ fontSize: "0.75rem", color: darkMode ? "#6b7280" : "#9ca3af" }}>(spreadsheet-friendly)</span>
              </label>
            </div>

            {/* Scope */}
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: darkMode ? "#9ca3af" : "#6b7280", marginBottom: "0.5rem", marginTop: 0 }}>
              SCOPE
            </p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
              <label style={radioLabelStyle}>
                <input type="radio" name="scope" value="all"
                  checked={exportScope === "all"}
                  onChange={() => setExportScope("all")} />
                All boards
              </label>
              <label style={radioLabelStyle}>
                <input type="radio" name="scope" value="current"
                  checked={exportScope === "current"}
                  onChange={() => setExportScope("current")} />
                Current board <span style={{ fontSize: "0.75rem", color: darkMode ? "#6b7280" : "#9ca3af" }}>({creatorBoardName})</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowExportModal(false)}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "0.375rem",
                  border: "1px solid #d1d5db",
                  backgroundColor: darkMode ? "#374151" : "#f9fafb",
                  color: mainText, cursor: "pointer", fontWeight: 500,
                }}
              >Cancel</button>
              <button type="button" onClick={handleExport}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "0.375rem",
                  border: "none", backgroundColor: "#7c3aed",
                  color: "white", cursor: "pointer", fontWeight: 500,
                }}
              >↑ Export {exportFormat.toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE BOARD MODAL */}
      {showCreateBoardModal && (
        <div
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60,
          }}
          onClick={handleCancelCreateBoard}
        >
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: mainText }}>
              Create New Board
            </h2>
            <input
              type="text" placeholder="Board name" value={newBoardName}
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
              <button type="button" onClick={handleCancelCreateBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}
              >Cancel</button>
              <button type="button" onClick={handleCreateBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontWeight: 500 }}
              >Create</button>
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
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: mainText }}>Assign to Board</h2>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>Select a board:</label>
            <select value={assignBoardId} onChange={(e) => setAssignBoardId(e.target.value)}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "white", color: mainText, marginBottom: "1rem" }}
            >
              {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: darkMode ? "#374151" : "#f9fafb", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>Or create a new board:</label>
              <input type="text" placeholder="New board name" value={assignNewBoardName}
                onChange={(e) => setAssignNewBoardName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateBoardFromAssign(); }}
                style={{ width: "100%", padding: "0.4rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#1f2937" : "white", color: mainText, marginBottom: "0.5rem" }}
              />
              <button type="button" onClick={handleCreateBoardFromAssign}
                style={{ padding: "0.4rem 0.8rem", borderRadius: "0.375rem", border: "none", backgroundColor: "#10b981", color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}
              >Create & Use</button>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={handleCancelAssignBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}
              >Cancel</button>
              <button type="button" onClick={handleConfirmAssignBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: "#3b82f6", color: "white", cursor: "pointer", fontWeight: 500 }}
              >Confirm</button>
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
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem", color: mainText }}>Delete Board?</h2>
            <p style={{ marginBottom: "1.5rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>
              Are you sure you want to delete the board <strong>"{boardToDeleteName}"</strong>? This will also delete all templates in this board. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={handleCancelDeleteBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}
              >Cancel</button>
              <button type="button" onClick={handleConfirmDeleteBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: "#dc2626", color: "white", cursor: "pointer", fontWeight: 500 }}
              >Delete Board</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}