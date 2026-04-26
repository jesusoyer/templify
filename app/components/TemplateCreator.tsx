import React from "react";

type TemplateCreatorProps = {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAddToBoardClick: () => void;
  darkMode: boolean;
  currentBoardName: string;
  onHide: () => void; // closes the creator
};

export default function TemplateCreator({
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSubmit,
  onAddToBoardClick,
  darkMode,
  currentBoardName,
  onHide,
}: TemplateCreatorProps) {
  const cardBg = darkMode ? "#020617" : "white";
  const borderBase = darkMode ? "#1d4ed8" : "#bfdbfe";
  const accent = "#3b82f6";
  const textColor = darkMode ? "#e5e7eb" : "#111827";
  const inputBg = darkMode ? "#020617" : "white";
  const inputBorder = darkMode ? "#475569" : "#ccc";

  const trimmedBoardName = currentBoardName?.trim() || "Home";
  const isHome =
    trimmedBoardName.toLowerCase() === "home" ||
    trimmedBoardName.toLowerCase() === "home board";

  const primaryButtonLabel = isHome
    ? "Save to Default Home Board"
    : `Save to ${trimmedBoardName}`;

  return (
    <section
      style={{
        width: "100%",
        padding: "1rem",
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
        position: "relative",
      }}
    >
      {/* Header row: title + Hide Creator button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            margin: 0,
            color: textColor,
          }}
        >
          Create New Template
        </h2>

        <button
          type="button"
          onClick={onHide}
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid #fca5a5",
            backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5",
            color: darkMode ? "#fca5a5" : "#dc2626",
            fontSize: "0.78rem",
            fontWeight: 500,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ✕ Close Creator
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label htmlFor="title" style={{ fontWeight: 500, color: textColor }}>
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Write a title with keywords for easy search"
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: textColor,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label htmlFor="body" style={{ fontWeight: 500, color: textColor }}>
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

        {/* Buttons row */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="submit"
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {primaryButtonLabel}
          </button>

          <button
            type="button"
            onClick={onAddToBoardClick}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`,
              backgroundColor: darkMode ? "#020617" : "white",
              color: textColor,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Add to custom board…
          </button>
        </div>
      </form>
    </section>
  );
}