import { Link } from "react-router-dom";
import type { ReactNode } from "react";

type PageShellProps = {
  children: ReactNode;
};

export function PageShell({ children }: PageShellProps) {
  return (
    <>
      <nav className="scanner-shell" aria-label="作業メニューへ戻る">
        <div className="scanner-panel">
          <Link className="btn secondary" to="/">
            メニューへ戻る
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
}
