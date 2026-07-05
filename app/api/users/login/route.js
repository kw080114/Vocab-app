import { NextResponse } from "next/server";
import { getMongoDatabase } from "../../../../lib/mongodb";

const databaseName = "vocabMemo";
const usersCollectionName = "users";
const defaultSetName = "Test Ninjas SAT Vocabulary";

function cleanUser(user) {
  if (!user) {
    return null;
  }

  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function defaultProgress() {
  const now = new Date();

  return {
    studyProgress: [
      {
        setName: defaultSetName,
        setId: null,
        currentIndex: 0,
        wrongCards: [],
        lastStudiedAt: now
      }
    ],
    updatedAt: now
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const username = body.username?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!username || !email) {
      return NextResponse.json(
        { message: "Username and email are required." },
        { status: 400 }
      );
    }

    const db = await getMongoDatabase(databaseName);
    const usersCollection = db.collection(usersCollectionName);

    const user = await usersCollection.findOne({ username, email });

    if (!user) {
      return NextResponse.json(
        { message: "No beta user found with that username and email." },
        { status: 404 }
      );
    }

    if (!user.displayName || !Array.isArray(user.studyProgress)) {
      const progressDefaults = defaultProgress();
      const fieldsToUpdate = {
        updatedAt: new Date()
      };

      if (!user.displayName) {
        fieldsToUpdate.displayName = username;
      }

      if (!Array.isArray(user.studyProgress)) {
        fieldsToUpdate.studyProgress = progressDefaults.studyProgress;
      }

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: fieldsToUpdate
        }
      );
    }

    const updatedUser = await usersCollection.findOne({ _id: user._id });

    return NextResponse.json(cleanUser(updatedUser));
  } catch (error) {
    console.error("Failed to log in beta user:", error);

    return NextResponse.json(
      { message: "Failed to log in beta user." },
      { status: 500 }
    );
  }
}
