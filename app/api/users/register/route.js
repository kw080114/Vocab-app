import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getMongoDatabase } from "../../../../lib/mongodb";

const databaseName = "vocabMemo";
const usersCollectionName = "users";
const defaultSetName = "Test Ninjas SAT Vocabulary";

function cleanUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function defaultStudyProgress() {
  const now = new Date();

  return [
    {
      setName: defaultSetName,
      setId: null,
      currentIndex: 0,
      wrongCards: [],
      lastStudiedAt: now
    }
  ];
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = body.name?.trim();
    const username = body.username?.trim().toLowerCase();
    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";

    if (!name || !username || !email || !password) {
      return NextResponse.json(
        { message: "Name, username, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const db = await getMongoDatabase(databaseName);
    const usersCollection = db.collection(usersCollectionName);
    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "A user with that username or email already exists." },
        { status: 409 }
      );
    }

    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 12);
    const newUser = {
      name,
      username,
      email,
      passwordHash,
      authProvider: "local",
      studyProgress: defaultStudyProgress(),
      createdAt: now,
      updatedAt: now
    };

    const result = await usersCollection.insertOne(newUser);
    const savedUser = await usersCollection.findOne({ _id: result.insertedId });

    return NextResponse.json(cleanUser(savedUser), { status: 201 });
  } catch (error) {
    console.error("Failed to register user:", error);

    return NextResponse.json(
      { message: "Failed to register user." },
      { status: 500 }
    );
  }
}
