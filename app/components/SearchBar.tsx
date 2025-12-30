import React from "react";

type Board = {
  id: string;
  name: string;
};

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  darkMode: boolean;

  // NEW: search scope
  boards: Board[];
  searchScopeBoardId: string; // "all" or a board.id
  onSearchScopeChange: (boardId: string) => void;
};

export default function SearchBar({
  search,
  onSearchChange,
  darkMode,
  boards,
  searchScopeBoardId,
  onSearchScopeChange,
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

        // explicit border, no shorthand
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
          gap: "0.4rem",
        }}
      >
        {/* Label + Clear button row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            justifyContent: "space-between",
          }}
        >
          <label
            htmlFor="search"
            style={{
              fontWeight: 500,
              color: textColor,
              fontSize: "0.95rem",
            }}
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

        {/* Search input */}
        <input
          id="search"
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Type to search titles..."
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            border: `1px solid ${inputBorder}`,
            backgroundColor: inputBg,
            color: textColor,
          }}
        />

        {/* Search scope: All boards or specific board */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            color: darkMode ? "#9ca3af" : "#4b5563",
          }}
        >
          <span>Search in:</span>
          <select
            value={searchScopeBoardId}
            onChange={(e) => onSearchScopeChange(e.target.value)}
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "999px",
              border: "1px solid #9ca3af",
              backgroundColor: darkMode ? "#020617" : "white",
              color: textColor,
              fontSize: "0.8rem",
            }}
          >
            <option value="all">All boards</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
