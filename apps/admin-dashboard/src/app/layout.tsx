import type { Metadata } from "next";
import { AuthProviderWrapper } from "@/auth/AuthProviderWrapper";

export const metadata: Metadata = {
  title: "物流ERP 管理ダッシュボード",
  description: "物流ERP 管理者向けダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
      </body>
    </html>
  );
}
