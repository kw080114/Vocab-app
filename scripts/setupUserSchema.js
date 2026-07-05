const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const databaseName = "vocabMemo";
const usersCollectionName = "users";

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
    const usersWithProgress = await usersCollection
      .find({ studyProgress: { $exists: true } })
      .toArray();

    for (const user of usersWithProgress) {
      const migratedStudyProgress = user.studyProgress.map((progress) => {
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
            studyProgress: migratedStudyProgress,
            updatedAt: new Date()
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
          required: ["username", "email"],
          properties: {
            username: {
              bsonType: "string",
              description: "User's login-style name."
            },
            displayName: {
              bsonType: "string",
              description: "Friendly name for the UI."
            },
            email: {
              bsonType: ["string", "null"],
              description: "Optional until registration is added."
            },
            passwordHash: {
              bsonType: ["string", "null"],
              description: "Future hashed password. Never store plain text passwords."
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
          activeStudy: ""
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

    console.log(`Created or updated ${usersCollectionName} schema.`);
  } finally {
    await client.close();
  }
}

setupUserSchema().catch((error) => {
  console.error(error);
  process.exit(1);
});
