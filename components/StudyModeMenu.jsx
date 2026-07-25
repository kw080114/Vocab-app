import SetLibrary from "./SetLibrary";

export default function StudyModeMenu({
  setName,
  savedIndex,
  totalCards,
  missedCount,
  onContinue,
  onReviewMissed,
  onStartOver,
  onLogOut
}) {
  return (
    <SetLibrary
      label={setName}
      title="Welcome back"
      message="Choose how you want to study today."
    >
      <div className="mode-summary">
        <span>
          Saved card: {Math.min(savedIndex + 1, totalCards)} of {totalCards}
        </span>
        <span>Missed cards: {missedCount}</span>
      </div>

      <div className="buttons">
        <button className="reveal" onClick={onContinue}>
          Continue
        </button>
        <button
          className="wrong"
          onClick={onReviewMissed}
          disabled={missedCount === 0}
        >
          Review Missed
        </button>
        <button className="correct" onClick={onStartOver}>
          Start Over
        </button>
        <button className="secondary" onClick={onLogOut}>
          Log Out
        </button>
      </div>
    </SetLibrary>
  );
}
