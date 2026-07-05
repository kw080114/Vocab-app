import { NextResponse } from "next/server";
import { getMongoDatabase } from "../../../../lib/mongodb";

const databaseName = "vocabMemo";
const usersCollectionName = "users";
const defaultSetName = "Test Ninjas SAT Vocabulary";

function safeProjection() {
  return {
    projection: {
      passwordHash: 0
    }
  };
}

function getProgressForSet(user, setName) {
  return user.studyProgress?.find((progress) => progress.setName === setName);
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get("username");
    const email = searchParams.get("email")?.toLowerCase();

    if (!username || !email) {
      return NextResponse.json(
        { message: "Username and email are required." },
        { status: 400 }
      );
    }

    const db = await getMongoDatabase(databaseName);
    const usersCollection = db.collection(usersCollectionName);
    const user = await usersCollection.findOne(
      { username, email },
      safeProjection()
    );

    if (!user) {
      return NextResponse.json(
        { message: "No beta user found with that username and email." },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Failed to load user progress:", error);

    return NextResponse.json(
      { message: "Failed to load user progress." },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();
    const setName = body.setName || defaultSetName;
    const currentIndex = Number(body.currentIndex) || 0;
    const wrongIndex = Number.isInteger(body.wrongIndex) ? body.wrongIndex : null;
    const removeWrongIndex = Number.isInteger(body.removeWrongIndex)
      ? body.removeWrongIndex
      : null;
    const now = new Date();

    if (!username || !email) {
      return NextResponse.json(
        { message: "Username and email are required." },
        { status: 400 }
      );
    }

    const db = await getMongoDatabase(databaseName);
    const usersCollection = db.collection(usersCollectionName);
    const existingUser = await usersCollection.findOne({ username, email });

    if (!existingUser) {
      return NextResponse.json(
        { message: "No beta user found with that username and email." },
        { status: 404 }
      );
    }

    const existingProgress = existingUser.studyProgress || [];
    const progressForSet = getProgressForSet(existingUser, setName);
    const wrongCardsByIndex = new Map(
      normalizeWrongCards(progressForSet).map((wrongCard) => [
        wrongCard.index,
        wrongCard
      ])
    );

    if (wrongIndex !== null) {
      const existingWrongCard = wrongCardsByIndex.get(wrongIndex);

      wrongCardsByIndex.set(wrongIndex, {
        index: wrongIndex,
        wrongCount: (existingWrongCard?.wrongCount || 0) + 1,
        lastWrongAt: now
      });
    }

    if (removeWrongIndex !== null) {
      wrongCardsByIndex.delete(removeWrongIndex);
    }

    const nextProgressForSet = {
      setName,
      setId: progressForSet?.setId || null,
      currentIndex,
      wrongCards: [...wrongCardsByIndex.values()].sort(
        (first, second) => first.index - second.index
      ),
      lastStudiedAt: now
    };

    const nextStudyProgress = [
      ...existingProgress.filter((progress) => progress.setName !== setName),
      nextProgressForSet
    ];

    await usersCollection.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          studyProgress: nextStudyProgress,
          updatedAt: now
        }
      }
    );

    return NextResponse.json({
      studyProgress: nextProgressForSet
    });
  } catch (error) {
    console.error("Failed to save user progress:", error);

    return NextResponse.json(
      { message: "Failed to save user progress." },
      { status: 500 }
    );
  }
}
