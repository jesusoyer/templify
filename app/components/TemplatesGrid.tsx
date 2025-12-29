import { useState } from "react";

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
}) {
  // Per-card collapsed state: { [id]: boolean }
  const [collapsedById, setCollapsedById] = useState({});
  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState("");

  if (!templates || templates.length === 0) {
    return <p style={{ color: "#6b7280" }}>No templates saved yet.</p>;
  }

  function toggleCollapse(id) {
    setCollapsedById((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function setExpanded(id) {
    setCollapsedById((prev) => ({
      ...prev,
      [id]: false,
    }));
  }

  function openDeleteConfirm(id, title) {
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

  const numColumns = 4;

  // Split templates into 4 columns: 0,4,8,... | 1,5,9,... etc.
  const columns = Array.from({ length: numColumns }, () => []);
  templates.forEach((template, index) => {
    const colIndex = index % numColumns;
    columns[colIndex].push(template);
  });

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start", // columns don't stretch
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

              const cardStyle = {
  border: "1px solid #d1d5db", // a bit stronger
  borderRadius: "8px",
  padding: collapsed ? "0.35rem 0.5rem" : "0.75rem",
  display: "flex",
  flexDirection: "column",
  gap: collapsed ? "0.25rem" : "0.5rem",
  backgroundColor: "white",
  boxSizing: "border-box",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.12)", // 👈 main card shadow
};


              const minimizeLabel = collapsed ? "Expand" : "Minimize";

              return (
                <article key={template.id} style={cardStyle}>
                  {/* TOP BUTTON ROW: center group + right X */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    {/* left spacer */}
                    <div style={{ flex: 1 }} />

                    {/* centered button group */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.25rem",
                      }}
                    >
                      {/* Minimize / expand button (more prominent) */}
                      <button
                        type="button"
                        onClick={() => toggleCollapse(template.id)}
                        title={minimizeLabel}
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          border: "1px solid #9ca3af",
                          backgroundColor: "white",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {minimizeLabel}
                      </button>

                      {/* Copy + Edit only in non-edit mode */}
                      {!isEditing && (
                        <>
                          <button
                            type="button"
                            onClick={() => onCopy(template.body)}
                            style={{
                              padding: "0.2rem 0.6rem",
                              borderRadius: "999px",
                              border: "1px solid #d1d5db",
                              backgroundColor: "white",
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
                              border: "1px solid #d97706",
                              backgroundColor: "white",
                              color: "#b45309",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>

                    {/* right side: red X */}
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

                  {/* TITLE DIRECTLY UNDER BUTTONS */}
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => onChangeEditingTitle(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        fontWeight: 600,
                        marginTop: "0.15rem",
                      }}
                    />
                  ) : (
                    <h2
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        wordBreak: "break-word",
                        margin: 0,
                        marginTop: "0.15rem",
                      }}
                    >
                      {template.title}
                    </h2>
                  )}

                  {/* BODY + ACTIONS: completely gone when collapsed */}
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
                              backgroundColor: "#f9fafb",
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
                                border: "1px solid #9ca3af",
                                backgroundColor: "white",
                                color: "#374151",
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
                            backgroundColor: "#f9fafb",
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
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "1.25rem 1.5rem",
              borderRadius: "10px",
              minWidth: "280px",
              maxWidth: "90vw",
              boxShadow:
                "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: "0.5rem",
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              Delete template?
            </h3>
            <p
              style={{
                margin: 0,
                marginBottom: "0.75rem",
                fontSize: "0.9rem",
                color: "#4b5563",
              }}
            >
              {confirmDeleteTitle
                ? `Are you sure you want to delete “${confirmDeleteTitle}”?`
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
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
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
