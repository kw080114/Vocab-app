"use client";

import { useEffect, useState } from "react";
import BetaLoginForm from "../components/BetaLoginForm";
import Flashcard from "../components/Flashcard";
import SetLibrary from "../components/SetLibrary";
import StudyModeMenu from "../components/StudyModeMenu";

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
  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  useEffect(function loadSavedUser() {
    const savedUser = window.localStorage.getItem("vocabMemoUser");

    if (!savedUser) {
      setIsLoading(false);
      return;
    }

    const parsedUser = JSON.parse(savedUser);
    setName(parsedUser.name || "");
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
      window.localStorage.removeItem("vocabMemoUser");
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    try {
      setIsLoading(true);
      setErrorMessage("");

      const isRegistering = authMode === "register";
      const response = await fetch(
        isRegistering ? "/api/users/register" : "/api/users/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(
            isRegistering
              ? {
                  name,
                  username,
                  email,
                  password
                }
              : {
                  identifier: username,
                  password
                }
          )
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Authentication failed.");
      }

      const user = await response.json();
      window.localStorage.setItem(
        "vocabMemoUser",
        JSON.stringify({
          name: user.name,
          username: user.username,
          email: user.email
        })
      );
      setName(user.name || "");
      setUsername(user.username || "");
      setEmail(user.email || "");
      setPassword("");

      await loadUserAndSet(user);
    } catch (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  }

  function logOut() {
    window.localStorage.removeItem("vocabMemoUser");
    setCurrentUser(null);
    setAuthMode("login");
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
    setPassword("");
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
      <BetaLoginForm
        authMode={authMode}
        name={name}
        username={username}
        email={email}
        password={password}
        errorMessage={errorMessage}
        onAuthModeChange={setAuthMode}
        onNameChange={setName}
        onUsernameChange={setUsername}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  if (allEntries.length === 0) {
    return (
      <SetLibrary
        label="No cards"
        title="No vocab entries found yet."
        message=""
      />
    );
  }

  if (!studyMode) {
    const savedIndex = currentProgress?.currentIndex ?? 0;

    return (
      <StudyModeMenu
        setName={currentProgress?.setName || defaultSetName}
        savedIndex={savedIndex}
        totalCards={allEntries.length}
        missedCount={savedWrongCards.length}
        onContinue={startContinueMode}
        onReviewMissed={startReviewMissedMode}
        onStartOver={startOverMode}
        onLogOut={logOut}
      />
    );
  }

  if (vocabList.length === 0) {
    return (
      <SetLibrary
        label="Review complete"
        title="Nice work"
        message="There are no cards left in this study mode."
      >
        <div className="buttons">
          <button className="reveal" onClick={() => setStudyMode("")}>
            Choose Another Mode
          </button>
          <button className="secondary" onClick={logOut}>
            Log Out
          </button>
        </div>
      </SetLibrary>
    );
  }

  const currentEntry = vocabList[currentIndex];
  const totalAnswers = correctCount + wrongCount;
  const percentCorrect =
    totalAnswers === 0 ? 0 : Math.round((correctCount / totalAnswers) * 100);
  const modeLabel = studyMode === "review" ? "Review Missed" : "Continue";

  return (
    <Flashcard
      modeLabel={modeLabel}
      currentEntry={currentEntry}
      currentIndex={currentIndex}
      totalCards={vocabList.length}
      correctCount={correctCount}
      wrongCount={wrongCount}
      percentCorrect={percentCorrect}
      currentUser={currentUser}
      missedCount={savedWrongCards.length}
      showDefinition={showDefinition}
      reviewDecisionCard={reviewDecisionCard}
      onRevealDefinition={revealDefinition}
      onCorrect={() => recordAnswer(true)}
      onWrong={() => recordAnswer(false)}
      onRemoveReviewCard={removeReviewCard}
      onKeepReviewCard={keepReviewCard}
      onChangeMode={() => setStudyMode("")}
      onLogOut={logOut}
    />
  );
}
