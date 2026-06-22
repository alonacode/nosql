// queries/part4_indexes.js
// Запуск: mongosh "$MONGO_URI" --file queries/part4_indexes.js

use("spotify");

// ─── Завдання 1: Аналіз запиту та індексація ────────────────────────────────

print("\n=== Завдання 1: explain() ДО індексу ===");

const beforeIndex = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");

printjson({
  stage: beforeIndex.queryPlanner.winningPlan.stage,
  totalDocsExamined: beforeIndex.executionStats.totalDocsExamined,
  totalKeysExamined: beforeIndex.executionStats.totalKeysExamined,
  executionTimeMillis: beforeIndex.executionStats.executionTimeMillis,
  nReturned: beforeIndex.executionStats.nReturned
});

print("\n=== Створення індексу ===");

db.tracks.createIndex(
  {
    track_genre: 1,
    popularity: -1,
    "audio_features.danceability": 1
  },
  { name: "genre_danceability_popularity" }
);

print("Індекс 'genre_danceability_popularity' створено.");

print("\n=== Завдання 1: explain() ПІСЛЯ індексу ===");

const afterIndex = db.tracks.find({
  track_genre: "pop",
  "audio_features.danceability": { $gte: 0.7 }
}).sort({ popularity: -1 }).explain("executionStats");

printjson({
  stage: afterIndex.queryPlanner.winningPlan.stage,
  inputStageStage: afterIndex.queryPlanner.winningPlan.inputStage?.stage,
  indexName: afterIndex.queryPlanner.winningPlan.inputStage?.indexName,
  totalDocsExamined: afterIndex.executionStats.totalDocsExamined,
  totalKeysExamined: afterIndex.executionStats.totalKeysExamined,
  executionTimeMillis: afterIndex.executionStats.executionTimeMillis,
  nReturned: afterIndex.executionStats.nReturned
});

// ─── Завдання 2: Індекс для полів фонової роботи ────────────────────────────

print("\n=== Завдання 2: Індекс для пошуку фонової музики ===");

db.tracks.createIndex(
  {
    explicit: 1,
    "audio_features.instrumentalness": 1,
    "audio_features.speechiness": 1
  },
  { name: "work_music_index" }
);

print("Індекс 'work_music_index' створено.");

const workExplain = db.tracks.find({
  explicit: false,
  "audio_features.instrumentalness": { $gt: 0.5 },
  "audio_features.speechiness": { $lt: 0.1 }
}).explain("executionStats");

printjson({
  stage: workExplain.queryPlanner.winningPlan.stage,
  inputStageStage: workExplain.queryPlanner.winningPlan.inputStage?.stage,
  indexName: workExplain.queryPlanner.winningPlan.inputStage?.indexName,
  totalDocsExamined: workExplain.executionStats.totalDocsExamined,
  totalKeysExamined: workExplain.executionStats.totalKeysExamined,
  nReturned: workExplain.executionStats.nReturned
});

// ─── Завдання 3: Аналіз покривного запиту ───────────────────────────────────

print("\n=== Завдання 3: Covered query — explain() ===");

// без проєкції: FETCH, totalDocsExamined > 0
print("\nwithout projection (not covered):");
const coveredExplain = db.tracks.find({
  track_genre: "pop",
  popularity: { $gte: 70 }
}).explain("executionStats");

printjson({
  stage: coveredExplain.queryPlanner.winningPlan.stage,
  inputStageStage: coveredExplain.queryPlanner.winningPlan.inputStage?.stage,
  totalDocsExamined: coveredExplain.executionStats.totalDocsExamined,
  totalKeysExamined: coveredExplain.executionStats.totalKeysExamined,
  nReturned: coveredExplain.executionStats.nReturned
});

// з проєкцією: PROJECTION_COVERED, totalDocsExamined = 0
print("\nwith projection (should be covered):");
const coveredExplain2 = db.tracks.find(
  { track_genre: "pop", popularity: { $gte: 70 } },
  { _id: 0, track_genre: 1, popularity: 1 }
).explain("executionStats");

printjson({
  stage: coveredExplain2.queryPlanner.winningPlan.stage,
  totalDocsExamined: coveredExplain2.executionStats.totalDocsExamined,
  totalKeysExamined: coveredExplain2.executionStats.totalKeysExamined,
  nReturned: coveredExplain2.executionStats.nReturned
});

