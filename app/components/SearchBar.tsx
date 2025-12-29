export default function SearchBar({ search, onSearchChange }) {
  return (
   <section
  style={{
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    backgroundColor: "white",
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)", // 👈 slightly lighter shadow
  }}
>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}
      >
        <label htmlFor="search" style={{ fontWeight: 500 }}>
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
            border: "1px solid #ccc",
          }}
        />
      </div>
    </section>
  );
}
