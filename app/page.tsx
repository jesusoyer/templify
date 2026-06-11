"use client";

import React, { useEffect, useRef, useState } from "react";
import TemplateCreator from "./components/TemplateCreator";
import SearchBar from "./components/SearchBar";
import TemplatesGrid from "./components/TemplatesGrid";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Page = {
  id: string;
  name: string;
  isDefault?: boolean;
};

type Board = {
  id: string;
  name: string;
  isDefault?: boolean;
  pageId: string; // every board belongs to a page
};

type Template = {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  pinnedAt?: number | null;
  boardId?: string;
  createdAt?: number | null;
  order?: number;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────



const HOME_PAGE_ID  = "home-page";
const HOME_BOARD_ID = "home-board";

// ─────────────────────────────────────────────
// Export helpers
// ─────────────────────────────────────────────

function exportJSON(
  pages: Page[], boards: Board[], templates: Template[],
  scope: "all" | "current", activeBoardId: string | null
) {
  const exportBoards    = scope === "all" ? boards    : boards.filter((b) => b.id === activeBoardId);
  const exportTemplates = scope === "all" ? templates : templates.filter((t) => t.boardId === activeBoardId);
  const blob = new Blob([JSON.stringify({ pages, boards: exportBoards, templates: exportTemplates }, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = scope === "all" ? "templify-all.json" : `templify-${activeBoardId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(
  boards: Board[], templates: Template[],
  scope: "all" | "current", activeBoardId: string | null
) {
  const exportTemplates = scope === "all" ? templates : templates.filter((t) => t.boardId === activeBoardId);
  const boardMap = Object.fromEntries(boards.map((b) => [b.id, b.name]));
  const header   = ["id","title","body","boardId","boardName","pinned","pinnedAt","createdAt","order"];
  const rows = exportTemplates.map((t) => [
    t.id,
    `"${(t.title||"").replace(/"/g,'""')}"`,
    `"${(t.body||"").replace(/"/g,'""')}"`,
    t.boardId ?? "",
    `"${(boardMap[t.boardId??""]||"").replace(/"/g,'""')}"`,
    t.pinned ? "true" : "false",
    t.pinnedAt  ?? "",
    t.createdAt ?? "",
    t.order     ?? "",
  ]);
  const csv  = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = scope === "all" ? "templify-all.csv" : `templify-${activeBoardId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────
// Import helper
// ─────────────────────────────────────────────

function mergeImport(
  file: File,
  existingPages: Page[], existingBoards: Board[], existingTemplates: Template[],
  onSuccess: (pages: Page[], boards: Board[], templates: Template[]) => void,
  onError: (msg: string) => void
) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      if (file.name.endsWith(".json")) {
        const data = JSON.parse(text) as { pages?: Page[]; boards?: Board[]; templates?: Template[] };
        if (!data.boards || !data.templates) { onError("Invalid JSON: missing 'boards' or 'templates'."); return; }

        const existingPageIds     = new Set(existingPages.map((p) => p.id));
        const existingBoardIds    = new Set(existingBoards.map((b) => b.id));
        const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));

        const newPages     = (data.pages ?? []).filter((p) => !existingPageIds.has(p.id));
        const newBoards    = data.boards.filter((b) => !existingBoardIds.has(b.id))
                              .map((b) => ({ ...b, pageId: b.pageId ?? HOME_PAGE_ID }));
        const newTemplates = data.templates.filter((t) => !existingTemplateIds.has(t.id))
                              .map((t) => ({ ...t, boardId: t.boardId ?? HOME_BOARD_ID }));

        onSuccess(
          [...existingPages, ...newPages],
          [...existingBoards, ...newBoards],
          [...existingTemplates, ...newTemplates]
        );
      } else {
        onError("CSV import not supported with pages. Please use JSON.");
      }
    } catch {
      onError("Failed to parse file.");
    }
  };
  reader.readAsText(file);
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function nextOrderForBoard(templates: Template[], boardId: string): number {
  const bt = templates.filter((t) => t.boardId === boardId && !t.pinned);
  if (!bt.length) return 0;
  return Math.max(...bt.map((t) => t.order ?? 0)) + 1;
}

function sortedBoards(boards: Board[], pageId: string): Board[] {
  const pBoards = boards.filter((b) => b.pageId === pageId);
  return [
    ...pBoards.filter((b) => b.id === HOME_BOARD_ID),
    ...pBoards.filter((b) => b.id !== HOME_BOARD_ID).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

function sortedPages(pages: Page[]): Page[] {
  return [
    ...pages.filter((p) => p.id === HOME_PAGE_ID),
    ...pages.filter((p) => p.id !== HOME_PAGE_ID).sort((a, b) => a.name.localeCompare(b.name)),
  ];
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function ClipboardTemplatesPage() {
  // ── Core state ──
  const [pages,      setPages]      = useState<Page[]>([]);
  const [boards,     setBoards]     = useState<Board[]>([]);
  const [templates,  setTemplates]  = useState<Template[]>([]);
  const [activePageId,  setActivePageId]  = useState<string>(HOME_PAGE_ID);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [searchScopeType, setSearchScopeType]   = useState<"all" | "page" | "board">("all");
  const [searchScopeId,   setSearchScopeId]     = useState<string>("all");

  const [title, setTitle] = useState("");
  const [body,  setBody]  = useState("");
  const [search, setSearch] = useState("");

  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody,  setEditingBody]  = useState("");

  const [showCreator,     setShowCreator]     = useState(false);
  const [darkMode,        setDarkMode]        = useState(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // ── Page modals ──
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);
  const [newPageName,         setNewPageName]         = useState("");
  const [showDeletePageModal, setShowDeletePageModal] = useState(false);
  const [pageToDeleteId,      setPageToDeleteId]      = useState<string | null>(null);
  const [pageToDeleteName,    setPageToDeleteName]    = useState("");

  // ── Board modals ──
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [newBoardName,         setNewBoardName]         = useState("");
  const [showDeleteBoardModal, setShowDeleteBoardModal] = useState(false);
  const [boardToDeleteId,      setBoardToDeleteId]      = useState<string | null>(null);
  const [boardToDeleteName,    setBoardToDeleteName]    = useState("");

  // ── Assign board modal ──
  const [showAssignBoardModal,    setShowAssignBoardModal]    = useState(false);
  const [assignBoardId,           setAssignBoardId]           = useState("");
  const [assignSource,            setAssignSource]            = useState<"existing"|"new"|null>(null);
  const [assignTemplateId,        setAssignTemplateId]        = useState<string|null>(null);
  const [pendingNewTemplateTitle, setPendingNewTemplateTitle] = useState("");
  const [pendingNewTemplateBody,  setPendingNewTemplateBody]  = useState("");
  const [assignNewBoardName,      setAssignNewBoardName]      = useState("");
  const [assignNewPageId,         setAssignNewPageId]         = useState(HOME_PAGE_ID);

  // ── Export / Import ──
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat,    setExportFormat]    = useState<"json"|"csv"|"pdf">("json");
  const [exportScope,     setExportScope]     = useState<"all"|"current">("all");
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ type: "success"|"error"; text: string }|null>(null);

  // ─────────────────────────────────────────────
  // localStorage
  // ─────────────────────────────────────────────

  useEffect(() => {
    try {
      const sp = localStorage.getItem("clipboard-pages");
      if (sp) {
        const parsed = JSON.parse(sp) as Page[];
        if (parsed.length) { setPages(parsed); return; }
      }
    } catch {}
    setPages([{ id: HOME_PAGE_ID, name: "Home", isDefault: true }]);
  }, []);

  useEffect(() => {
    try {
      const sb = localStorage.getItem("clipboard-boards");
      if (sb) {
        const parsed = JSON.parse(sb) as Board[];
        if (parsed.length) {
          // Back-fill pageId for boards saved before pages feature
          setBoards(parsed.map((b) => ({ ...b, pageId: b.pageId ?? HOME_PAGE_ID })));
          const sa = localStorage.getItem("clipboard-active-board");
          if (sa && parsed.some((b) => b.id === sa)) setActiveBoardId(sa);
          else setActiveBoardId(parsed[0].id);
          return;
        }
      }
    } catch {}
    const homeBoard: Board = { id: HOME_BOARD_ID, name: "Home", isDefault: true, pageId: HOME_PAGE_ID };
    setBoards([homeBoard]);
    setActiveBoardId(HOME_BOARD_ID);
  }, []);

  useEffect(() => {
    try {
      const st = localStorage.getItem("clipboard-templates");
      if (st) {
        const parsed = JSON.parse(st) as Template[];
        setTemplates(parsed.map((t) => ({ ...t, boardId: t.boardId ?? HOME_BOARD_ID })));
      }
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem("clipboard-pages",     JSON.stringify(pages));     } catch {} }, [pages]);
  useEffect(() => { try { localStorage.setItem("clipboard-boards",    JSON.stringify(boards));    } catch {} }, [boards]);
  useEffect(() => { try { localStorage.setItem("clipboard-templates", JSON.stringify(templates)); } catch {} }, [templates]);
  useEffect(() => { if (activeBoardId) try { localStorage.setItem("clipboard-active-board", activeBoardId); } catch {} }, [activeBoardId]);

  useEffect(() => { if (!recentlyAddedId) return; const t = setTimeout(() => setRecentlyAddedId(null), 1000); return () => clearTimeout(t); }, [recentlyAddedId]);
  useEffect(() => { if (!importMessage)   return; const t = setTimeout(() => setImportMessage(null), 4000);   return () => clearTimeout(t); }, [importMessage]);

  // ─────────────────────────────────────────────
  // Page actions
  // ─────────────────────────────────────────────

  function handleCreatePage() {
    const name = newPageName.trim();
    if (!name) { alert("Page name is required."); return; }
    const id = name.toLowerCase().replace(/\s+/g, "-") + "-page-" + Date.now().toString(36);
    setPages((prev) => [...prev, { id, name }]);
    setActivePageId(id);
    setActiveBoardId(null); // new page has no boards yet
    setNewPageName("");
    setShowCreatePageModal(false);
  }

  function handleRequestDeletePage(pageId: string) {
    if (pageId === HOME_PAGE_ID) return;
    const page = pages.find((p) => p.id === pageId);
    setPageToDeleteId(pageId);
    setPageToDeleteName(page?.name ?? "this page");
    setShowDeletePageModal(true);
  }

  function handleConfirmDeletePage() {
    if (!pageToDeleteId || pageToDeleteId === HOME_PAGE_ID) { setShowDeletePageModal(false); return; }
    const deletedBoardIds = boards.filter((b) => b.pageId === pageToDeleteId).map((b) => b.id);
    setBoards((prev) => prev.filter((b) => b.pageId !== pageToDeleteId));
    setTemplates((prev) => prev.filter((t) => !deletedBoardIds.includes(t.boardId ?? "")));
    setPages((prev) => prev.filter((p) => p.id !== pageToDeleteId));
    setActivePageId(HOME_PAGE_ID);
    const homeBoard = boards.find((b) => b.id === HOME_BOARD_ID);
    setActiveBoardId(homeBoard?.id ?? null);
    setShowDeletePageModal(false);
    setPageToDeleteId(null);
    setPageToDeleteName("");
  }

  // ─────────────────────────────────────────────
  // Board actions
  // ─────────────────────────────────────────────

  function handleOpenCreateBoardModal() { setNewBoardName(""); setShowCreateBoardModal(true); }
  function handleCancelCreateBoard()    { setNewBoardName(""); setShowCreateBoardModal(false); }

  function handleCreateBoard() {
    const name = newBoardName.trim();
    if (!name) { alert("Board name is required."); return; }
    const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const newBoard: Board = { id, name, isDefault: false, pageId: activePageId };
    setBoards((prev) => [...prev, newBoard]);
    setActiveBoardId(newBoard.id);
    setNewBoardName("");
    setShowCreateBoardModal(false);
  }

  function handleRequestDeleteBoard() {
    if (!activeBoardId || activeBoardId === HOME_BOARD_ID) return;
    const board = boards.find((b) => b.id === activeBoardId);
    setBoardToDeleteId(activeBoardId);
    setBoardToDeleteName(board?.name ?? "this board");
    setShowDeleteBoardModal(true);
  }

  function handleConfirmDeleteBoard() {
    if (!boardToDeleteId || boardToDeleteId === HOME_BOARD_ID) { setShowDeleteBoardModal(false); return; }
    setBoards((prev) => {
      const updated = prev.filter((b) => b.id !== boardToDeleteId);
      const pageBoards = updated.filter((b) => b.pageId === activePageId);
      setActiveBoardId(pageBoards[0]?.id ?? null);
      return updated;
    });
    setTemplates((prev) => prev.filter((t) => t.boardId !== boardToDeleteId));
    setShowDeleteBoardModal(false);
    setBoardToDeleteId(null);
    setBoardToDeleteName("");
  }

  // ─────────────────────────────────────────────
  // Template actions
  // ─────────────────────────────────────────────

  function handleAddTemplateToActiveBoard(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedBody  = body.trim();
    if (!trimmedTitle || !trimmedBody) { alert("Title and body are required."); return; }
    const targetBoardId = activeBoardId || HOME_BOARD_ID;
    const newTemplate: Template = {
      id:        Date.now().toString() + Math.random().toString(16),
      title:     trimmedTitle, body: trimmedBody,
      pinned: false, pinnedAt: null,
      boardId:   targetBoardId,
      createdAt: Date.now(),
      order:     nextOrderForBoard(templates, targetBoardId),
    };
    setTemplates((prev) => [newTemplate, ...prev]);
    setTitle(""); setBody("");
    setRecentlyAddedId(newTemplate.id);
    setShowCreator(false);
  }

  function handleCreatorAddToBoardClick() {
    const trimmedTitle = title.trim();
    const trimmedBody  = body.trim();
    if (!trimmedTitle || !trimmedBody) { alert("Title and body are required."); return; }
    setPendingNewTemplateTitle(trimmedTitle);
    setPendingNewTemplateBody(trimmedBody);
    setAssignSource("new");
    setAssignTemplateId(null);
    setAssignBoardId(activeBoardId || boards[0]?.id || HOME_BOARD_ID);
    setAssignNewPageId(activePageId);
    setShowAssignBoardModal(true);
  }

  function handleDeleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) { setEditingId(null); setEditingTitle(""); setEditingBody(""); }
  }

  async function handleCopy(text: string) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      }
    } catch (err) { console.error(err); }
  }

  function handleStartEdit(template: Template) { setEditingId(template.id); setEditingTitle(template.title); setEditingBody(template.body); }
  function handleCancelEdit() { setEditingId(null); setEditingTitle(""); setEditingBody(""); }

  function handleSaveEdit(id: string) {
    const t = editingTitle.trim(); const b = editingBody.trim();
    if (!t || !b) { alert("Title and body are required."); return; }
    setTemplates((prev) => prev.map((tmpl) => tmpl.id === id ? { ...tmpl, title: t, body: b } : tmpl));
    setEditingId(null); setEditingTitle(""); setEditingBody("");
  }

  function handlePinTemplate(id: string) {
    const now = Date.now();
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, pinned: true, pinnedAt: t.pinnedAt ?? now } : t));
  }
  function handleUnpinTemplate(id: string) {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, pinned: false, pinnedAt: null } : t));
  }

  function handleReorder(id: string, direction: "left" | "right") {
    setTemplates((prev) => {
      const unpinned = [...prev.filter((t) => !t.pinned)].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const idx = unpinned.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "left" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= unpinned.length) return prev;
      const aOrder = unpinned[idx].order ?? idx;
      const bOrder = unpinned[swapIdx].order ?? swapIdx;
      return prev.map((t) => {
        if (t.id === unpinned[idx].id)     return { ...t, order: bOrder };
        if (t.id === unpinned[swapIdx].id) return { ...t, order: aOrder };
        return t;
      });
    });
  }

  // ─────────────────────────────────────────────
  // Assign to board
  // ─────────────────────────────────────────────

  function handleRequestAssignBoard(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    const currentBoard = boards.find((b) => b.id === template?.boardId);
    setAssignSource("existing");
    setAssignTemplateId(templateId);
    setAssignBoardId(template?.boardId || activeBoardId || HOME_BOARD_ID);
    setAssignNewPageId(currentBoard?.pageId || activePageId);
    setShowAssignBoardModal(true);
  }

  function performAssignToBoard(boardId: string) {
    if (!boardId) { alert("Please choose a board."); return; }
    if (assignSource === "existing" && assignTemplateId) {
      setTemplates((prev) => prev.map((t) => t.id === assignTemplateId ? { ...t, boardId } : t));
    } else if (assignSource === "new") {
      const t = pendingNewTemplateTitle.trim(); const b = pendingNewTemplateBody.trim();
      if (!t || !b) { alert("Title and body are required."); return; }
      const newTemplate: Template = {
        id: Date.now().toString() + Math.random().toString(16),
        title: t, body: b, pinned: false, pinnedAt: null,
        boardId, createdAt: Date.now(),
        order: nextOrderForBoard(templates, boardId),
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      setTitle(""); setBody("");
      setRecentlyAddedId(newTemplate.id);
    }
    closeAssignModal();
    setShowCreator(false);
  }

  function handleCreateBoardFromAssign() {
    const name = assignNewBoardName.trim();
    if (!name) { alert("Board name is required."); return; }
    const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now().toString(36);
    const newBoard: Board = { id, name, isDefault: false, pageId: assignNewPageId };
    setBoards((prev) => [...prev, newBoard]);
    performAssignToBoard(id);
  }

  function closeAssignModal() {
    setShowAssignBoardModal(false);
    setAssignBoardId(""); setAssignTemplateId(null); setAssignSource(null);
    setPendingNewTemplateTitle(""); setPendingNewTemplateBody("");
    setAssignNewBoardName(""); setAssignNewPageId(HOME_PAGE_ID);
  }

  // ─────────────────────────────────────────────
  // Export / Import
  // ─────────────────────────────────────────────

  // ─────────────────────────────────────────────
  // Export PDF (client-side via jsPDF CDN)
  // ─────────────────────────────────────────────

  async function exportPDF(
    pages: Page[], boards: Board[], templates: Template[],
    scope: "all" | "current", activeBoardId: string | null
  ) {
    // Dynamically load jsPDF from CDN if not already loaded
    if (!(window as any).jspdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load jsPDF"));
        document.head.appendChild(script);
      });
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

    const PAGE_W    = doc.internal.pageSize.getWidth();
    const PAGE_H    = doc.internal.pageSize.getHeight();
    const MARGIN    = 48;
    const COL_W     = PAGE_W - MARGIN * 2;
    let y           = MARGIN;

    const ACCENT    = [37, 99, 235]  as [number,number,number];  // blue-600
    const GRAY_DARK = [17, 24, 39]   as [number,number,number];  // gray-900
    const GRAY_MID  = [107,114,128]  as [number,number,number];  // gray-500
    const GRAY_LIGHT= [243,244,246]  as [number,number,number];  // gray-100
    const WHITE     = [255,255,255]  as [number,number,number];
    const AMBER     = [245,158,11]   as [number,number,number];

    function checkPageBreak(needed: number) {
      if (y + needed > PAGE_H - MARGIN) {
        doc.addPage();
        y = MARGIN;
      }
    }

    function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
      doc.setFontSize(fontSize);
      return doc.splitTextToSize(text, maxWidth) as string[];
    }

    // ── Cover header ──
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, PAGE_W, 72, "F");
    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TEMPLIFY", MARGIN, 34);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Template Export", MARGIN, 50);
    const exportDate = new Date().toLocaleString("en-US", { month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit", hour12:true });
    doc.text(exportDate, PAGE_W - MARGIN, 50, { align: "right" });
    doc.setFontSize(9);
    doc.text(scope === "all" ? "Scope: All pages" : `Scope: Board — ${boards.find(b=>b.id===activeBoardId)?.name??"Current"}`, MARGIN, 63);
    y = 96;

    // ── Determine which templates/boards/pages to include ──
    const inclTemplates = scope === "all" ? templates : templates.filter(t => t.boardId === activeBoardId);
    const inclBoardIds  = new Set(inclTemplates.map(t => t.boardId ?? ""));
    const inclBoards    = boards.filter(b => inclBoardIds.has(b.id));
    const inclPageIds   = new Set(inclBoards.map(b => b.pageId));
    const inclPages     = scope === "all"
      ? pages
      : pages.filter(p => inclPageIds.has(p.id));

    // Sort: Home page first
    const sortedInclPages = [
      ...inclPages.filter(p => p.id === "home-page"),
      ...inclPages.filter(p => p.id !== "home-page").sort((a,b) => a.name.localeCompare(b.name)),
    ];

    for (const page of sortedInclPages) {
      const pageBoards = inclBoards
        .filter(b => b.pageId === page.id)
        .sort((a,b) => a.name.localeCompare(b.name));
      if (!pageBoards.length) continue;

      // ── Page section header ──
      checkPageBreak(32);
      doc.setFillColor(...ACCENT);
      doc.roundedRect(MARGIN, y, COL_W, 22, 4, 4, "F");
      doc.setTextColor(...WHITE);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`📄  ${page.name}`, MARGIN + 10, y + 14.5);
      y += 30;

      for (const board of pageBoards) {
        const boardTemplates = inclTemplates
          .filter(t => t.boardId === board.id)
          .sort((a,b) => (a.order ?? 0) - (b.order ?? 0));
        if (!boardTemplates.length) continue;

        // ── Board sub-header ──
        checkPageBreak(22);
        doc.setFillColor(...GRAY_LIGHT);
        doc.rect(MARGIN, y, COL_W, 18, "F");
        doc.setTextColor(...GRAY_DARK);
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "bold");
        doc.text(`Board: ${board.name}`, MARGIN + 8, y + 12);
        y += 24;

        // ── Template cards ──
        for (const tmpl of boardTemplates) {
          const titleLines = wrapText(tmpl.title, COL_W - 20, 10);
          const bodyLines  = wrapText(tmpl.body  || "", COL_W - 20, 8.5);
          const isPinned   = !!tmpl.pinned;

          // Estimate card height
          const titleH  = titleLines.length * 13;
          const bodyH   = bodyLines.length  * 11;
          const footerH = 14;
          const cardH   = 10 + titleH + 6 + bodyH + 6 + footerH + 10;

          checkPageBreak(cardH + 8);

          // Card background + border
          doc.setFillColor(...WHITE);
          doc.setDrawColor(isPinned ? 249 : 147, isPinned ? 115 : 197, isPinned ? 22 : 253);
          doc.setLineWidth(1.5);
          doc.roundedRect(MARGIN, y, COL_W, cardH, 4, 4, "FD");

          // Pinned accent bar on left
          if (isPinned) {
            doc.setFillColor(...AMBER);
            doc.roundedRect(MARGIN, y, 4, cardH, 2, 2, "F");
          }

          let cy = y + 10;

          // Title
          doc.setTextColor(...GRAY_DARK);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          titleLines.forEach((line: string) => {
            doc.text(line, MARGIN + 12, cy);
            cy += 13;
          });

          // Divider
          cy += 3;
          doc.setDrawColor(229, 231, 235);
          doc.setLineWidth(0.5);
          doc.line(MARGIN + 8, cy, MARGIN + COL_W - 8, cy);
          cy += 6;

          // Body
          doc.setTextColor(...GRAY_MID);
          doc.setFontSize(8.5);
          doc.setFont("helvetica", "normal");
          bodyLines.forEach((line: string) => {
            doc.text(line, MARGIN + 12, cy);
            cy += 11;
          });

          // Footer: created date (right) + pinned badge (left)
          cy += 4;
          if (isPinned) {
            doc.setTextColor(...AMBER);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.text("📌 Pinned", MARGIN + 12, cy);
          }
          if (tmpl.createdAt) {
            const dateStr = new Date(tmpl.createdAt).toLocaleString("en-US", { month:"short", day:"numeric", year:"numeric", hour:"numeric", minute:"2-digit", hour12:true });
            doc.setTextColor(...GRAY_MID);
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.text(`Posted ${dateStr}`, MARGIN + COL_W - 10, cy, { align: "right" });
          }

          y += cardH + 8;
        }

        y += 4; // gap between boards
      }

      y += 8; // gap between pages
    }

    // ── Footer on every page ──
    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(...GRAY_LIGHT);
      doc.rect(0, PAGE_H - 28, PAGE_W, 28, "F");
      doc.setTextColor(...GRAY_MID);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text("Templify — templify-eta.vercel.app", MARGIN, PAGE_H - 12);
      doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 12, { align: "right" });
    }

    doc.save(`templify-export-${Date.now()}.pdf`);
  }

  function handleExport() {
    if (exportFormat === "json") exportJSON(pages, boards, templates, exportScope, activeBoardId);
    else if (exportFormat === "csv") exportCSV(boards, templates, exportScope, activeBoardId);
    else exportPDF(pages, boards, templates, exportScope, activeBoardId);
    setShowExportModal(false);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    mergeImport(file, pages, boards, templates,
      (mp, mb, mt) => {
        setPages(mp); setBoards(mb); setTemplates(mt);
        const added = mt.length - templates.length;
        const addedB = mb.length - boards.length;
        setImportMessage({ type: "success", text: `✓ Imported ${added} template${added!==1?"s":""} and ${addedB} board${addedB!==1?"s":""}.` });
      },
      (msg) => setImportMessage({ type: "error", text: msg })
    );
    e.target.value = "";
  }

  // ─────────────────────────────────────────────
  // Derived / filtering
  // ─────────────────────────────────────────────

  const activePage  = pages.find((p) => p.id === activePageId) ?? pages[0];
  const activePageBoards = sortedBoards(boards, activePageId);

  // When switching pages, if activeBoardId doesn't belong to new page, reset it
  useEffect(() => {
    const belongsToPage = boards.some((b) => b.id === activeBoardId && b.pageId === activePageId);
    if (!belongsToPage) {
      setActiveBoardId(activePageBoards[0]?.id ?? null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePageId]);

  const normalizedSearch = search.toLowerCase().trim();

  let filteredTemplates: Template[];
  let gridBoardName: string;
  let gridCanDeleteBoard: boolean;

  if (normalizedSearch) {
    if (searchScopeType === "all") {
      filteredTemplates = templates.filter((t) => t.title.toLowerCase().includes(normalizedSearch));
      gridBoardName = `Search: "${search}" (all pages)`;
    } else if (searchScopeType === "page") {
      const pageBoardIds = new Set(boards.filter((b) => b.pageId === searchScopeId).map((b) => b.id));
      filteredTemplates = templates.filter((t) => pageBoardIds.has(t.boardId ?? "") && t.title.toLowerCase().includes(normalizedSearch));
      const pName = pages.find((p) => p.id === searchScopeId)?.name ?? "Page";
      gridBoardName = `Search: "${search}" (${pName})`;
    } else {
      filteredTemplates = templates.filter((t) => t.boardId === searchScopeId && t.title.toLowerCase().includes(normalizedSearch));
      const bName = boards.find((b) => b.id === searchScopeId)?.name ?? "Board";
      gridBoardName = `Search: "${search}" (${bName})`;
    }
    gridCanDeleteBoard = false;
  } else {
    filteredTemplates = templates.filter((t) => t.boardId === activeBoardId);
    gridBoardName     = boards.find((b) => b.id === activeBoardId)?.name ?? "Home";
    gridCanDeleteBoard = !!activeBoardId && activeBoardId !== HOME_BOARD_ID;
  }

  const creatorBoardName = boards.find((b) => b.id === activeBoardId)?.name ?? "Home";

  // ─────────────────────────────────────────────
  // Styles
  // ─────────────────────────────────────────────

  const mainBg   = darkMode ? "#020617" : "#e5e7eb";
  const mainText = darkMode ? "#e5e7eb" : "#111827";
  const accent   = "#3b82f6";

  const modalBoxStyle: React.CSSProperties = {
    backgroundColor: darkMode ? "#1f2937" : "white",
    padding: "2rem", borderRadius: "0.5rem",
    maxWidth: "30rem", width: "90%",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
  };

  const radioLabelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.5rem",
    fontSize: "0.9rem", color: mainText, cursor: "pointer",
  };

  const tabBase: React.CSSProperties = {
    padding: "0.35rem 0.9rem", borderRadius: "999px",
    fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
    border: "1px solid transparent", whiteSpace: "nowrap",
    transition: "all 0.15s ease",
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <main style={{ minHeight: "100vh", padding: "1rem 2rem", width: "100vw", boxSizing: "border-box", fontFamily: "system-ui, sans-serif", display: "flex", flexDirection: "column", gap: "1rem", backgroundColor: mainBg, color: mainText }}>

      {/* ── TOP HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>

        {/* Left: title + page tabs + board selector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: 0, color: mainText }}>
            TEMPLIFY — A clipboard on Steroids!
          </h1>

          {/* ── PAGE TABS ── */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
            {sortedPages(pages).map((page) => {
              const isActive = page.id === activePageId;
              return (
                <button key={page.id} type="button"
                  onClick={() => setActivePageId(page.id)}
                  style={{
                    ...tabBase,
                    backgroundColor: isActive
                      ? (darkMode ? "#1e3a5f" : "#dbeafe")
                      : (darkMode ? "#0f172a" : "white"),
                    color: isActive ? (darkMode ? "#93c5fd" : "#1d4ed8") : mainText,
                    border: `1px solid ${isActive ? accent : (darkMode ? "#334155" : "#d1d5db")}`,
                    fontWeight: isActive ? 700 : 500,
                  }}>
                  {page.name}
                </button>
              );
            })}

            {/* + Create Page */}
            <button type="button" onClick={() => { setNewPageName(""); setShowCreatePageModal(true); }}
              style={{ ...tabBase, border: `1px solid ${darkMode ? "#334155" : "#d1d5db"}`, backgroundColor: darkMode ? "#0f172a" : "white", color: darkMode ? "#94a3b8" : "#6b7280" }}>
              + Page
            </button>
          </div>

          {/* ── ACTIVE PAGE: delete button + board dropdown ── */}
          {activePage && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>

              {/* Page name + delete (non-home pages only) */}
              {activePage.id !== HOME_PAGE_ID && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", color: darkMode ? "#64748b" : "#94a3b8", fontStyle: "italic" }}>
                    Page: {activePage.name}
                  </span>
                  <button type="button" onClick={() => handleRequestDeletePage(activePage.id)}
                    style={{ padding: "0.15rem 0.55rem", borderRadius: "999px", border: "1px solid #b91c1c", backgroundColor: darkMode ? "#111827" : "#fef2f2", color: "#b91c1c", fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
                    Delete page
                  </button>
                </div>
              )}

              {/* Board selector row */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.9rem", color: darkMode ? "#9ca3af" : "#4b5563" }}>Board:</span>

                {activePageBoards.length > 0 ? (
                  <select value={activeBoardId ?? ""} onChange={(e) => setActiveBoardId(e.target.value)}
                    style={{ padding: "0.3rem 0.6rem", borderRadius: "999px", border: "1px solid #9ca3af", backgroundColor: darkMode ? "#020617" : "white", color: mainText, fontSize: "0.9rem" }}>
                    {activePageBoards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: "0.85rem", color: darkMode ? "#475569" : "#9ca3af", fontStyle: "italic" }}>
                    No boards yet — create one below
                  </span>
                )}

                {activeBoardId && activeBoardId !== HOME_BOARD_ID && (
                  <button type="button" onClick={handleRequestDeleteBoard}
                    style={{ padding: "0.25rem 0.6rem", borderRadius: "999px", border: "1px solid #b91c1c", backgroundColor: darkMode ? "#111827" : "#fef2f2", color: "#b91c1c", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}>
                    Delete board
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: import message + export/import/dark mode */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {importMessage && (
            <span style={{
              fontSize: "0.8rem", fontWeight: 500,
              color: importMessage.type === "success" ? (darkMode ? "#4ade80" : "#15803d") : (darkMode ? "#fca5a5" : "#dc2626"),
              backgroundColor: importMessage.type === "success" ? (darkMode ? "#052e16" : "#f0fdf4") : (darkMode ? "#1c0a0a" : "#fff5f5"),
              border: `1px solid ${importMessage.type === "success" ? (darkMode ? "#166534" : "#bbf7d0") : "#fca5a5"}`,
              borderRadius: "999px", padding: "0.25rem 0.75rem",
            }}>{importMessage.text}</span>
          )}
          <button type="button" onClick={() => setShowExportModal(true)}
            style={{ padding: "0.4rem 0.8rem", borderRadius: "999px", border: "1px solid #7c3aed", backgroundColor: darkMode ? "#020617" : "#f5f3ff", color: darkMode ? "#c4b5fd" : "#6d28d9", fontSize: "0.9rem", cursor: "pointer", fontWeight: 500 }}>
            ↑ Export
          </button>
          <button type="button" onClick={() => importInputRef.current?.click()}
            style={{ padding: "0.4rem 0.8rem", borderRadius: "999px", border: "1px solid #0891b2", backgroundColor: darkMode ? "#020617" : "#ecfeff", color: darkMode ? "#67e8f9" : "#0e7490", fontSize: "0.9rem", cursor: "pointer", fontWeight: 500 }}>
            ↓ Import
          </button>
          <input ref={importInputRef} type="file" accept=".json,.csv" onChange={handleImportFile} style={{ display: "none" }} />
          <button type="button" onClick={() => setDarkMode((p) => !p)}
            style={{ padding: "0.4rem 0.8rem", borderRadius: "999px", border: "1px solid #4b5563", backgroundColor: darkMode ? "#111827" : "#f9fafb", color: darkMode ? "#e5e7eb" : "#111827", fontSize: "0.9rem", cursor: "pointer", fontWeight: 500 }}>
            {darkMode ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ── */}
      <SearchBar
        search={search} onSearchChange={setSearch}
        darkMode={darkMode}
        pages={pages} boards={boards}
        searchScopeType={searchScopeType} searchScopeId={searchScopeId}
        onSearchScopeChange={(type, id) => { setSearchScopeType(type); setSearchScopeId(id); }}
        showCreator={showCreator}
        onToggleCreator={() => setShowCreator((p) => !p)}
        onCreateBoard={handleOpenCreateBoardModal}
      />

      {/* ── TEMPLATE CREATOR ── */}
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

      {/* ── TEMPLATES GRID ── */}
      <section style={{ flex: 1, overflowY: "auto", paddingRight: "0.25rem", width: "100%" }}>
        <TemplatesGrid
          templates={filteredTemplates} onCopy={handleCopy} onDelete={handleDeleteTemplate}
          editingId={editingId} editingTitle={editingTitle} editingBody={editingBody}
          onStartEdit={handleStartEdit} onChangeEditingTitle={setEditingTitle}
          onChangeEditingBody={setEditingBody} onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit} recentlyAddedId={recentlyAddedId}
          darkMode={darkMode} onPin={handlePinTemplate} onUnpin={handleUnpinTemplate}
          onRequestAssignBoard={handleRequestAssignBoard}
          onReorder={handleReorder}
          activeBoardName={gridBoardName} canDeleteBoard={gridCanDeleteBoard}
          onRequestDeleteBoard={handleRequestDeleteBoard}
        />
      </section>

      {/* ════════════════════════════════════════
          MODALS
      ════════════════════════════════════════ */}

      {/* Create Page */}
      {showCreatePageModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
          onClick={() => setShowCreatePageModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "1rem", color: mainText, marginTop: 0 }}>Create New Page</h2>
            <p style={{ fontSize: "0.85rem", color: darkMode ? "#9ca3af" : "#6b7280", marginTop: 0, marginBottom: "0.75rem" }}>
              A page is a workspace that holds its own set of boards.
            </p>
            <input type="text" placeholder="Page name (e.g. Sales, Support)" value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreatePage(); }}
              autoFocus
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "white", color: mainText, marginBottom: "1rem", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowCreatePageModal(false)}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button type="button" onClick={handleCreatePage}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: accent, color: "white", cursor: "pointer", fontWeight: 500 }}>Create Page</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page */}
      {showDeletePageModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}
          onClick={() => setShowDeletePageModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "1rem", color: mainText, marginTop: 0 }}>Delete Page?</h2>
            <p style={{ marginBottom: "1.5rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>
              Are you sure you want to delete the page <strong>"{pageToDeleteName}"</strong>?
              This will permanently delete all boards and templates inside it. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowDeletePageModal(false)}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button type="button" onClick={handleConfirmDeletePage}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: "#dc2626", color: "white", cursor: "pointer", fontWeight: 500 }}>Delete Page</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Board */}
      {showCreateBoardModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
          onClick={handleCancelCreateBoard}>
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "0.5rem", color: mainText, marginTop: 0 }}>Create New Board</h2>
            <p style={{ fontSize: "0.85rem", color: darkMode ? "#9ca3af" : "#6b7280", marginTop: 0, marginBottom: "0.75rem" }}>
              Adding to page: <strong>{activePage?.name ?? "Home"}</strong>
            </p>
            <input type="text" placeholder="Board name" value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateBoard(); }}
              autoFocus
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "white", color: mainText, marginBottom: "1rem", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={handleCancelCreateBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button type="button" onClick={handleCreateBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: accent, color: "white", cursor: "pointer", fontWeight: 500 }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Board */}
      {showDeleteBoardModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70 }}
          onClick={() => { setShowDeleteBoardModal(false); setBoardToDeleteId(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "1rem", color: mainText, marginTop: 0 }}>Delete Board?</h2>
            <p style={{ marginBottom: "1.5rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>
              Are you sure you want to delete <strong>"{boardToDeleteName}"</strong>? All templates in this board will be deleted. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => { setShowDeleteBoardModal(false); setBoardToDeleteId(null); }}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button type="button" onClick={handleConfirmDeleteBoard}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: "#dc2626", color: "white", cursor: "pointer", fontWeight: 500 }}>Delete Board</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign to Board */}
      {showAssignBoardModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
          onClick={closeAssignModal}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBoxStyle, maxWidth: "34rem" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "1rem", color: mainText, marginTop: 0 }}>Assign to Board</h2>

            {/* Page selector */}
            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: 600, color: darkMode ? "#9ca3af" : "#6b7280" }}>Page</label>
            <select value={assignNewPageId} onChange={(e) => { setAssignNewPageId(e.target.value); const pb = sortedBoards(boards, e.target.value); setAssignBoardId(pb[0]?.id ?? ""); }}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "white", color: mainText, marginBottom: "0.75rem" }}>
              {sortedPages(pages).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {/* Board selector (filtered by selected page) */}
            <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem", fontWeight: 600, color: darkMode ? "#9ca3af" : "#6b7280" }}>Board</label>
            {sortedBoards(boards, assignNewPageId).length > 0 ? (
              <select value={assignBoardId} onChange={(e) => setAssignBoardId(e.target.value)}
                style={{ width: "100%", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "white", color: mainText, marginBottom: "1rem" }}>
                {sortedBoards(boards, assignNewPageId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            ) : (
              <p style={{ fontSize: "0.85rem", color: darkMode ? "#64748b" : "#9ca3af", fontStyle: "italic", marginBottom: "1rem" }}>No boards in this page yet — create one below.</p>
            )}

            {/* Create new board inside selected page */}
            <div style={{ marginBottom: "1rem", padding: "0.75rem", backgroundColor: darkMode ? "#374151" : "#f9fafb", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", color: darkMode ? "#d1d5db" : "#4b5563" }}>
                Or create a new board in <strong>{pages.find((p) => p.id === assignNewPageId)?.name ?? "this page"}</strong>:
              </label>
              <input type="text" placeholder="New board name" value={assignNewBoardName}
                onChange={(e) => setAssignNewBoardName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateBoardFromAssign(); }}
                style={{ width: "100%", padding: "0.4rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#1f2937" : "white", color: mainText, marginBottom: "0.5rem", boxSizing: "border-box" }} />
              <button type="button" onClick={handleCreateBoardFromAssign}
                style={{ padding: "0.4rem 0.8rem", borderRadius: "0.375rem", border: "none", backgroundColor: "#10b981", color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}>
                Create & Use
              </button>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={closeAssignModal}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button type="button" onClick={() => performAssignToBoard(assignBoardId)} disabled={!assignBoardId}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: assignBoardId ? accent : "#9ca3af", color: "white", cursor: assignBoardId ? "pointer" : "default", fontWeight: 500 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      {showExportModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60 }}
          onClick={() => setShowExportModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={modalBoxStyle}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "1.25rem", color: mainText, marginTop: 0 }}>Export Templates</h2>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: darkMode ? "#9ca3af" : "#6b7280", marginBottom: "0.5rem", marginTop: 0 }}>FORMAT</p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem" }}>
              <label style={radioLabelStyle}><input type="radio" name="format" value="json" checked={exportFormat === "json"} onChange={() => setExportFormat("json")} />JSON <span style={{ fontSize: "0.75rem", color: darkMode ? "#6b7280" : "#9ca3af" }}>(full data, reimportable)</span></label>
              <label style={radioLabelStyle}><input type="radio" name="format" value="csv" checked={exportFormat === "csv"} onChange={() => setExportFormat("csv")} />CSV <span style={{ fontSize: "0.75rem", color: darkMode ? "#6b7280" : "#9ca3af" }}>(spreadsheet-friendly)</span></label>
              <label style={radioLabelStyle}><input type="radio" name="format" value="pdf" checked={exportFormat === "pdf"} onChange={() => setExportFormat("pdf")} />PDF <span style={{ fontSize: "0.75rem", color: darkMode ? "#6b7280" : "#9ca3af" }}>(printable report)</span></label>
            </div>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: darkMode ? "#9ca3af" : "#6b7280", marginBottom: "0.5rem", marginTop: 0 }}>SCOPE</p>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
              <label style={radioLabelStyle}><input type="radio" name="scope" value="all" checked={exportScope === "all"} onChange={() => setExportScope("all")} />All pages</label>
              <label style={radioLabelStyle}><input type="radio" name="scope" value="current" checked={exportScope === "current"} onChange={() => setExportScope("current")} />Current board <span style={{ fontSize: "0.75rem", color: darkMode ? "#6b7280" : "#9ca3af" }}>({creatorBoardName})</span></label>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowExportModal(false)}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "1px solid #d1d5db", backgroundColor: darkMode ? "#374151" : "#f9fafb", color: mainText, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button type="button" onClick={handleExport}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: exportFormat === "pdf" ? "#dc2626" : "#7c3aed", color: "white", cursor: "pointer", fontWeight: 500 }}>↑ Export {exportFormat.toUpperCase()}</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}