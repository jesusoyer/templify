import React from "react";

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  darkMode: boolean;
};

export default function SearchBar({
  search,
  onSearchChange,
  darkMode,
}: SearchBarProps) {
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
        padding: "0.75rem 1rem",

        // ✅ explicit borders per side – NO border/borderWidth/borderColor shorthands
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
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.14)",
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
          htmlFor="search"
          style={{ fontWeight: 500, color: textColor }}
        >
          Search by title
        </label>
        <input
          id="search"
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Start typing to filter templates..."
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            // This is OK: we are NOT using side-specific border props on the input
            border: `1px solid ${inputBorder}`,
            backgroundColor: inputBg,
            color: textColor,
          }}
        />
      </div>
    </section>
  );
}
