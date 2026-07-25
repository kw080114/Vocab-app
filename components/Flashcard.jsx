import SessionSummary from "./SessionSummary";

export default function Flashcard({
  modeLabel,
  currentEntry,
  currentIndex,
  totalCards,
  correctCount,
  wrongCount,
  percentCorrect,
  currentUser,
  missedCount,
  showDefinition,
  reviewDecisionCard,
  onRevealDefinition,
  onCorrect,
  onWrong,
  onRemoveReviewCard,
  onKeepReviewCard,
  onChangeMode,
  onLogOut
}) {
  return (
    <main className="page">
      <section className="card">
        <SessionSummary
          modeLabel={modeLabel}
          currentIndex={currentIndex}
          totalCards={totalCards}
          correctCount={correctCount}
          wrongCount={wrongCount}
          percentCorrect={percentCorrect}
          currentUser={currentUser}
          missedCount={missedCount}
        />

        <p className="label">{currentEntry.setName || "Current word"}</p>
        <h1>{currentEntry.word}</h1>
        <p className="part-of-speech">{currentEntry.partOfSpeech}</p>

        {showDefinition ? (
          <div className="definition">
            <p>{currentEntry.definition}</p>
            <p className="example">{currentEntry.example}</p>
          </div>
        ) : (
          <p className="definition hidden">Definition hidden</p>
        )}

        {reviewDecisionCard ? (
          <div className="review-decision">
            <p>
              You got this missed card correct. Remove it from your missed list?
            </p>
            <div className="buttons">
              <button className="correct" onClick={onRemoveReviewCard}>
                Remove from Missed
              </button>
              <button className="secondary" onClick={onKeepReviewCard}>
                Keep for Review
              </button>
            </div>
          </div>
        ) : null}

        <div className="buttons">
          <button className="reveal" onClick={onRevealDefinition}>
            {showDefinition ? "Hide Definition" : "Reveal Definition"}
          </button>
          <button
            className="correct"
            onClick={onCorrect}
            disabled={Boolean(reviewDecisionCard)}
          >
            Correct
          </button>
          <button
            className="wrong"
            onClick={onWrong}
            disabled={Boolean(reviewDecisionCard)}
          >
            Wrong
          </button>
          <button className="secondary" onClick={onChangeMode}>
            Change Mode
          </button>
          <button className="secondary" onClick={onLogOut}>
            Log Out
          </button>
        </div>
      </section>
    </main>
  );
}
