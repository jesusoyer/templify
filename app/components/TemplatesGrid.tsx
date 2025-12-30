import React, { useState, useEffect } from "react";

type Template = {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
  pinnedAt?: number | null;
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
};

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
}: TemplatesGridProps) {
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>(
    {}
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState<string>("");

  // Track window width for responsive columns
  const [windowWidth, setWindowWidth] = useState<number | null>(null);

  useEffect(() => {
    function handleResize() {
      setWindowWidth(window.innerWidth);
    }
    handleResize(); // set initial
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!templates || templates.length === 0) {
    return (
      <p style={{ color: darkMode ? "#9ca3af" : "#6b7280" }}>
        No templates saved yet.
      </p>
    );
  }

  function toggleCollapse(id: string) {
    setCollapsedById((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function setExpanded(id: string) {
    setCollapsedById((prev) => ({
      ...prev,
      [id]: false,
    }));
  }

  function openDeleteConfirm(id: string, title: string) {
    setConfirmDeleteId(id);
    setConfirmDeleteTitle(title || "");
  }

  function handleConfirmDelete() {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId);
    }
    setConfirmDeleteId(null);
    setConfirmDeleteTitle("");
  }

  function handleCancelDelete() {
    setConfirmDeleteId(null);
    setConfirmDeleteTitle("");
  }

  // bulk collapse / expand
  const allCollapsed = templates.length
    ? templates.every((t) => collapsedById[t.id])
    : false;

  function collapseAll() {
    const next: Record<string, boolean> = {};
    templates.forEach((t) => {
      next[t.id] = true;
    });
    setCollapsedById(next);
  }

  function expandAll() {
    const next: Record<string, boolean> = {};
    templates.forEach((t) => {
      next[t.id] = false;
    });
    setCollapsedById(next);
  }

  const bulkLabel = allCollapsed ? "Expand all" : "Minimize all";

  // Responsive column count:
  //  - >= 1200px -> 4
  //  - >= 768px  -> 3
  //  - else      -> 1
  const effectiveWidth = windowWidth ?? 1200;
  const numColumns =
    effectiveWidth >= 1200 ? 4 : effectiveWidth >= 768 ? 3 : 1;

  // 🔹 Pinned first (ordered by pinnedAt), then unpinned in original order
  const pinnedTemplates = templates
    .filter((t) => t.pinned)
    .sort((a, b) => (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0));

  const unpinnedTemplates = templates.filter((t) => !t.pinned);

  const orderedTemplates: Template[] = [...pinnedTemplates, ...unpinnedTemplates];

  const columns: Template[][] = Array.from({ length: numColumns }, () => []);
  orderedTemplates.forEach((template, index) => {
    const colIndex = index % numColumns;
    columns[colIndex].push(template);
  });

  const cardBaseBg = darkMode ? "#020617" : "white";
  const cardBaseBorder = darkMode ? "#1e293b" : "#bfdbfe";
  const cardAccent = "#3b82f6";
  const cardTextColor = darkMode ? "#e5e7eb" : "#111827";
  const bodyTextColor = darkMode ? "#e5e7eb" : "#111827";
  const bodyBg = darkMode ? "#020617" : "#f9fafb";

  const bulkButtonStyle: React.CSSProperties = {
    padding: "0.35rem 0.9rem",
    borderRadius: "999px",
    border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`,
    backgroundColor: darkMode ? "#020617" : "white",
    color: darkMode ? "#e5e7eb" : "#111827",
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: 500,
  };

  return (
    <>
      {/* Bulk controls row */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "0.5rem",
        }}
      >
        <button
          type="button"
          style={bulkButtonStyle}
          onClick={() => {
            if (allCollapsed) {
              expandAll();
            } else {
              collapseAll();
            }
          }}
        >
          {bulkLabel}
        </button>
      </div>

      {/* Masonry-like columns (responsive numColumns) */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start",
        }}
      >
        {columns.map((columnTemplates, colIdx) => (
          <div
            key={colIdx}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {columnTemplates.map((template) => {
              const collapsed = !!collapsedById[template.id];
              const isEditing = editingId === template.id;
              const isRecentlyAdded = template.id === recentlyAddedId;
              const isPinned = !!template.pinned;

              // base card style – no border shorthands
              let cardStyle: React.CSSProperties = {
                borderTopStyle: "solid",
                borderBottomStyle: "solid",
                borderLeftStyle: "solid",
                borderRightStyle: "solid",

                borderTopWidth: "3px",
                borderBottomWidth: "3px",
                borderLeftWidth: "1px",
                borderRightWidth: "1px",

                borderTopColor: cardAccent,
                borderBottomColor: cardAccent,
                borderLeftColor: cardBaseBorder,
                borderRightColor: cardBaseBorder,

                borderRadius: "10px",
                padding: collapsed ? "0.35rem 0.5rem" : "0.75rem",
                display: "flex",
                flexDirection: "column",
                gap: collapsed ? "0.25rem" : "0.5rem",
                backgroundColor: cardBaseBg,
                boxSizing: "border-box",
                boxShadow: darkMode
                  ? "0 8px 20px rgba(0, 0, 0, 0.6)"
                  : "0 6px 16px rgba(15, 23, 42, 0.18)",
                transition:
                  "box-shadow 0.25s ease, background-color 0.25s ease, border-color 0.25s ease",
              };

              // pinned accent (orange top/bottom)
              if (isPinned) {
                cardStyle = {
                  ...cardStyle,
                  borderTopColor: "#f97316",
                  borderBottomColor: "#f97316",
                };
              }

              // highlight newly added card
              if (isRecentlyAdded) {
                cardStyle = {
                  ...cardStyle,
                  backgroundColor: darkMode ? "#1f2937" : "#fefce8",
                  borderTopColor: "#facc15",
                  borderBottomColor: "#facc15",
                  borderLeftColor: "#facc15",
                  borderRightColor: "#facc15",
                  boxShadow:
                    "0 0 0 2px #facc15, 0 8px 20px rgba(15, 23, 42, 0.25)",
                };
              }

              const minimizeLabel = collapsed ? "Expand" : "Minimize";

              return (
                <article key={template.id} style={cardStyle}>
                  {/* TOP BUTTON ROW */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {/* left spacer */}
                    <div style={{ flex: 1 }} />

                    {/* center: minimize / copy / edit / pin */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCollapse(template.id)}
                        title={minimizeLabel}
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          border: `1px solid ${
                            darkMode ? "#6b7280" : "#9ca3af"
                          }`,
                          backgroundColor: darkMode ? "#020617" : "white",
                          color: cardTextColor,
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {minimizeLabel}
                      </button>

                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={() => onCopy(template.body)}
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "999px",
                              border: `1px solid ${
                                darkMode ? "#4b5563" : "#d1d5db"
                              }`,
                              backgroundColor: darkMode
                                ? "#020617"
                                : "white",
                              color: "#2563eb",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Copy
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (collapsed) {
                                setExpanded(template.id);
                              }
                              onStartEdit(template);
                            }}
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "999px",
                              border: `1px solid ${
                                darkMode ? "#9a3412" : "#d97706"
                              }`,
                              backgroundColor: darkMode
                                ? "#020617"
                                : "white",
                              color: darkMode ? "#fdba74" : "#b45309",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>

                          {/* PIN / UNPIN */}
                          <button
                            type="button"
                            onClick={() =>
                              isPinned
                                ? onUnpin(template.id)
                                : onPin(template.id)
                            }
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "999px",
                              border: `1px solid ${
                                isPinned
                                  ? "#f97316"
                                  : darkMode
                                  ? "#4b5563"
                                  : "#d1d5db"
                              }`,
                              backgroundColor: darkMode
                                ? "#020617"
                                : "white",
                              color: isPinned
                                ? "#ea580c"
                                : darkMode
                                ? "#e5e7eb"
                                : "#111827",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            {isPinned ? "Unpin" : "Pin"}
                          </button>
                        </>
                      )}
                    </div>

                    {/* right: delete */}
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          openDeleteConfirm(template.id, template.title)
                        }
                        title="Delete template"
                        style={{
                          padding: "0.1rem 0.4rem",
                          borderRadius: "999px",
                          border: "none",
                          backgroundColor: "transparent",
                          color: "#b91c1c",
                          fontWeight: "bold",
                          fontSize: "1rem",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* TITLE + PIN INDICATOR */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) =>
                        onChangeEditingTitle(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        backgroundColor: darkMode ? "#020617" : "white",
                        color: cardTextColor,
                        fontWeight: 600,
                        marginTop: "0.15rem",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        marginTop: "0.15rem",
                      }}
                    >
                      {isPinned && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "#f97316",
                            fontWeight: 600,
                          }}
                        >
                          📌 Pinned
                        </span>
                      )}
                      <h2
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          wordBreak: "break-word",
                          margin: 0,
                          color: cardTextColor,
                        }}
                      >
                        {template.title}
                      </h2>
                    </div>
                  )}

                  {/* BODY / EDIT AREA */}
                  {!collapsed && (
                    <>
                      {isEditing ? (
                        <>
                          <textarea
                            rows={5}
                            value={editingBody}
                            onChange={(e) =>
                              onChangeEditingBody(e.target.value)
                            }
                            style={{
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                              backgroundColor: bodyBg,
                              color: bodyTextColor,
                              padding: "0.5rem",
                              borderRadius: "6px",
                              border: "1px solid #ccc",
                              flexGrow: 1,
                              fontFamily: "system-ui, sans-serif",
                              fontSize: "0.9rem",
                              resize: "vertical",
                            }}
                          />

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "0.5rem",
                              marginTop: "0.25rem",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => onSaveEdit(template.id)}
                              style={{
                                flex: 1,
                                padding: "0.4rem 0.75rem",
                                borderRadius: "6px",
                                border: "none",
                                backgroundColor: "#16a34a",
                                color: "white",
                                fontSize: "0.9rem",
                                cursor: "pointer",
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEdit}
                              style={{
                                padding: "0.4rem 0.75rem",
                                borderRadius: "6px",
                                border: `1px solid ${
                                  darkMode ? "#6b7280" : "#9ca3af"
                                }`,
                                backgroundColor: darkMode
                                  ? "#020617"
                                  : "white",
                                color: darkMode ? "#e5e7eb" : "#374151",
                                fontSize: "0.9rem",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <pre
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            backgroundColor: bodyBg,
                            color: bodyTextColor,
                            padding: "0.5rem",
                            borderRadius: "6px",
                            flexGrow: 1,
                            fontFamily: "system-ui, sans-serif",
                            fontSize: "0.9rem",
                          }}
                        >
                          {template.body}
                        </pre>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
        ))}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDeleteId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
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
              Delete template?
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: "0.75rem",
                fontSize: "0.9rem",
                color: darkMode ? "#9ca3af" : "#4b5563",
              }}
            >
              {confirmDeleteTitle
                ? `Are you sure you want to delete "${confirmDeleteTitle}"?`
                : "Are you sure you want to delete this template?"}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              <button
                type="button"
                onClick={handleCancelDelete}
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
                onClick={handleConfirmDelete}
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
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
