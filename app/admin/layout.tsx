import type { Metadata } from "next";
import "./admin.css";
import "./admin-redesign.css";

export const metadata: Metadata = { title: "MAIGE 管理后台", robots: { index: false, follow: false } };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN"><body className="admin-body">{children}</body></html>;
}
