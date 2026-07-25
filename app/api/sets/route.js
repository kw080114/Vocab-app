import { NextResponse } from "next/server";
import { getMongoDatabase } from "../../../lib/mongodb";

export async function GET() {
  try {
    const databaseName = "vocabMemo";

    const collectionName = "vocabSets";

    const db = await getMongoDatabase(databaseName);

    const sets = await db
      .collection(collectionName)
      .find({})
      .sort({ name: 1 })
      .project({
        _id: 1,
        name: 1,
        description: 1,
        tags: 1
      })
      .toArray();

    return NextResponse.json(sets);
  } catch (error) {
    console.error("Failed to load vocab sets:", error);

    return NextResponse.json(
      { message: "Failed to load vocab sets." },
      { status: 500 }
    );
  }
}
