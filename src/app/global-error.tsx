"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          color: "#e4e4e7",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: "#71717a", marginBottom: 24 }}>
            {error.message || "A critical error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              background: "#34d399",
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
