const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const databaseName = "vocabMemo";
const usersCollectionName = "users";
const defaultSetName = "Test Ninjas SAT Vocabulary";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmedLine.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, equalsIndex).trim();
    const value = trimmedLine.slice(equalsIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function setupUserSchema() {
  loadEnvLocal();

  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI. Add it to .env.local first.");
  }

  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    const db = client.db(databaseName);
    const collections = await db
      .listCollections({ name: usersCollectionName })
      .toArray();

    if (collections.length === 0) {
      await db.createCollection(usersCollectionName);
    }

    const usersCollection = db.collection(usersCollectionName);
    const users = await usersCollection.find({}).toArray();

    for (const user of users) {
      const migratedUsername =
        user.username?.toLowerCase() || String(user._id).toLowerCase();
      const existingStudyProgress = Array.isArray(user.studyProgress)
        ? user.studyProgress
        : [
            {
              setName: defaultSetName,
              setId: null,
              currentIndex: 0,
              wrongCards: [],
              lastStudiedAt: new Date()
            }
          ];
      const migratedStudyProgress = existingStudyProgress.map((progress) => {
        if (Array.isArray(progress.wrongCards)) {
          return progress;
        }

        if (!Array.isArray(progress.wrongIndices)) {
          return progress;
        }

        const { wrongIndices, ...progressWithoutWrongIndices } = progress;

        return {
          ...progressWithoutWrongIndices,
          wrongCards: wrongIndices.map((index) => ({
            index,
            wrongCount: 1,
            lastWrongAt: progress.lastStudiedAt || null
          }))
        };
      });

      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            name: user.name || user.displayName || migratedUsername,
            username: migratedUsername,
            email: user.email?.toLowerCase() || `${migratedUsername}@example.invalid`,
            passwordHash: user.passwordHash || null,
            authProvider: user.authProvider || "local",
            studyProgress: migratedStudyProgress,
            updatedAt: new Date()
          },
          $unset: {
            displayName: ""
          }
        },
        {
          bypassDocumentValidation: true
        }
      );
    }

    await db.command({
      collMod: usersCollectionName,
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["name", "username", "email", "passwordHash"],
          properties: {
            name: {
              bsonType: "string",
              description: "User's full or display name."
            },
            username: {
              bsonType: "string",
              description: "User's login-style name."
            },
            email: {
              bsonType: "string",
              description: "User's email address."
            },
            passwordHash: {
              bsonType: ["string", "null"],
              description: "Hashed password. Never store plain text passwords."
            },
            authProvider: {
              bsonType: "string",
              description: "Example: local, google, github."
            },
            studyProgress: {
              bsonType: "array",
              items: {
                bsonType: "object",
                required: ["setName", "currentIndex"],
                properties: {
                  setName: { bsonType: "string" },
                  setId: { bsonType: ["objectId", "string", "null"] },
                  currentIndex: { bsonType: "int" },
                  wrongCards: {
                    bsonType: "array",
                    items: {
                      bsonType: "object",
                      required: ["index", "wrongCount"],
                      properties: {
                        index: { bsonType: "int" },
                        wrongCount: { bsonType: "int" },
                        lastWrongAt: { bsonType: ["date", "null"] }
                      }
                    }
                  },
                  lastStudiedAt: { bsonType: "date" }
                }
              }
            },
            createdAt: { bsonType: "date" },
            updatedAt: { bsonType: "date" }
          }
        }
      },
      validationLevel: "moderate"
    });

    await db.collection(usersCollectionName).updateMany(
      {},
      {
        $unset: {
          activeStudy: "",
          displayName: ""
        }
      }
    );

    await usersCollection.createIndex(
      { username: 1 },
      {
        unique: true,
        name: "unique_username"
      }
    );

    await usersCollection.createIndex(
      { email: 1 },
      {
        unique: true,
        name: "unique_email"
      }
    );

    console.log(`Created or updated ${usersCollectionName} schema.`);
  } finally {
    await client.close();
  }
}

setupUserSchema().catch((error) => {
  console.error(error);
  process.exit(1);
});
