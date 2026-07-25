export default function SessionSummary({
  modeLabel,
  currentIndex,
  totalCards,
  correctCount,
  wrongCount,
  percentCorrect,
  currentUser,
  missedCount
}) {
  return (
    <>
      <p className="score">
        {modeLabel} | Card {currentIndex + 1} of {totalCards} | Correct:{" "}
        {correctCount} | Wrong: {wrongCount} | Score: {percentCorrect}%
      </p>
      <p className="saved-progress">
        {currentUser.name || currentUser.username} | Previously wrong in
        this set: {missedCount}
      </p>
    </>
  );
}
