import type { ReactNode } from "react";

export function Button({
  children,
  ...props
}: { children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      style={{
        padding: "0.5rem 1rem",
        borderRadius: "4px",
        border: "1px solid #ccc",
        cursor: "pointer",
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  ...props
}: { children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{
        padding: "1rem",
        borderRadius: "8px",
        border: "1px solid #eee",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
      {...props}
    >
      {children}
    </div>
  );
}
