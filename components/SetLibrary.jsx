export default function SetLibrary({ label, title, message, children }) {
  return (
    <main className="page">
      <section className="card mode-card">
        <p className="label">{label}</p>
        <h1 className="mode-title">{title}</h1>
        <p className="login-help">{message}</p>
        {children}
      </section>
    </main>
  );
}
