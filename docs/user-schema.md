# Users Collection Schema

For now, the app does not have registration or login. We still want a `users`
collection so the database is ready to remember study progress.

## Collection

`users`

## Main Idea

One user document can start small for a beta tester:

```json
{
  "username": "beta-student",
  "email": "student@example.com"
}
```

When that beta user logs in for the first time, the app fills in default study
progress fields.

Over time, one user document stores:

- Basic profile information, like username and display name.
- Future authentication fields, like `passwordHash`.
- Per-set progress, including which cards the user previously got wrong and how
  many times each was missed.

## Example User Document

```json
{
  "_id": "demo-student",
  "username": "demo-student",
  "displayName": "Demo Student",
  "email": null,
  "passwordHash": null,
  "authProvider": "local",
  "studyProgress": [
    {
      "setName": "Test Ninjas SAT Vocabulary",
      "setId": null,
      "currentIndex": 0,
      "wrongCards": [
        {
          "index": 4,
          "wrongCount": 2,
          "lastWrongAt": "2026-06-27T00:00:00.000Z"
        },
        {
          "index": 12,
          "wrongCount": 1,
          "lastWrongAt": "2026-06-27T00:00:00.000Z"
        }
      ],
      "lastStudiedAt": "2026-06-27T00:00:00.000Z"
    }
  ],
  "createdAt": "2026-06-27T00:00:00.000Z",
  "updatedAt": "2026-06-27T00:00:00.000Z"
}
```

## Field Notes

`_id`

For today, we can use a simple string like `"demo-student"`. Later, MongoDB can
generate ObjectIds or an auth system can provide user ids.

`username`

A simple name the user can recognize.

`displayName`

The friendly name shown in the UI.

`email`

Optional now. Useful later for login, password reset, and account recovery.

`passwordHash`

Always store a hashed password, never the plain password. This stays `null`
until real registration is added.

`studyProgress`

This array stores one progress object per vocab set. This matters because later
the same user may study SAT vocab, GRE vocab, and Geometry vocab separately.
The app treats this per-set progress as the source of truth for the card index
and loads the most recently studied set by checking `lastStudiedAt`.

`wrongCards`

These are the card positions inside a specific set that the user got wrong
before. Each object also tracks how many times the user missed that card.

The app uses this for the `Review Missed` mode.

`Start Over`

This resets only `currentIndex` to `0`. It does not erase `wrongCards`, because
missed-card history is useful for review.

Later, storing vocab entry ids would be safer if the set order changes.
