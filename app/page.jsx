"use client";

import { useEffect, useState } from "react";

const defaultSetName = "Test Ninjas SAT Vocabulary";

function getLatestProgress(studyProgress) {
  return (
    [...(studyProgress || [])]
      .sort((first, second) => {
        return (
          new Date(second.lastStudiedAt || 0) -
          new Date(first.lastStudiedAt || 0)
        );
      })
      .at(0) || null
  );
}

function normalizeWrongCards(progress) {
  if (Array.isArray(progress?.wrongCards)) {
    return progress.wrongCards;
  }

  if (Array.isArray(progress?.wrongIndices)) {
    return progress.wrongIndices.map((index) => ({
      index,
      wrongCount: 1,
      lastWrongAt: progress.lastStudiedAt || null
    }));
  }

  return [];
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [allEntries, setAllEntries] = useState([]);
  const [vocabList, setVocabList] = useState([]);
  const [currentProgress, setCurrentProgress] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [studyMode, setStudyMode] = useState("");
  const [showDefinition, setShowDefinition] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedWrongCards, setSavedWrongCards] = useState([]);
  const [reviewDecisionCard, setReviewDecisionCard] = useState(null);

  useEffect(function loadSavedBetaUser() {
    const savedUser = window.localStorage.getItem("vocabMemoBetaUser");

    if (!savedUser) {
      setIsLoading(false);
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    setUsername(parsedUser.username || "");
    setEmail(parsedUser.email || "");
    loadUserAndSet(parsedUser);
  }, []);

  async function loadUserAndSet(user) {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const progressUrl = new URL("/api/users/progress", window.location.origin);
      progressUrl.searchParams.set("username", user.username);
      progressUrl.searchParams.set("email", user.email);

      const progressResponse = await fetch(progressUrl);

      if (!progressResponse.ok) {
        throw new Error("Could not load your saved study progress.");
      }

      const userWithProgress = await progressResponse.json();
      const latestProgress = getLatestProgress(userWithProgress.studyProgress);
      const activeSetName = latestProgress?.setName || defaultSetName;
      const entriesUrl = new URL("/api/entries", window.location.origin);
      entriesUrl.searchParams.set("setName", activeSetName);

      const entriesResponse = await fetch(entriesUrl);

      if (!entriesResponse.ok) {
        throw new Error("The server could not load vocab entries.");
      }

      const entries = await entriesResponse.json();
      const entriesWithStudyIndex = entries.map((entry, index) => ({
        ...entry,
        studyIndex: index
      }));

      setCurrentUser(userWithProgress);
      setAllEntries(entriesWithStudyIndex);
      setVocabList([]);
      setCurrentProgress(latestProgress);
      setSavedWrongCards(normalizeWrongCards(latestProgress));
      setStudyMode("");
      setCurrentIndex(0);
    setShowDefinition(false);
    setReviewDecisionCard(null);
    setCorrectCount(0);
    setWrongCount(0);
    } catch (error) {
      setCurrentUser(null);
      window.localStorage.removeItem("vocabMemoBetaUser");
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();

    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          email
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed.");
      }

      const user = await response.json();
      window.localStorage.setItem(
        "vocabMemoBetaUser",
        JSON.stringify({
          username: user.username,
          email: user.email
        })
      );

      await loadUserAndSet(user);
    } catch (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  }

  function logOut() {
    window.localStorage.removeItem("vocabMemoBetaUser");
    setCurrentUser(null);
    setAllEntries([]);
    setVocabList([]);
    setCurrentProgress(null);
    setCurrentIndex(0);
    setStudyMode("");
    setSavedWrongCards([]);
    setCorrectCount(0);
    setWrongCount(0);
    setShowDefinition(false);
    setReviewDecisionCard(null);
    setErrorMessage("");
  }

  function resetSessionCounters() {
    setCorrectCount(0);
    setWrongCount(0);
    setShowDefinition(false);
    setReviewDecisionCard(null);
  }

  function startContinueMode() {
    const savedIndex = currentProgress?.currentIndex ?? 0;

    setStudyMode("continue");
    setVocabList(allEntries);
    setCurrentIndex(savedIndex < allEntries.length ? savedIndex : 0);
    resetSessionCounters();
  }

  function startReviewMissedMode() {
    const missedEntries = savedWrongCards
      .map((wrongCard) => allEntries[wrongCard.index])
      .filter(Boolean);

    setStudyMode("review");
    setVocabList(missedEntries);
    setCurrentIndex(0);
    resetSessionCounters();
  }

  async function startOverMode() {
    const setName = currentProgress?.setName || defaultSetName;

    await saveProgress({
      setName,
      nextProgressIndex: 0,
      wrongIndex: null
    });

    setCurrentProgress({
      ...(currentProgress || {}),
      setName,
      currentIndex: 0
    });
    setStudyMode("continue");
    setVocabList(allEntries);
    setCurrentIndex(0);
    resetSessionCounters();
  }

  function revealDefinition() {
    setShowDefinition(!showDefinition);
  }

  function updateLocalWrongCards(wrongIndex) {
    const now = new Date().toISOString();
    const existingWrongCard = savedWrongCards.find(
      (wrongCard) => wrongCard.index === wrongIndex
    );

    if (!existingWrongCard) {
      setSavedWrongCards([
        ...savedWrongCards,
        {
          index: wrongIndex,
          wrongCount: 1,
          lastWrongAt: now
        }
      ]);
      return;
    }

    setSavedWrongCards(
      savedWrongCards.map((wrongCard) => {
        if (wrongCard.index !== wrongIndex) {
          return wrongCard;
        }

        return {
          ...wrongCard,
          wrongCount: wrongCard.wrongCount + 1,
          lastWrongAt: now
        };
      })
    );
  }

  async function saveProgress({ setName, nextProgressIndex, wrongIndex }) {
    if (!currentUser) {
      return;
    }

    try {
      const response = await fetch("/api/users/progress", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: currentUser.username,
          email: currentUser.email,
          setName,
          currentIndex: nextProgressIndex,
          wrongIndex
        })
      });

      if (response.ok) {
        const savedProgress = await response.json();
        setCurrentProgress(savedProgress.studyProgress);
      }
    } catch (error) {
      console.error("Could not save progress yet:", error);
    }
  }

  async function removeWrongCardFromProgress(studyIndex) {
    const setName = currentProgress?.setName || defaultSetName;
    const nextVocabList = vocabList.filter(
      (entry) => entry.studyIndex !== studyIndex
    );

    setSavedWrongCards(
      savedWrongCards.filter((wrongCard) => wrongCard.index !== studyIndex)
    );
    setVocabList(nextVocabList);
    setCurrentIndex((previousIndex) => {
      if (nextVocabList.length === 0) {
        return 0;
      }

      return Math.min(previousIndex, nextVocabList.length - 1);
    });

    try {
      const response = await fetch("/api/users/progress", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username: currentUser.username,
          email: currentUser.email,
          setName,
          currentIndex: currentProgress?.currentIndex ?? 0,
          removeWrongIndex: studyIndex
        })
      });

      if (response.ok) {
        const savedProgress = await response.json();
        setCurrentProgress(savedProgress.studyProgress);
      }
    } catch (error) {
      console.error("Could not remove missed card yet:", error);
    }
  }

  function moveToNextCard() {
    if (vocabList.length <= 1) {
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex((currentIndex + 1) % vocabList.length);
  }

  async function removeReviewCard() {
    await removeWrongCardFromProgress(reviewDecisionCard.studyIndex);
    setReviewDecisionCard(null);
    setShowDefinition(false);
  }

  function keepReviewCard() {
    setReviewDecisionCard(null);
    setShowDefinition(false);
    moveToNextCard();
  }

  function recordAnswer(wasCorrect) {
    const currentEntry = vocabList[currentIndex];
    const nextDeckIndex = (currentIndex + 1) % vocabList.length;
    const nextProgressIndex =
      studyMode === "continue"
        ? nextDeckIndex
        : currentProgress?.currentIndex ?? 0;

    if (wasCorrect) {
      setCorrectCount(correctCount + 1);

      if (studyMode === "review") {
        setReviewDecisionCard(currentEntry);
        return;
      }
    } else {
      setWrongCount(wrongCount + 1);
      updateLocalWrongCards(currentEntry.studyIndex);
    }

    saveProgress({
      setName: currentEntry.setName,
      nextProgressIndex,
      wrongIndex: wasCorrect ? null : currentEntry.studyIndex
    });
    setCurrentIndex(nextDeckIndex);
    setShowDefinition(false);
  }

  if (isLoading) {
    return <main className="page">Loading vocab entries...</main>;
  }

  if (!currentUser) {
    return (
      <main className="page">
        <section className="card login-card">
          <p className="label">Beta Login</p>
          <h1 className="login-title">Vocab Memo</h1>
          <p className="login-help">
            Enter the username and email from the beta user document you added in
            MongoDB.
          </p>

          <form className="login-form" onSubmit={handleLogin}>
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="demo-student"
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@example.com"
              />
            </label>

            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

            <button className="reveal" type="submit">
              Log In
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (allEntries.length === 0) {
    return <main className="page">No vocab entries found yet.</main>;
  }

  if (!studyMode) {
    const savedIndex = currentProgress?.currentIndex ?? 0;

    return (
      <main className="page">
        <section className="card mode-card">
          <p className="label">{currentProgress?.setName || defaultSetName}</p>
          <h1 className="mode-title">Welcome back</h1>
          <p className="login-help">
            Choose how you want to study today.
          </p>

          <div className="mode-summary">
            <span>Saved card: {Math.min(savedIndex + 1, allEntries.length)} of {allEntries.length}</span>
            <span>Missed cards: {savedWrongCards.length}</span>
          </div>

          <div className="buttons">
            <button className="reveal" onClick={startContinueMode}>
              Continue
            </button>
            <button
              className="wrong"
              onClick={startReviewMissedMode}
              disabled={savedWrongCards.length === 0}
            >
              Review Missed
            </button>
            <button className="correct" onClick={startOverMode}>
              Start Over
            </button>
            <button className="secondary" onClick={logOut}>
              Log Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (vocabList.length === 0) {
    return (
      <main className="page">
        <section className="card mode-card">
          <p className="label">Review complete</p>
          <h1 className="mode-title">Nice work</h1>
          <p className="login-help">
            There are no cards left in this study mode.
          </p>
          <div className="buttons">
            <button className="reveal" onClick={() => setStudyMode("")}>
              Choose Another Mode
            </button>
            <button className="secondary" onClick={logOut}>
              Log Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  const currentEntry = vocabList[currentIndex];
  const totalAnswers = correctCount + wrongCount;
  const percentCorrect =
    totalAnswers === 0 ? 0 : Math.round((correctCount / totalAnswers) * 100);
  const modeLabel = studyMode === "review" ? "Review Missed" : "Continue";

  return (
    <main className="page">
      <section className="card">
        <p className="score">
          {modeLabel} | Card {currentIndex + 1} of {vocabList.length} | Correct:{" "}
          {correctCount} | Wrong: {wrongCount} | Score: {percentCorrect}%
        </p>
        <p className="saved-progress">
          {currentUser.displayName || currentUser.username} | Previously wrong in
          this set: {savedWrongCards.length}
        </p>

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
              <button className="correct" onClick={removeReviewCard}>
                Remove from Missed
              </button>
              <button className="secondary" onClick={keepReviewCard}>
                Keep for Review
              </button>
            </div>
          </div>
        ) : null}

        <div className="buttons">
          <button className="reveal" onClick={revealDefinition}>
            {showDefinition ? "Hide Definition" : "Reveal Definition"}
          </button>
          <button
            className="correct"
            onClick={() => recordAnswer(true)}
            disabled={Boolean(reviewDecisionCard)}
          >
            Correct
          </button>
          <button
            className="wrong"
            onClick={() => recordAnswer(false)}
            disabled={Boolean(reviewDecisionCard)}
          >
            Wrong
          </button>
          <button className="secondary" onClick={() => setStudyMode("")}>
            Change Mode
          </button>
          <button className="secondary" onClick={logOut}>
            Log Out
          </button>
        </div>
      </section>
    </main>
  );
}
