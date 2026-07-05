# Tiny MongoDB Seed Data

Use these documents for manual inserts in MongoDB Atlas.

## vocabSets

```json
[
  {
    "name": "SAT Unit 1",
    "description": "Common SAT vocabulary words",
    "tags": ["SAT", "Reading"]
  },
  {
    "name": "Geometry Terms",
    "description": "Important geometry vocabulary",
    "tags": ["Math", "Geometry"]
  }
]
```

## vocabWords

```json
[
  {
    "word": "acute",
    "synonyms": ["sharp", "severe", "intense"],
    "antonyms": ["mild"],
    "defaultDifficulty": 2
  },
  {
    "word": "ambiguous",
    "synonyms": ["unclear", "vague"],
    "antonyms": ["clear"],
    "defaultDifficulty": 2
  },
  {
    "word": "benevolent",
    "synonyms": ["kind", "charitable"],
    "antonyms": ["cruel"],
    "defaultDifficulty": 2
  },
  {
    "word": "obtuse",
    "synonyms": ["dull", "blunt"],
    "antonyms": ["sharp"],
    "defaultDifficulty": 2
  }
]
```

## vocabEntries

Replace `setId` and `wordId` with the real ObjectId values from your inserted
`vocabSets` and `vocabWords` documents.

```json
[
  {
    "setId": "SAT Unit 1 set _id goes here",
    "wordId": "acute word _id goes here",
    "word": "acute",
    "definition": "sharp, intense, or severe",
    "example": "The student felt acute pressure before the exam.",
    "partOfSpeech": "adjective",
    "difficulty": 2,
    "tags": ["SAT", "emotion"]
  },
  {
    "setId": "SAT Unit 1 set _id goes here",
    "wordId": "ambiguous word _id goes here",
    "word": "ambiguous",
    "definition": "unclear or having more than one meaning",
    "example": "The instructions were ambiguous.",
    "partOfSpeech": "adjective",
    "difficulty": 2,
    "tags": ["SAT", "reading"]
  },
  {
    "setId": "SAT Unit 1 set _id goes here",
    "wordId": "benevolent word _id goes here",
    "word": "benevolent",
    "definition": "kindly or charitable",
    "example": "The benevolent donor paid for the students' books.",
    "partOfSpeech": "adjective",
    "difficulty": 2,
    "tags": ["SAT", "character"]
  },
  {
    "setId": "Geometry Terms set _id goes here",
    "wordId": "acute word _id goes here",
    "word": "acute",
    "definition": "measuring less than 90 degrees",
    "example": "An acute angle is smaller than a right angle.",
    "partOfSpeech": "adjective",
    "difficulty": 1,
    "tags": ["Math", "Geometry"]
  },
  {
    "setId": "Geometry Terms set _id goes here",
    "wordId": "obtuse word _id goes here",
    "word": "obtuse",
    "definition": "measuring more than 90 degrees and less than 180 degrees",
    "example": "An obtuse angle is wider than a right angle.",
    "partOfSpeech": "adjective",
    "difficulty": 1,
    "tags": ["Math", "Geometry"]
  }
]
```

## users

For beta testing, manually insert a simple user like this in MongoDB Compass:

```json
{
  "username": "beta-student",
  "email": "student@example.com"
}
```

When this user logs in, the app will add default study progress for the
`Test Ninjas SAT Vocabulary` set.

The app stores missed cards like this:

```json
"wrongCards": [
  {
    "index": 4,
    "wrongCount": 2,
    "lastWrongAt": "2026-06-27T00:00:00.000Z"
  }
]
```

# Beginner Data Flow

The app loads cards in this order:

MongoDB `vocabEntries` collection -> Next.js API route -> `fetch` -> React state -> flashcard UI

That means:

1. MongoDB stores the study data.
2. The API route asks MongoDB for the vocab entries.
3. The frontend uses `fetch` to call that API route.
4. React stores the returned entries in `useState`.
5. The flashcard UI reads from state and shows the current word.

# Why vocabEntries Is The Main Study Collection

`vocabWords` stores global information about a word, but a word can mean
different things in different vocab sets.

For studying, the exact card is:

`word + vocab set + definition`

That is why `vocabEntries` is the main collection for flashcards. It tells the
app which meaning of the word belongs to which set.

# Student Check Questions

1. Why can the same word have different definitions in different sets?
2. What does `vocabEntries` store?
3. What does the API route do?
4. Why does the frontend use `fetch`?
5. Why do we use `useState`?
