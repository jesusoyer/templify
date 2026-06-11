"use client";

import React, { useState, useEffect, useRef, type CSSProperties } from "react";

type Template = {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  pinnedAt?: number | null;
  boardId?: string;
  createdAt?: number | null;   // ← NEW: Unix ms timestamp, stamped on save
  order?: number;              // ← NEW: manual sort position (0-based)
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
  onReorder: (id: string, direction: "left" | "right") => void; // ← NEW

  // Board UI
  activeBoardName: string;
  canDeleteBoard: boolean;
  onRequestDeleteBoard: () => void;
};

// ── Format stored timestamp → "Jun 10, 2026  3:42 PM" ──
function formatCreatedAt(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

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
  activeBoardName,
  canDeleteBoard,
  onRequestDeleteBoard,
}: TemplatesGridProps) {
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string>("");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [windowWidth, setWindowWidth] = useState<number | null>(null);

  useEffect(() => {
    function handleResize() { setWindowWidth(window.innerWidth); }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); };
  }, []);

  function handleCopy(templateId: string, body: string) {
    onCopy(body);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    setCopiedId(templateId);
    copiedTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
  }

  const isSearchView = activeBoardName.startsWith("Search:");

  // ── Empty state ──
  if (!templates || templates.length === 0) {
    return (
      <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", color: darkMode ? "#9ca3af" : "#6b7280" }}>
              {isSearchView ? "Current view:" : "Current board:"}
            </span>
            <span style={{ fontSize: "1rem", fontWeight: 600, color: darkMode ? "#e5e7eb" : "#111827" }}>
              {activeBoardName}
            </span>
            {!isSearchView && canDeleteBoard && (
              <button type="button" onClick={onRequestDeleteBoard} style={{ padding: "0.25rem 0.65rem", borderRadius: "999px", border: "1px solid #b91c1c", backgroundColor: darkMode ? "#111827" : "#fef2f2", color: "#b91c1c", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}>
                Delete board
              </button>
            )}
          </div>
        </div>
        {isSearchView ? (
          <p style={{ color: darkMode ? "#fecaca" : "#b91c1c", fontSize: "0.9rem" }}>
            No templates match your search. Clear the search box to see your saved templates again.
          </p>
        ) : (
          <p style={{ color: darkMode ? "#9ca3af" : "#6b7280", fontSize: "0.9rem" }}>
            No templates in this board yet.
          </p>
        )}
      </>
    );
  }

  function toggleCollapse(id: string) { setCollapsedById((prev) => ({ ...prev, [id]: !prev[id] })); }
  function setExpanded(id: string) { setCollapsedById((prev) => ({ ...prev, [id]: false })); }
  function openDeleteConfirm(id: string, title: string) { setConfirmDeleteId(id); setConfirmDeleteTitle(title || ""); }
  function handleConfirmDelete() { if (confirmDeleteId) onDelete(confirmDeleteId); setConfirmDeleteId(null); setConfirmDeleteTitle(""); }
  function handleCancelDelete() { setConfirmDeleteId(null); setConfirmDeleteTitle(""); }

  const allCollapsed = templates.length ? templates.every((t) => collapsedById[t.id]) : false;
  function collapseAll() { const next: Record<string, boolean> = {}; templates.forEach((t) => { next[t.id] = true; }); setCollapsedById(next); }
  function expandAll()   { const next: Record<string, boolean> = {}; templates.forEach((t) => { next[t.id] = false; }); setCollapsedById(next); }

  const bulkLabel = allCollapsed ? "Expand all" : "Minimize all";
  const effectiveWidth = windowWidth ?? 1200;
  const numColumns = effectiveWidth >= 1200 ? 4 : effectiveWidth >= 768 ? 3 : 1;

  // ── Sort: pinned first (by pinnedAt), then unpinned by `order` ──
  const pinnedTemplates   = templates.filter((t) => t.pinned).sort((a, b) => (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0));
  const unpinnedTemplates = templates.filter((t) => !t.pinned).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const orderedTemplates: Template[] = [...pinnedTemplates, ...unpinnedTemplates];

  const columns: Template[][] = Array.from({ length: numColumns }, () => []);
  orderedTemplates.forEach((template, index) => { columns[index % numColumns].push(template); });

  // For determining if a template can move left / right within unpinned list
  const unpinnedIds = unpinnedTemplates.map((t) => t.id);

  const cardBaseBg     = darkMode ? "#020617" : "white";
  const cardBaseBorder = darkMode ? "#1e293b" : "#bfdbfe";
  const cardAccent     = "#3b82f6";
  const cardTextColor  = darkMode ? "#e5e7eb" : "#111827";
  const bodyTextColor  = darkMode ? "#e5e7eb" : "#111827";
  const bodyBg         = darkMode ? "#020617" : "#f9fafb";
  const mutedText      = darkMode ? "#6b7280" : "#9ca3af";

  const bulkButtonStyle: CSSProperties = {
    padding: "0.35rem 0.9rem", borderRadius: "999px",
    border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`,
    backgroundColor: darkMode ? "#020617" : "white",
    color: darkMode ? "#e5e7eb" : "#111827",
    fontSize: "0.85rem", cursor: "pointer", fontWeight: 500,
  };

  // ── Arrow button style ──
  function arrowBtnStyle(disabled: boolean): CSSProperties {
    return {
      padding: "0.15rem 0.45rem",
      borderRadius: "999px",
      border: `1px solid ${disabled ? (darkMode ? "#1e293b" : "#e5e7eb") : (darkMode ? "#4b5563" : "#d1d5db")}`,
      backgroundColor: "transparent",
      color: disabled ? (darkMode ? "#374151" : "#d1d5db") : (darkMode ? "#9ca3af" : "#6b7280"),
      fontSize: "0.7rem",
      cursor: disabled ? "default" : "pointer",
      lineHeight: 1,
      transition: "all 0.15s ease",
      userSelect: "none" as const,
    };
  }

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
      `}</style>

      {/* Board indicator + bulk controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", color: darkMode ? "#9ca3af" : "#6b7280" }}>
            {isSearchView ? "Current view:" : "Current board:"}
          </span>
          <span style={{ fontSize: "1rem", fontWeight: 600, color: darkMode ? "#e5e7eb" : "#111827" }}>
            {activeBoardName}
          </span>
          {!isSearchView && canDeleteBoard && (
            <button type="button" onClick={onRequestDeleteBoard} style={{ padding: "0.25rem 0.65rem", borderRadius: "999px", border: "1px solid #b91c1c", backgroundColor: darkMode ? "#111827" : "#fef2f2", color: "#b91c1c", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}>
              Delete board
            </button>
          )}
        </div>
        <button type="button" style={bulkButtonStyle} onClick={() => (allCollapsed ? expandAll() : collapseAll())}>
          {bulkLabel}
        </button>
      </div>

      {/* Masonry columns */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        {columns.map((columnTemplates, colIdx) => (
          <div key={colIdx} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {columnTemplates.map((template) => {
              const collapsed      = !!collapsedById[template.id];
              const isEditing      = editingId === template.id;
              const isRecentlyAdded = template.id === recentlyAddedId;
              const isPinned       = !!template.pinned;
              const isCopied       = copiedId === template.id;

              // Reorder arrows — only for unpinned templates
              const unpinnedIdx  = unpinnedIds.indexOf(template.id);
              const isUnpinned   = unpinnedIdx !== -1;
              const canMoveLeft  = isUnpinned && unpinnedIdx > 0;
              const canMoveRight = isUnpinned && unpinnedIdx < unpinnedIds.length - 1;

              let cardStyle: CSSProperties = {
                borderTopStyle: "solid", borderBottomStyle: "solid",
                borderLeftStyle: "solid", borderRightStyle: "solid",
                borderTopWidth: "3px", borderBottomWidth: "3px",
                borderLeftWidth: "1px", borderRightWidth: "1px",
                borderTopColor: cardAccent, borderBottomColor: cardAccent,
                borderLeftColor: cardBaseBorder, borderRightColor: cardBaseBorder,
                borderRadius: "10px",
                padding: collapsed ? "0.35rem 0.5rem" : "0.75rem",
                display: "flex", flexDirection: "column",
                gap: collapsed ? "0.25rem" : "0.5rem",
                backgroundColor: cardBaseBg,
                boxSizing: "border-box",
                boxShadow: darkMode ? "0 8px 20px rgba(0,0,0,0.6)" : "0 6px 16px rgba(15,23,42,0.18)",
                transition: "box-shadow 0.25s ease, background-color 0.25s ease, border-color 0.25s ease",
              };

              if (isPinned) { cardStyle = { ...cardStyle, borderTopColor: "#f97316", borderBottomColor: "#f97316" }; }
              if (isRecentlyAdded) {
                cardStyle = { ...cardStyle, backgroundColor: darkMode ? "#1f2937" : "#fefce8", borderTopColor: "#facc15", borderBottomColor: "#facc15", borderLeftColor: "#facc15", borderRightColor: "#facc15", boxShadow: "0 0 0 2px #facc15, 0 8px 20px rgba(15,23,42,0.25)" };
              }

              return (
                <article key={template.id} style={cardStyle}>

                  {/* ── TOP BUTTON ROW ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem", flexWrap: "wrap" }}>
                      <button type="button" onClick={() => toggleCollapse(template.id)} title={collapsed ? "Expand" : "Minimize"}
                        style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#6b7280" : "#9ca3af"}`, backgroundColor: darkMode ? "#020617" : "white", color: cardTextColor, fontSize: "0.75rem", fontWeight: 500, cursor: "pointer" }}>
                        {collapsed ? "Expand" : "Minimize"}
                      </button>

                      {!isEditing && (
                        <>
                          <button type="button" onClick={() => handleCopy(template.id, template.body)}
                            style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", border: `1px solid ${isCopied ? "#16a34a" : darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: isCopied ? (darkMode ? "#052e16" : "#f0fdf4") : (darkMode ? "#020617" : "white"), color: isCopied ? "#16a34a" : "#2563eb", fontSize: "0.75rem", cursor: "pointer", transition: "all 0.2s ease", fontWeight: isCopied ? 600 : 400 }}>
                            {isCopied ? "✓ Copied" : "Copy"}
                          </button>

                          <button type="button" onClick={() => { if (collapsed) setExpanded(template.id); onStartEdit(template); }}
                            style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#9a3412" : "#d97706"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#fdba74" : "#b45309", fontSize: "0.75rem", cursor: "pointer" }}>
                            Edit
                          </button>

                          <button type="button" onClick={() => onRequestAssignBoard(template.id)}
                            style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#e5e7eb" : "#111827", fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
                            Add to
                          </button>

                          <button type="button" onClick={() => isPinned ? onUnpin(template.id) : onPin(template.id)}
                            style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", border: `1px solid ${isPinned ? "#f97316" : darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: darkMode ? "#020617" : "white", color: isPinned ? "#ea580c" : (darkMode ? "#e5e7eb" : "#111827"), fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
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
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.15rem" }}>
                      {isPinned && <span style={{ fontSize: "0.75rem", color: "#f97316", fontWeight: 600 }}>📌 Pinned</span>}
                      <h2 style={{ fontSize: "0.95rem", fontWeight: 600, wordBreak: "break-word", margin: 0, color: cardTextColor }}>
                        {template.title}
                      </h2>
                    </div>
                  )}

                  {/* ── BODY / EDIT AREA ── */}
                  {!collapsed && (
                    <>
                      {isCopied && (
                        <div className="templify-copied-toast" style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.3rem 0.65rem", borderRadius: "6px", backgroundColor: darkMode ? "#052e16" : "#f0fdf4", border: `1px solid ${darkMode ? "#166534" : "#bbf7d0"}`, color: darkMode ? "#4ade80" : "#15803d", fontSize: "0.8rem", fontWeight: 500, width: "fit-content" }}>
                          <span style={{ fontSize: "0.9rem" }}>✓</span> Saved to clipboard
                        </div>
                      )}

                      {isEditing ? (
                        <>
                          <textarea rows={5} value={editingBody} onChange={(e) => onChangeEditingBody(e.target.value)}
                            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", backgroundColor: bodyBg, color: bodyTextColor, padding: "0.5rem", borderRadius: "6px", border: "1px solid #ccc", flexGrow: 1, fontFamily: "system-ui, sans-serif", fontSize: "0.9rem", resize: "vertical" }} />
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.25rem" }}>
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
                        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", backgroundColor: bodyBg, color: bodyTextColor, padding: "0.5rem", borderRadius: "6px", flexGrow: 1, fontFamily: "system-ui, sans-serif", fontSize: "0.9rem" }}>
                          {template.body}
                        </pre>
                      )}
                    </>
                  )}

                  {/* ── CARD FOOTER: reorder arrows (left) + posted date (right) ── */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: collapsed ? "0" : "0.25rem", gap: "0.5rem" }}>

                    {/* Reorder arrows — hidden for pinned templates */}
                    {!isPinned ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <button
                          type="button"
                          disabled={!canMoveLeft}
                          onClick={() => canMoveLeft && onReorder(template.id, "left")}
                          title="Move left"
                          style={arrowBtnStyle(!canMoveLeft)}
                        >
                          ◀
                        </button>
                        <button
                          type="button"
                          disabled={!canMoveRight}
                          onClick={() => canMoveRight && onReorder(template.id, "right")}
                          title="Move right"
                          style={arrowBtnStyle(!canMoveRight)}
                        >
                          ▶
                        </button>
                      </div>
                    ) : (
                      // Placeholder so date stays right-aligned for pinned cards too
                      <div />
                    )}

                    {/* Posted date */}
                    {template.createdAt ? (
                      <span style={{ fontSize: "0.65rem", color: mutedText, whiteSpace: "nowrap", letterSpacing: "0.01em" }}>
                        Posted {formatCreatedAt(template.createdAt)}
                      </span>
                    ) : (
                      <div />
                    )}
                  </div>

                </article>
              );
            })}
          </div>
        ))}
      </div>

      {/* DELETE MODAL */}
      {confirmDeleteId && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ backgroundColor: darkMode ? "#020617" : "white", padding: "1.25rem 1.5rem", borderRadius: "10px", minWidth: "280px", maxWidth: "90vw", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5), 0 4px 6px -4px rgba(0,0,0,0.5)", border: darkMode ? "1px solid #4b5563" : "none" }}>
            <h3 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1rem", fontWeight: 600, color: darkMode ? "#e5e7eb" : "#111827" }}>Delete template?</h3>
            <p style={{ margin: 0, marginBottom: "0.75rem", fontSize: "0.9rem", color: darkMode ? "#9ca3af" : "#4b5563" }}>
              {confirmDeleteTitle ? `Are you sure you want to delete "${confirmDeleteTitle}"?` : "Are you sure you want to delete this template?"}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button type="button" onClick={handleCancelDelete} style={{ padding: "0.35rem 0.8rem", borderRadius: "6px", border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#e5e7eb" : "#111827", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleConfirmDelete} style={{ padding: "0.35rem 0.8rem", borderRadius: "6px", border: "none", backgroundColor: "#b91c1c", color: "white", fontSize: "0.85rem", cursor: "pointer", fontWeight: 500 }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}