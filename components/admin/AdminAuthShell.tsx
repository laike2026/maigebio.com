export default function AdminAuthShell({ children }: { children: React.ReactNode }) {
  return <main className="admin-auth-shell">
    <section className="admin-auth-story" aria-label="MAIGE 管理中心">
      <div className="admin-auth-story-brand"><img src="/images/brand/maige-horizontal.png" alt="MAIGE" /><span>管理中心</span></div>
      <div className="admin-auth-story-copy">
        <span className="admin-auth-kicker">MAIGE BIOSCIENCE</span>
        <h2>让每一次协作<br />都清晰有序。</h2>
        <p>产品、内容与客户信息，在这里统一管理。</p>
      </div>
      <div className="admin-auth-story-footer"><span className="admin-auth-story-mark" aria-hidden="true"><i /><i /><i /></span><span>专业 · 可靠 · 高效</span></div>
    </section>
    <section className="admin-auth-entry">
      <div className="admin-auth-entry-inner">
        <div className="admin-auth-mobile-brand"><img src="/images/brand/maige-horizontal.png" alt="MAIGE" /><span>管理中心</span></div>
        {children}
        <p className="admin-auth-copyright">© MAIGE Bioscience</p>
      </div>
    </section>
  </main>;
}
