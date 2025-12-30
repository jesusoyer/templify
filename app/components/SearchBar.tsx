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

  const handleClear = () => {
    onSearchChange("");
  };

  return (
    <section
      style={{
        width: "100%",
        padding: "0.75rem 1rem",

        borderTopStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderRightStyle: "solid",

        borderTopWidth: "2px",
        borderBottomWidth: "2px",
        borderLeftWidth: "1px",
        borderRightWidth: "1px",

        borderTopColor: accent,
        borderBottomColor: accent,
        borderLeftColor: borderBase,
        borderRightColor: borderBase,

        borderRadius: "10px",
        backgroundColor: cardBg,
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)",
        marginBottom: "0.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
        }}
      >
        {/* Label row with Clear Search Bar right next to it */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",          // keeps them close together
          }}
        >
          <label
            htmlFor="search"
            style={{ fontWeight: 500, color: textColor, fontSize: "0.95rem" }}
          >
            Search templates
          </label>

          {search.trim().length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: "999px",
                border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`,
                backgroundColor: darkMode ? "#020617" : "white",
                color: textColor,
                fontSize: "0.8rem",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Clear Search Bar
            </button>
          )}
        </div>

        {/* Input below */}
        <input
          id="search"
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Type to search titles across all boards..."
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            border: `1px solid ${inputBorder}`,
            backgroundColor: inputBg,
            color: textColor,
          }}
        />
      </div>
    </section>
  );
}
