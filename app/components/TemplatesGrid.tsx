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
  if (!templates || templates.length === 0) {
    return <p style={{ color: "#6b7280" }}>No templates saved yet.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      }}
    >
      {templates.map((template) => {
        const isEditing = editingId === template.id;

        return (
          <article
            key={template.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              padding: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              backgroundColor: "white",
            }}
          >
            {isEditing ? (
              <>
                {/* Editable title */}
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => onChangeEditingTitle(e.target.value)}
                  style={{
                    padding: "0.4rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    fontWeight: 600,
                  }}
                />

                {/* Editable body */}
                <textarea
                  rows={5}
                  value={editingBody}
                  onChange={(e) => onChangeEditingBody(e.target.value)}
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
              <>
                {/* Read-only title */}
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    wordBreak: "break-word",
                  }}
                >
                  {template.title}
                </h2>

                {/* Read-only body */}
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

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onCopy(template.body)}
                    style={{
                      flex: 1,
                      padding: "0.4rem 0.75rem",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: "#2563eb",
                      color: "white",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    Copy body
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartEdit(template)}
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #d97706",
                      backgroundColor: "white",
                      color: "#b45309",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(template.id)}
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #ef4444",
                      backgroundColor: "white",
                      color: "#b91c1c",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
