import { MongoClient } from "mongodb";

// This file creates one reusable MongoDB connection for the whole app.
// In development, Next.js can reload files often. Without caching, the app
// might open too many database connections.

const uri = process.env.MONGODB_URI;

const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  // globalThis keeps the cached promise alive across hot reloads in development.
  if (uri && !globalThis._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalThis._mongoClientPromise = client.connect();
  }

  clientPromise = globalThis._mongoClientPromise;
} else if (uri) {
  // In production, create the connection promise normally.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getMongoClient() {
  if (!uri) {
    throw new Error("Please add MONGODB_URI to your .env.local file.");
  }

  return clientPromise;
}

export async function getMongoDatabase(databaseName) {
  const connectedClient = await getMongoClient();
  return connectedClient.db(databaseName);
}
