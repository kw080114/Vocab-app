const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const databaseName = "vocabMemo";
const entriesCollectionName = "vocabEntries";
const setsCollectionName = "vocabSets";
const setName = "StudyToday SAT Vocab";

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

async function seedStudyTodayVocab() {
  loadEnvLocal();

  if (!process.env.MONGODB_URI) {
    throw new Error("Missing MONGODB_URI. Add it to .env.local first.");
  }

  const dataPath = path.join(process.cwd(), "data", "studytoday-sat-vocab.json");
  const entries = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    const db = client.db(databaseName);
    const setsCollection = db.collection(setsCollectionName);
    const entriesCollection = db.collection(entriesCollectionName);

    const vocabSetResult = await setsCollection.findOneAndUpdate(
      { name: setName },
      {
        $set: {
          name: setName,
          description: "SAT vocabulary imported from the StudyToday spreadsheet.",
          tags: ["SAT", "StudyToday"],
          sourceFile: "studytoday_sat_vocab_500.xlsx",
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      {
        upsert: true,
        returnDocument: "after"
      }
    );

    const vocabSet = vocabSetResult.value ?? vocabSetResult;

    if (!vocabSet) {
      throw new Error("Could not create or find the StudyToday vocab set.");
    }

    const operations = entries.map((entry) => ({
      updateOne: {
        filter: {
          setName,
          sourceOrder: entry.sourceOrder
        },
        update: {
          $set: {
            ...entry,
            setId: vocabSet._id,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        upsert: true
      }
    }));

    const result = await entriesCollection.bulkWrite(operations);

    console.log(`Seeded set: ${setName}`);
    console.log(`Matched existing entries: ${result.matchedCount}`);
    console.log(`Inserted new entries: ${result.upsertedCount}`);
    console.log(`Updated entries: ${result.modifiedCount}`);
  } finally {
    await client.close();
  }
}

seedStudyTodayVocab().catch((error) => {
  console.error(error);
  process.exit(1);
});
