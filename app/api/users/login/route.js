import bcrypt from "bcryptjs";
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
    const identifier = body.identifier?.trim().toLowerCase();
    const username = body.username?.trim().toLowerCase();
    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";

    if ((!identifier && !username && !email) || !password) {
      return NextResponse.json(
        { message: "Username or email and password are required." },
        { status: 400 }
      );
    }

    const db = await getMongoDatabase(databaseName);
    const usersCollection = db.collection(usersCollectionName);

    const user = await usersCollection.findOne(
      identifier
        ? { $or: [{ username: identifier }, { email: identifier }] }
        : { username, email }
    );

    if (!user) {
      return NextResponse.json(
        { message: "No user found with those login details." },
        { status: 404 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        {
          message:
            "This user does not have a password yet. Please register a new account."
        },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return NextResponse.json(
        { message: "Incorrect password." },
        { status: 401 }
      );
    }

    if (!user.name || !Array.isArray(user.studyProgress)) {
      const progressDefaults = defaultProgress();
      const fieldsToUpdate = {
        updatedAt: new Date()
      };

      if (!user.name) {
        fieldsToUpdate.name = user.displayName || user.username;
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
    console.error("Failed to log in user:", error);

    return NextResponse.json(
      { message: "Failed to log in user." },
      { status: 500 }
    );
  }
}
