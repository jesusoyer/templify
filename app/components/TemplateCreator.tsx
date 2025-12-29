import React from "react";

type TemplateCreatorProps = {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  darkMode: boolean;
};

export default function TemplateCreator({
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSubmit,
  darkMode,
}: TemplateCreatorProps) {
  const cardBg = darkMode ? "#020617" : "white";
  const borderBase = darkMode ? "#1d4ed8" : "#bfdbfe";
  const accent = "#3b82f6";
  const textColor = darkMode ? "#e5e7eb" : "#111827";
  const inputBg = darkMode ? "#020617" : "white";
  const inputBorder = darkMode ? "#475569" : "#ccc";

  return (
    <section
      style={{
        width: "100%",
        padding: "1rem",

        // explicit border, no shorthand
        borderTopStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderRightStyle: "solid",

        borderTopWidth: "3px",
        borderBottomWidth: "3px",
        borderLeftWidth: "1px",
        borderRightWidth: "1px",

        borderTopColor: accent,
        borderBottomColor: accent,
        borderLeftColor: borderBase,
        borderRightColor: borderBase,

        borderRadius: "10px",
        backgroundColor: cardBg,
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.18)",
      }}
    >
      <h2
        style={{
          fontSize: "1.1rem",
          fontWeight: 600,
          marginBottom: "0.75rem",
          marginTop: 0,
          color: textColor,
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
          <label
            htmlFor="title"
            style={{ fontWeight: 500, color: textColor }}
          >
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
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: textColor,
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
          <label
            htmlFor="body"
            style={{ fontWeight: 500, color: textColor }}
          >
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
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: textColor,
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
            backgroundColor: "#2563eb", // blue save button
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
