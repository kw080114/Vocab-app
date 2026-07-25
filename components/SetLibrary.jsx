export default function SetLibrary({
  label,
  title,
  message,
  sets,
  progressBySetName,
  onSelectSet,
  onLogOut,
  children
}) {
  return (
    <main className="page">
      <section className="card mode-card">
        <p className="label">{label}</p>
        <h1 className="mode-title">{title}</h1>
        {message ? <p className="login-help">{message}</p> : null}

        {sets ? (
          <div className="set-list">
            {sets.map((set) => {
              const progress = progressBySetName?.[set.name];
              const wrongCount = progress?.wrongCards?.length || 0;
              const savedIndex = progress?.currentIndex ?? 0;

              return (
                <button
                  className="set-card"
                  key={set._id || set.name}
                  onClick={() => onSelectSet(set)}
                >
                  <span className="set-card-title">{set.name}</span>
                  <span>{set.description}</span>
                  <span>
                    Saved card: {savedIndex + 1} | Missed cards: {wrongCount}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {children}

        {onLogOut ? (
          <button className="secondary library-logout" onClick={onLogOut}>
            Log Out
          </button>
        ) : null}
      </section>
    </main>
  );
}
