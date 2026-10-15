"use client";
export default function LogoutButton() {
  return <button type="button" className="admin-text-button" onClick={async () => { await fetch("/api/admin/auth/logout", { method: "POST" }); window.location.assign("/admin/login"); }}>退出</button>;
}
