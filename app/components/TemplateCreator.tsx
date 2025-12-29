export default function TemplateCreator({
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSubmit,
}) {
  return (
    <section
      style={{
        width: "100%",
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "white",
      }}
    >
      {/* New header inside the card */}
      <h2
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          marginBottom: "0.75rem",
        }}
      >
        Create New Template
      </h2>

      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <label htmlFor="title" style={{ fontWeight: 500 }}>
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Welcome email, Bug report template..."
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          <label htmlFor="body" style={{ fontWeight: 500 }}>
            Template body
          </label>
          <textarea
            id="body"
            rows={5}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder="Write the text you want to reuse..."
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid #ccc",
              resize: "vertical",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            padding: "0.6rem 1rem",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#111827",
            color: "white",
            fontWeight: 500,
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          Save template
        </button>
      </form>
    </section>
  );
}
