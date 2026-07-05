import { NextResponse } from "next/server";
import { getMongoDatabase } from "../../../lib/mongodb";

export async function GET(request) {
  try {
    const databaseName = "vocabMemo";
    const collectionName = "vocabEntries";
    const { searchParams } = new URL(request.url);
    const setName = searchParams.get("setName");

    const db = await getMongoDatabase(databaseName);
    const query = setName ? { setName } : {};

    const entries = await db
      .collection(collectionName)
      .find(query)
      .sort({ setName: 1, sourceOrder: 1, word: 1 })
      .project({
        _id: 0,
        setId: 1,
        setName: 1,
        sourceOrder: 1,
        word: 1,
        definition: 1,
        example: 1,
        partOfSpeech: 1,
        difficulty: 1
      })
      .toArray();

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Failed to load vocab entries:", error);

    return NextResponse.json(
      { message: "Failed to load vocab entries." },
      { status: 500 }
    );
  }
}
