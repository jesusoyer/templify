"use client";

import React, { useState, useEffect, useRef, type CSSProperties } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Template = {
  id: string;
  title: string;
  body: string;               // HTML string (rich text)
  pinned?: boolean;
  pinnedAt?: number | null;
  boardId?: string;
  createdAt?: number | null;
  order?: number;
  colorScheme?: string;       // ← NEW: hex color for card accent borders
};

type TemplatesGridProps = {
  templates: Template[];
  onCopy: (body: string) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editingTitle: string;
  editingBody: string;
  onStartEdit: (template: Template) => void;
  onChangeEditingTitle: (value: string) => void;
  onChangeEditingBody: (value: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  recentlyAddedId?: string | null;
  darkMode: boolean;
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onRequestAssignBoard: (templateId: string) => void;
  onReorder: (id: string, direction: "left" | "right") => void;
  onUpdateColor: (id: string, color: string) => void;

  // Workflows living in this board
  workflows: WorkflowCard[];
  onStartWorkflow: (id: string) => void;
  onOpenWorkflowBuilder: (id: string) => void;
  onPinWorkflow: (id: string) => void;
  onUnpinWorkflow: (id: string) => void;
  onDeleteWorkflow: (id: string) => void;

  // Board UI
  activeBoardName: string;
  canDeleteBoard: boolean;
  onRequestDeleteBoard: () => void;
};


// Workflow card type (subset of what WorkflowPanel exports — just what the grid needs)
type WorkflowCard = {
  id: string;
  title: string;
  pinned?: boolean;
  pinnedAt?: number | null;
  createdAt: number;
  order?: number;
  boardId?: string;
  steps: Record<string, { branches: unknown[] }>;
  resumeEnabled: boolean;
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

// Fixed body height — every card shows exactly this much content.
// Click ▼ to expand, ▲ to collapse back.
const BODY_HEIGHT = "8rem";

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Red",     value: "#dc2626" },
  { label: "Orange",  value: "#ea580c" },
  { label: "Yellow",  value: "#ca8a04" },
  { label: "Green",   value: "#16a34a" },
  { label: "Blue",    value: "#2563eb" },
  { label: "Purple",  value: "#7c3aed" },
];

// Color scheme palette for the card accent border
const CARD_COLORS = [
  { label: "Blue (default)", value: "#3b82f6" },
  { label: "Purple",         value: "#7c3aed" },
  { label: "Green",          value: "#16a34a" },
  { label: "Red",            value: "#dc2626" },
  { label: "Orange",         value: "#ea580c" },
  { label: "Yellow",         value: "#ca8a04" },
  { label: "Pink",           value: "#db2777" },
  { label: "Teal",           value: "#0d9488" },
  { label: "Gray",           value: "#6b7280" },
];

function formatCreatedAt(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function TemplatesGrid({
  templates,
  onCopy,
  onDelete,
  editingId,
  editingTitle,
  editingBody,
  onStartEdit,
  onChangeEditingTitle,
  onChangeEditingBody,
  onSaveEdit,
  onCancelEdit,
  recentlyAddedId,
  darkMode,
  onPin,
  onUnpin,
  onRequestAssignBoard,
  onReorder,
  onUpdateColor,
  workflows,
  onStartWorkflow,
  onOpenWorkflowBuilder,
  onPinWorkflow,
  onUnpinWorkflow,
  onDeleteWorkflow,
  activeBoardName,
  canDeleteBoard,
  onRequestDeleteBoard,
}: TemplatesGridProps) {
  // collapsed = title-only (Minimize). expanded = full height (▼ arrow).
  // Default: fixed height (neither minimized nor expanded).
  const [collapsedById, setCollapsedById]   = useState<Record<string, boolean>>({});
  const [expandedById,  setExpandedById]    = useState<Record<string, boolean>>({});

  const [confirmDeleteId,    setConfirmDeleteId]    = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string>("");
  const [copiedId,           setCopiedId]           = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [windowWidth, setWindowWidth]           = useState<number | null>(null);
  const [viewingTemplateId, setViewingTemplateId] = useState<string | null>(null);

  // Rich-text inline editor
  const editEditorRef       = useRef<HTMLDivElement>(null);
  const editSavedRangeRef   = useRef<Range | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableHover,      setTableHover]      = useState<{rows:number;cols:number}>({rows:0,cols:0});

  useEffect(() => {
    const resize = () => setWindowWidth(window.innerWidth);
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); }, []);

  useEffect(() => {
    if (editEditorRef.current && editEditorRef.current.innerHTML !== editingBody) {
      editEditorRef.current.innerHTML = editingBody;
    }
  }, [editingId, editingBody]);

  function handleEditEditorInput() {
    if (editEditorRef.current) onChangeEditingBody(editEditorRef.current.innerHTML);
  }

  function saveEditSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editEditorRef.current?.contains(sel.anchorNode)) {
      editSavedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreEditSelection() {
    const sel = window.getSelection();
    if (sel && editSavedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(editSavedRangeRef.current);
    }
  }

  function applyEditFormat(command: string, value?: string) {
    editEditorRef.current?.focus();
    restoreEditSelection();
    document.execCommand(command, false, value);
    handleEditEditorInput();
  }

  function clearAllEditFormatting() {
    if (!editEditorRef.current) return;
    const plainText = editEditorRef.current.innerText;
    editEditorRef.current.innerHTML = "";
    editEditorRef.current.innerText = plainText;
    editEditorRef.current.focus();
    handleEditEditorInput();
  }

  function insertTable(rows: number, cols: number) {
    editEditorRef.current?.focus();
    restoreEditSelection();
    const colW = Math.round(100 / cols);
    let html = `<table style="border-collapse:collapse;width:100%;margin:0.5rem 0"><tbody>`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="border:1px solid #94a3b8;padding:0.35rem 0.5rem;min-width:60px;width:${colW}%">&nbsp;</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    document.execCommand("insertHTML", false, html);
    setShowTablePicker(false);
    handleEditEditorInput();
  }

  async function copyRichHtml(html: string): Promise<void> {
    try {
      if (navigator.clipboard && "write" in navigator.clipboard && typeof ClipboardItem !== "undefined") {
        const plain = html.replace(/<[^>]+>/g, "");
        await navigator.clipboard.write([new ClipboardItem({
          "text/html":  new Blob([html],  { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" }),
        })]);
        return;
      }
    } catch {}
    try { await navigator.clipboard.writeText(html.replace(/<[^>]+>/g, "")); } catch {}
  }

  function handleCopy(templateId: string, body: string) {
    onCopy(body);
    copyRichHtml(body);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedId(templateId);
    copiedTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  }

  // ── Display state helpers ──
  function toggleCollapse(id: string) {
    setCollapsedById((prev) => ({ ...prev, [id]: !prev[id] }));
    setExpandedById((prev) => ({ ...prev, [id]: false })); // can't be minimized + expanded
  }
  function toggleExpand(id: string) {
    setExpandedById((prev) => ({ ...prev, [id]: !prev[id] }));
    setCollapsedById((prev) => ({ ...prev, [id]: false })); // expand un-minimizes
  }

  function openDeleteConfirm(id: string, title: string) { setConfirmDeleteId(id); setConfirmDeleteTitle(title || ""); }
  function handleConfirmDelete() { if (confirmDeleteId) onDelete(confirmDeleteId); setConfirmDeleteId(null); setConfirmDeleteTitle(""); }
  function handleCancelDelete() { setConfirmDeleteId(null); setConfirmDeleteTitle(""); }

  const allCollapsed = templates.length > 0 && templates.every((t) => collapsedById[t.id]);
  function collapseAll() { const n: Record<string,boolean> = {}; templates.forEach((t) => { n[t.id] = true; }); setCollapsedById(n); setExpandedById({}); }
  function expandAll()   { const n: Record<string,boolean> = {}; templates.forEach((t) => { n[t.id] = false; }); setCollapsedById(n); setExpandedById({}); }

  const isSearchView = activeBoardName.startsWith("Search:");

  if ((!templates || templates.length === 0) && (!workflows || workflows.length === 0)) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", color: darkMode ? "#9ca3af" : "#6b7280" }}>{isSearchView ? "Current view:" : "Current board:"}</span>
            <span style={{ fontSize: "1rem", fontWeight: 600, color: darkMode ? "#e5e7eb" : "#111827" }}>{activeBoardName}</span>
            {!isSearchView && canDeleteBoard && (
              <button type="button" onClick={onRequestDeleteBoard} style={{ padding: "0.25rem 0.65rem", borderRadius: "999px", border: "1px solid #b91c1c", backgroundColor: darkMode ? "#111827" : "#fef2f2", color: "#b91c1c", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}>Delete board</button>
            )}
          </div>
        </div>
        <p style={{ color: darkMode ? (isSearchView ? "#fecaca" : "#9ca3af") : (isSearchView ? "#b91c1c" : "#6b7280"), fontSize: "0.9rem" }}>
          {isSearchView ? "No templates match your search. Clear the search box to see your saved templates again." : "No templates in this board yet."}
        </p>
      </>
    );
  }

  // Layout — merge templates + workflow cards into one sorted pool
  const effectiveWidth = windowWidth ?? 1200;
  const numColumns     = effectiveWidth >= 1200 ? 4 : effectiveWidth >= 768 ? 3 : 1;

  type GridItem =
    | { kind: "template"; data: Template }
    | { kind: "workflow"; data: WorkflowCard };

  const allPinned: GridItem[] = [
    ...templates.filter((t) =>  t.pinned).map((t): GridItem => ({ kind: "template", data: t })).sort((a,b)=>((a.data.pinnedAt??0)-(b.data.pinnedAt??0))),
    ...(workflows ?? []).filter((w) => w.pinned).map((w): GridItem => ({ kind: "workflow", data: w })).sort((a,b)=>((a.data.pinnedAt??0)-(b.data.pinnedAt??0))),
  ].sort((a,b) => (a.data.pinnedAt ?? 0) - (b.data.pinnedAt ?? 0));

  const allUnpinned: GridItem[] = [
    ...templates.filter((t) => !t.pinned).map((t): GridItem => ({ kind: "template", data: t })),
    ...(workflows ?? []).filter((w) => !w.pinned).map((w): GridItem => ({ kind: "workflow", data: w })),
  ].sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));

  const orderedItems: GridItem[] = [...allPinned, ...allUnpinned];
  const columns: GridItem[][] = Array.from({ length: numColumns }, () => []);
  orderedItems.forEach((item, i) => columns[i % numColumns].push(item));

  const unpinnedTemplateIds = templates.filter((t) => !t.pinned).sort((a,b)=>(a.order??0)-(b.order??0)).map((t) => t.id);

  // Colours
  const DEFAULT_ACCENT    = "#3b82f6";
  const cardBaseBg        = darkMode ? "#020617" : "white";
  const cardBaseBorder    = darkMode ? "#1e293b" : "#bfdbfe";
  const cardTextColor     = darkMode ? "#e5e7eb" : "#111827";
  const bodyTextColor     = darkMode ? "#e5e7eb" : "#111827";
  const bodyBg            = darkMode ? "#020617" : "#f9fafb";
  const mutedText         = darkMode ? "#6b7280" : "#9ca3af";
  const inputBorder       = darkMode ? "#475569" : "#ccc";
  const toolbarBg         = darkMode ? "#0f172a" : "#f3f4f6";

  const bulkButtonStyle: CSSProperties = {
    padding: "0.35rem 0.9rem", borderRadius: "999px",
    border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`,
    backgroundColor: darkMode ? "#020617" : "white",
    color: darkMode ? "#e5e7eb" : "#111827",
    fontSize: "0.85rem", cursor: "pointer", fontWeight: 500,
  };

  function arrowBtnStyle(disabled: boolean): CSSProperties {
    return {
      padding: "0.15rem 0.45rem", borderRadius: "999px",
      border: `1px solid ${disabled ? (darkMode ? "#1e293b" : "#e5e7eb") : (darkMode ? "#4b5563" : "#d1d5db")}`,
      backgroundColor: "transparent",
      color: disabled ? (darkMode ? "#374151" : "#d1d5db") : (darkMode ? "#9ca3af" : "#6b7280"),
      fontSize: "0.7rem", cursor: disabled ? "default" : "pointer",
      lineHeight: 1, userSelect: "none" as const,
    };
  }

  const toolbarBtnStyle: CSSProperties = {
    padding: "0.25rem 0.5rem", borderRadius: "5px",
    border: `1px solid ${inputBorder}`,
    backgroundColor: darkMode ? "#1e293b" : "white",
    color: cardTextColor, fontSize: "0.78rem",
    cursor: "pointer", lineHeight: 1, minWidth: "1.8rem",
  };

  const viewingTemplate = templates.find((t) => t.id === viewingTemplateId) ?? null;

  return (
    <>
      <style>{`
        @keyframes templify-fade-up {
          0%   { opacity: 0; transform: translateY(6px) scale(0.95); }
          15%  { opacity: 1; transform: translateY(0)   scale(1);    }
          75%  { opacity: 1; transform: translateY(0)   scale(1);    }
          100% { opacity: 0; transform: translateY(-4px) scale(0.97); }
        }
        .templify-copied-toast { animation: templify-fade-up 2s ease forwards; }
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: ${darkMode ? "#64748b" : "#9ca3af"};
          pointer-events: none;
        }
        .templify-rich-body ul, .templify-rich-body ol { margin: 0.25rem 0 0.25rem 1.1rem; padding: 0; }
        .templify-rich-body li { margin-bottom: 0.15rem; }
        .templify-rich-body table { border-collapse: collapse; width: 100%; margin: 0.5rem 0; }
        .templify-rich-body td, .templify-rich-body th { border: 1px solid #94a3b8; padding: 0.35rem 0.5rem; min-width: 60px; vertical-align: top; }
      `}</style>

      {/* ── Board + bulk controls ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", color: darkMode ? "#9ca3af" : "#6b7280" }}>{isSearchView ? "Current view:" : "Current board:"}</span>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: darkMode ? "#e5e7eb" : "#111827" }}>{activeBoardName}</span>
          {!isSearchView && canDeleteBoard && (
            <button type="button" onClick={onRequestDeleteBoard} style={{ padding: "0.25rem 0.65rem", borderRadius: "999px", border: "1px solid #b91c1c", backgroundColor: darkMode ? "#111827" : "#fef2f2", color: "#b91c1c", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}>Delete board</button>
          )}
        </div>
        <button type="button" style={bulkButtonStyle} onClick={() => allCollapsed ? expandAll() : collapseAll()}>
          {allCollapsed ? "Expand all" : "Minimize all"}
        </button>
      </div>

      {/* ── Masonry columns ── */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        {columns.map((col, colIdx) => (
          <div key={colIdx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {col.map((item) => {
              if (item.kind === "workflow") {
                const wf = item.data;
                const isPinned  = !!wf.pinned;
                const stepCount = Object.keys(wf.steps).length;
                const wfCollapsed = !!collapsedById[wf.id];
                return (
                  <article key={wf.id} style={{
                    borderTopStyle: "solid", borderBottomStyle: "solid",
                    borderLeftStyle: "dashed", borderRightStyle: "dashed",
                    borderTopWidth: "3px", borderBottomWidth: "3px",
                    borderLeftWidth: "2px", borderRightWidth: "2px",
                    borderTopColor: "#7c3aed", borderBottomColor: "#7c3aed",
                    borderLeftColor: "#7c3aed", borderRightColor: "#7c3aed",
                    borderRadius: "10px",
                    padding: wfCollapsed ? "0.35rem 0.5rem" : "0.75rem",
                    display: "flex", flexDirection: "column",
                    gap: wfCollapsed ? "0.2rem" : "0.4rem",
                    backgroundColor: darkMode ? "#0d0720" : "#faf5ff",
                    boxSizing: "border-box",
                    boxShadow: darkMode ? "0 8px 20px rgba(0,0,0,0.6)" : "0 6px 16px rgba(124,58,237,0.12)",
                  }}>
                    {/* Workflow card header row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <div style={{ flex: 1 }} />
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap" }}>
                        <button type="button" onClick={() => setCollapsedById((p) => ({ ...p, [wf.id]: !p[wf.id] }))}
                          style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#6b7280" : "#9ca3af"}`, backgroundColor: darkMode ? "#0d0720" : "#faf5ff", color: darkMode ? "#e5e7eb" : "#111827", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer" }}>
                          {wfCollapsed ? "Expand" : "Minimize"}
                        </button>
                        {!wfCollapsed && (
                          <>
                            <button type="button" onClick={() => onStartWorkflow(wf.id)}
                              style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: "1px solid #7c3aed", backgroundColor: darkMode ? "#1e1033" : "#ede9fe", color: darkMode ? "#c4b5fd" : "#6d28d9", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer" }}>
                              ▶ Start
                            </button>
                            <button type="button" onClick={() => onOpenWorkflowBuilder(wf.id)}
                              style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#9a3412" : "#d97706"}`, backgroundColor: darkMode ? "#0d0720" : "#faf5ff", color: darkMode ? "#fdba74" : "#b45309", fontSize: "0.72rem", cursor: "pointer" }}>
                              Edit
                            </button>
                            <button type="button" onClick={() => isPinned ? onUnpinWorkflow(wf.id) : onPinWorkflow(wf.id)}
                              style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${isPinned ? "#f97316" : darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: darkMode ? "#0d0720" : "#faf5ff", color: isPinned ? "#ea580c" : darkMode ? "#c4b5fd" : "#7c3aed", fontSize: "0.72rem", cursor: "pointer", fontWeight: 500 }}>
                              {isPinned ? "Unpin" : "Pin"}
                            </button>
                          </>
                        )}
                      </div>
                      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => onDeleteWorkflow(wf.id)} title="Delete workflow"
                          style={{ padding: "0.1rem 0.4rem", borderRadius: "999px", border: "none", backgroundColor: "transparent", color: "#b91c1c", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      {isPinned && <span style={{ fontSize: "0.7rem", color: "#f97316" }}>📌</span>}
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>🧭 Workflow</span>
                      <h2 style={{ fontSize: "0.92rem", fontWeight: 600, margin: 0, color: darkMode ? "#e5e7eb" : "#111827", wordBreak: "break-word" }}>
                        {wf.title}
                      </h2>
                    </div>

                    {/* Body preview — step count + resume badge */}
                    {!wfCollapsed && (
                      <div style={{ backgroundColor: darkMode ? "#1e1033" : "#ede9fe", borderRadius: "6px", padding: "0.5rem 0.65rem", fontSize: "0.82rem", color: darkMode ? "#c4b5fd" : "#6d28d9" }}>
                        <span style={{ fontWeight: 600 }}>{stepCount}</span> step{stepCount !== 1 ? "s" : ""}
                        {wf.resumeEnabled && <span style={{ marginLeft: "0.5rem", fontSize: "0.72rem", color: darkMode ? "#a78bfa" : "#7c3aed", opacity: 0.8 }}>• resume on</span>}
                      </div>
                    )}

                    {/* Footer */}
                    {!wfCollapsed && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span style={{ fontSize: "0.62rem", color: mutedText, whiteSpace: "nowrap" }}>
                          {formatCreatedAt(wf.createdAt)}
                        </span>
                      </div>
                    )}
                  </article>
                );
              }

              // ── Template card ──
              const template = item.data as Template;
              const collapsed       = !!collapsedById[template.id];
              const expanded        = !!expandedById[template.id];
              const isEditing       = editingId === template.id;
              const isRecentlyAdded = template.id === recentlyAddedId;
              const isPinned        = !!template.pinned;
              const isCopied        = copiedId === template.id;
              const unpinnedIdx     = unpinnedTemplateIds.indexOf(template.id);
              const isUnpinned      = unpinnedIdx !== -1;
              const canMoveLeft     = isUnpinned && unpinnedIdx > 0;
              const canMoveRight    = isUnpinned && unpinnedIdx < unpinnedTemplateIds.length - 1;

              // Card accent color: colorScheme > pin orange > default blue
              const accent = isRecentlyAdded
                ? "#facc15"
                : isPinned
                ? "#f97316"
                : (template.colorScheme || DEFAULT_ACCENT);

              let cardStyle: CSSProperties = {
                borderTopStyle: "solid",   borderBottomStyle: "solid",
                borderLeftStyle: "solid",  borderRightStyle: "solid",
                borderTopWidth: "3px",     borderBottomWidth: "3px",
                borderLeftWidth: "1px",    borderRightWidth: "1px",
                borderTopColor: accent,    borderBottomColor: accent,
                borderLeftColor: isRecentlyAdded ? accent : cardBaseBorder,
                borderRightColor: isRecentlyAdded ? accent : cardBaseBorder,
                borderRadius: "10px",
                padding: collapsed ? "0.35rem 0.5rem" : "0.75rem",
                display: "flex", flexDirection: "column",
                gap: collapsed ? "0.25rem" : "0.4rem",
                backgroundColor: isRecentlyAdded ? (darkMode ? "#1f2937" : "#fefce8") : cardBaseBg,
                boxSizing: "border-box",
                boxShadow: isRecentlyAdded
                  ? `0 0 0 2px ${accent}, 0 8px 20px rgba(15,23,42,0.25)`
                  : darkMode ? "0 8px 20px rgba(0,0,0,0.6)" : "0 6px 16px rgba(15,23,42,0.18)",
                transition: "box-shadow 0.25s ease, background-color 0.25s ease, border-color 0.25s ease",
              };

              return (
                <article key={template.id} style={cardStyle}>

                  {/* ── TOP BUTTON ROW ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", flexWrap: "wrap" }}>
                      {/* Minimize toggle */}
                      <button type="button" onClick={() => toggleCollapse(template.id)} title={collapsed ? "Expand" : "Minimize"}
                        style={{ padding: "0.25rem 0.65rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#6b7280" : "#9ca3af"}`, backgroundColor: darkMode ? "#020617" : "white", color: cardTextColor, fontSize: "0.72rem", fontWeight: 500, cursor: "pointer" }}>
                        {collapsed ? "Expand" : "Minimize"}
                      </button>

                      {!isEditing && (
                        <>
                          <button type="button" onClick={() => setViewingTemplateId(template.id)} title="Open in larger view"
                            style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#e5e7eb" : "#111827", fontSize: "0.72rem", cursor: "pointer", fontWeight: 500 }}>
                            ⤢ Expand
                          </button>

                          <button type="button" onClick={() => handleCopy(template.id, template.body)}
                            style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${isCopied ? "#16a34a" : darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: isCopied ? (darkMode ? "#052e16" : "#f0fdf4") : (darkMode ? "#020617" : "white"), color: isCopied ? "#16a34a" : "#2563eb", fontSize: "0.72rem", cursor: "pointer", transition: "all 0.2s ease", fontWeight: isCopied ? 600 : 400 }}>
                            {isCopied ? "✓" : "Copy"}
                          </button>

                          <button type="button" onClick={() => { if (collapsed) toggleCollapse(template.id); onStartEdit(template); }}
                            style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#9a3412" : "#d97706"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#fdba74" : "#b45309", fontSize: "0.72rem", cursor: "pointer" }}>
                            Edit
                          </button>

                          <button type="button" onClick={() => onRequestAssignBoard(template.id)}
                            style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#e5e7eb" : "#111827", fontSize: "0.72rem", cursor: "pointer", fontWeight: 500 }}>
                            Add to
                          </button>

                          <button type="button" onClick={() => isPinned ? onUnpin(template.id) : onPin(template.id)}
                            style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${isPinned ? "#f97316" : darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: darkMode ? "#020617" : "white", color: isPinned ? "#ea580c" : (darkMode ? "#e5e7eb" : "#111827"), fontSize: "0.72rem", cursor: "pointer", fontWeight: 500 }}>
                            {isPinned ? "Unpin" : "Pin"}
                          </button>
                        </>
                      )}
                    </div>
                    <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => openDeleteConfirm(template.id, template.title)} title="Delete template"
                        style={{ padding: "0.1rem 0.4rem", borderRadius: "999px", border: "none", backgroundColor: "transparent", color: "#b91c1c", fontWeight: "bold", fontSize: "1rem", cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* ── TITLE + PIN INDICATOR ── */}
                  {isEditing ? (
                    <input type="text" value={editingTitle} onChange={(e) => onChangeEditingTitle(e.target.value)}
                      style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid #ccc", backgroundColor: darkMode ? "#020617" : "white", color: cardTextColor, fontWeight: 600, marginTop: "0.15rem" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.1rem" }}>
                      {isPinned && <span style={{ fontSize: "0.72rem", color: "#f97316", fontWeight: 600 }}>📌</span>}
                      {template.colorScheme && !isPinned && (
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: template.colorScheme, flexShrink: 0, display: "inline-block" }} />
                      )}
                      <h2 style={{ fontSize: "0.92rem", fontWeight: 600, wordBreak: "break-word", margin: 0, color: cardTextColor }}>
                        {template.title}
                      </h2>
                    </div>
                  )}

                  {/* ── BODY / EDIT AREA ── */}
                  {!collapsed && (
                    <>
                      {isCopied && (
                        <div className="templify-copied-toast" style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.6rem", borderRadius: "6px", backgroundColor: darkMode ? "#052e16" : "#f0fdf4", border: `1px solid ${darkMode ? "#166534" : "#bbf7d0"}`, color: darkMode ? "#4ade80" : "#15803d", fontSize: "0.78rem", fontWeight: 500, width: "fit-content" }}>
                          ✓ Saved to clipboard
                        </div>
                      )}

                      {isEditing ? (
                        <>
                          {/* Formatting toolbar */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", flexWrap: "wrap", padding: "0.3rem", borderRadius: "6px 6px 0 0", border: `1px solid ${inputBorder}`, borderBottom: "none", backgroundColor: toolbarBg }}>
                            <button type="button" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditFormat("bold")} style={{ ...toolbarBtnStyle, fontWeight: 800 }}>B</button>
                            <button type="button" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditFormat("italic")} style={{ ...toolbarBtnStyle, fontStyle: "italic", fontWeight: 600 }}>I</button>
                            <button type="button" title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditFormat("underline")} style={{ ...toolbarBtnStyle, textDecoration: "underline", fontWeight: 600 }}>U</button>
                            <button type="button" title="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditFormat("insertUnorderedList")} style={toolbarBtnStyle}>• List</button>
                            <button type="button" title="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => applyEditFormat("insertOrderedList")} style={toolbarBtnStyle}>1. List</button>
                            <div style={{ position: "relative", display: "inline-block" }}>
                              <button type="button" title="Insert table" onMouseDown={(e) => e.preventDefault()} onClick={() => { restoreEditSelection(); setShowTablePicker((p) => !p); }} style={toolbarBtnStyle}>⊞ Table</button>
                              {showTablePicker && (
                                <div onMouseLeave={() => setTableHover({rows:0,cols:0})} style={{ position: "absolute", top: "110%", left: 0, zIndex: 100, backgroundColor: darkMode ? "#1e293b" : "white", border: `1px solid ${inputBorder}`, borderRadius: "6px", padding: "0.5rem", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                                  <div style={{ fontSize: "0.68rem", color: mutedText, marginBottom: "0.3rem", whiteSpace: "nowrap" }}>
                                    {tableHover.rows > 0 ? `${tableHover.rows} × ${tableHover.cols} table` : "Select size"}
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6,18px)", gap: "2px" }}>
                                    {Array.from({length:36},(_,i) => { const r=Math.floor(i/6)+1, c=(i%6)+1; const active=r<=tableHover.rows&&c<=tableHover.cols; return (
                                      <div key={i} onMouseEnter={() => setTableHover({rows:r,cols:c})} onClick={() => insertTable(tableHover.rows, tableHover.cols)}
                                        style={{ width:"18px", height:"18px", borderRadius:"2px", cursor:"pointer", backgroundColor: active ? (darkMode?"#3b82f6":"#bfdbfe") : (darkMode?"#334155":"#f1f5f9"), border: `1px solid ${active?(darkMode?"#60a5fa":"#93c5fd"):(darkMode?"#475569":"#e2e8f0")}` }}
                                      />
                                    );})}
                                  </div>
                                </div>
                              )}
                            </div>
                            <span style={{ width: "1px", height: "1.2rem", backgroundColor: inputBorder, margin: "0 0.1rem" }} />
                            <select defaultValue="" onChange={(e) => { if (e.target.value) applyEditFormat("foreColor", e.target.value); e.target.value = ""; }} title="Text color" style={{ ...toolbarBtnStyle, cursor: "pointer" }}>
                              <option value="" disabled>Color</option>
                              {TEXT_COLORS.map((c) => <option key={c.label} value={c.value}>{c.label}</option>)}
                            </select>
                            <button type="button" title="Clear all formatting" onMouseDown={(e) => e.preventDefault()} onClick={clearAllEditFormatting} style={{ ...toolbarBtnStyle, fontSize: "0.7rem", color: mutedText }}>Clear</button>
                          </div>

                          {/* Rich text editor */}
                          <div ref={editEditorRef} contentEditable onInput={handleEditEditorInput} onMouseUp={saveEditSelection} onKeyUp={saveEditSelection}
                            data-placeholder="Write the text you want to reuse..." suppressContentEditableWarning className="templify-rich-body"
                            style={{ minHeight: "6rem", maxHeight: "16rem", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", backgroundColor: bodyBg, color: bodyTextColor, padding: "0.5rem", borderRadius: "0 0 6px 6px", border: `1px solid ${inputBorder}`, fontFamily: "system-ui, sans-serif", fontSize: "0.9rem" }}
                          />

                          {/* ── Card color scheme picker ── */}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap", paddingTop: "0.1rem" }}>
                            <span style={{ fontSize: "0.72rem", color: mutedText, whiteSpace: "nowrap" }}>Card color:</span>
                            {CARD_COLORS.map((c) => {
                              const isSelected = (template.colorScheme || DEFAULT_ACCENT) === c.value;
                              return (
                                <button key={c.value} type="button" title={c.label}
                                  onClick={() => onUpdateColor(template.id, c.value)}
                                  style={{
                                    width: "18px", height: "18px", borderRadius: "50%",
                                    backgroundColor: c.value,
                                    border: isSelected ? `2px solid ${darkMode ? "white" : "#111827"}` : "2px solid transparent",
                                    outline: isSelected ? `2px solid ${c.value}` : "none",
                                    cursor: "pointer", flexShrink: 0,
                                    boxShadow: isSelected ? `0 0 0 1px ${c.value}` : "none",
                                    transition: "transform 0.1s ease",
                                    transform: isSelected ? "scale(1.25)" : "scale(1)",
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Save / Cancel */}
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.15rem" }}>
                            <button type="button" onClick={() => onSaveEdit(template.id)}
                              style={{ flex: 1, padding: "0.4rem 0.75rem", borderRadius: "6px", border: "none", backgroundColor: "#16a34a", color: "white", fontSize: "0.9rem", cursor: "pointer" }}>
                              Save
                            </button>
                            <button type="button" onClick={onCancelEdit}
                              style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: `1px solid ${darkMode ? "#6b7280" : "#9ca3af"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#e5e7eb" : "#374151", fontSize: "0.9rem", cursor: "pointer" }}>
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        /* ── Body preview: fixed height unless expanded ── */
                        <div style={{ position: "relative" }}>
                          <div
                            className="templify-rich-body"
                            style={{
                              whiteSpace: "pre-wrap", wordBreak: "break-word",
                              backgroundColor: bodyBg, color: bodyTextColor,
                              padding: "0.5rem", borderRadius: "6px",
                              fontFamily: "system-ui, sans-serif", fontSize: "0.9rem",
                              height: expanded ? "auto" : BODY_HEIGHT,
                              overflow: expanded ? "visible" : "hidden",
                              // Fade-out gradient at bottom when clipped
                              WebkitMaskImage: expanded ? "none" : "linear-gradient(to bottom, black 55%, transparent 100%)",
                              maskImage: expanded ? "none" : "linear-gradient(to bottom, black 55%, transparent 100%)",
                            }}
                            dangerouslySetInnerHTML={{ __html: template.body }}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* ── CARD FOOTER ── */}
                  {!isEditing && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.1rem", gap: "0.4rem" }}>

                      {/* Left: reorder arrows */}
                      {!isPinned ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          <button type="button" disabled={!canMoveLeft}  onClick={() => canMoveLeft  && onReorder(template.id, "left")}  title="Move left"  style={arrowBtnStyle(!canMoveLeft)}>◀</button>
                          <button type="button" disabled={!canMoveRight} onClick={() => canMoveRight && onReorder(template.id, "right")} title="Move right" style={arrowBtnStyle(!canMoveRight)}>▶</button>
                        </div>
                      ) : <div />}

                      {/* Center: expand/collapse arrow — hidden when minimized or editing */}
                      {!collapsed && (
                        <button type="button" onClick={() => toggleExpand(template.id)}
                          title={expanded ? "Collapse to preview" : "Expand to see full content"}
                          style={{
                            padding: "0.15rem 0.65rem", borderRadius: "999px",
                            border: `1px solid ${expanded ? accent : (darkMode ? "#4b5563" : "#d1d5db")}`,
                            backgroundColor: expanded ? (darkMode ? "#1e293b" : "#f0f9ff") : "transparent",
                            color: expanded ? accent : mutedText,
                            fontSize: "0.7rem", cursor: "pointer",
                            lineHeight: 1, transition: "all 0.15s ease",
                          }}>
                          {expanded ? "▲ Less" : "▼ More"}
                        </button>
                      )}

                      {/* Right: posted date */}
                      {template.createdAt ? (
                        <span style={{ fontSize: "0.62rem", color: mutedText, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
                          {formatCreatedAt(template.createdAt)}
                        </span>
                      ) : <div />}
                    </div>
                  )}

                </article>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── EXPAND-TO-MODAL VIEWER ── */}
      {viewingTemplate && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: "1.5rem" }}
          onClick={() => setViewingTemplateId(null)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ backgroundColor: darkMode ? "#0f172a" : "white", borderRadius: "12px", width: "100%", maxWidth: "44rem", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 40px rgba(0,0,0,0.35)", border: `1px solid ${viewingTemplate.colorScheme || DEFAULT_ACCENT}`, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.1rem 1.4rem", borderBottom: `1px solid ${darkMode ? "#1e293b" : "#e5e7eb"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                {viewingTemplate.pinned && <span style={{ fontSize: "0.85rem", color: "#f97316" }}>📌</span>}
                {viewingTemplate.colorScheme && !viewingTemplate.pinned && (
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: viewingTemplate.colorScheme, flexShrink: 0, display: "inline-block" }} />
                )}
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: cardTextColor, wordBreak: "break-word" }}>{viewingTemplate.title}</h2>
              </div>
              <button type="button" onClick={() => setViewingTemplateId(null)}
                style={{ padding: "0.3rem 0.8rem", borderRadius: "999px", border: "1px solid #fca5a5", backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5", color: darkMode ? "#fca5a5" : "#dc2626", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
                ✕ Close
              </button>
            </div>
            <div className="templify-rich-body" style={{ padding: "1.4rem", overflowY: "auto", flex: 1, fontSize: "1.05rem", lineHeight: 1.7, color: bodyTextColor, whiteSpace: "pre-wrap", wordBreak: "break-word" }}
              dangerouslySetInnerHTML={{ __html: viewingTemplate.body }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.85rem 1.4rem", borderTop: `1px solid ${darkMode ? "#1e293b" : "#e5e7eb"}`, gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", color: mutedText }}>{viewingTemplate.createdAt ? formatCreatedAt(viewingTemplate.createdAt) : ""}</span>
              <button type="button" onClick={() => handleCopy(viewingTemplate.id, viewingTemplate.body)}
                style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", border: `1px solid ${copiedId === viewingTemplate.id ? "#16a34a" : "#2563eb"}`, backgroundColor: copiedId === viewingTemplate.id ? (darkMode ? "#052e16" : "#f0fdf4") : (darkMode ? "#020617" : "#eff6ff"), color: copiedId === viewingTemplate.id ? "#16a34a" : "#2563eb", fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                {copiedId === viewingTemplate.id ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE MODAL ── */}
      {confirmDeleteId && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: darkMode ? "#020617" : "white", padding: "1.25rem 1.5rem", borderRadius: "10px", minWidth: "280px", maxWidth: "90vw", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)", border: darkMode ? "1px solid #4b5563" : "none" }}>
            <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem", fontWeight: 600, color: darkMode ? "#e5e7eb" : "#111827" }}>Delete template?</h3>
            <p style={{ margin: 0, marginBottom: "0.75rem", fontSize: "0.9rem", color: darkMode ? "#9ca3af" : "#4b5563" }}>
              {confirmDeleteTitle ? `Are you sure you want to delete "${confirmDeleteTitle}"?` : "Are you sure you want to delete this template?"}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button type="button" onClick={handleCancelDelete} style={{ padding: "0.35rem 0.8rem", borderRadius: "6px", border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#e5e7eb" : "#111827", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleConfirmDelete} style={{ padding: "0.35rem 0.8rem", borderRadius: "6px", border: "none", backgroundColor: "#b91c1c", color: "white", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}