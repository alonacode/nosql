// queries/part2_queries.js
// Запуск: mongosh "$MONGO_URI" --file queries/part2_queries.js

use("spotify");

// ─── Завдання 1: Треки для вечірки ─────────────────────────────────────────
print("\n=== Завдання 1: Треки для вечірки ===");

const partyFilter = {
  "audio_features.danceability": { $gte: 0.7 },
  "audio_features.energy": { $gte: 0.7 },
  duration_ms: { $gte: 180000, $lte: 300000 }
};

const partyTracks = db.tracks.find(
  partyFilter,
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    "audio_features.danceability": 1,
    "audio_features.energy": 1,
    duration_ms: 1
  }
).limit(10).toArray();

print(`Знайдено треків: ${db.tracks.countDocuments(partyFilter)}`);
print("Перші 10:");
printjson(partyTracks);

// ─── Завдання 2: Виконавці, у яких усі треки популярні ─────────────────────
print("\n=== Завдання 2: Топ-20 виконавців з популярними треками ===");

const popularArtists = db.tracks.aggregate([
  { $unwind: "$artists" },
  {
    $group: {
      _id: "$artists",
      track_count: { $sum: 1 },
      min_popularity: { $min: "$popularity" },
      avg_popularity: { $avg: "$popularity" }
    }
  },
  {
    $match: {
      track_count: { $gte: 3 },
      min_popularity: { $gte: 60 }
    }
  },
  { $sort: { avg_popularity: -1 } },
  { $limit: 20 },
  {
    $project: {
      _id: 0,
      artist: "$_id",
      track_count: 1,
      min_popularity: 1,
      avg_popularity: { $round: ["$avg_popularity", 1] }
    }
  }
]).toArray();

printjson(popularArtists);

// ─── Завдання 3: Нетипові треки за темпом ──────────────────────────────────
print("\n=== Завдання 3: Нетипові треки (tempo > mean + 2*stdDev) по жанрах ===");

const outliers = db.tracks.aggregate([
  {
    $group: {
      _id: "$track_genre",
      avg_tempo: { $avg: "$audio_features.tempo" },
      std_tempo: { $stdDevPop: "$audio_features.tempo" }
    }
  },
  {
    $addFields: {
      outlier_threshold: {
        $add: ["$avg_tempo", { $multiply: ["$std_tempo", 2] }]
      }
    }
  },
  {
    $lookup: {
      from: "tracks",
      let: { genre: "$_id", threshold: "$outlier_threshold" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ["$track_genre", "$$genre"] },
                { $gt: ["$audio_features.tempo", "$$threshold"] }
              ]
            }
          }
        },
        {
          $project: {
            _id: 1,
            track_name: 1,
            popularity: 1,
            artists: 1,
            audio_features: { tempo: "$audio_features.tempo" }
          }
        }
      ],
      as: "outlier_tracks"
    }
  },
  { $match: { "outlier_tracks.0": { $exists: true } } },
  {
    $project: {
      _id: 0,
      genre: "$_id",
      avg_tempo: { $round: ["$avg_tempo", 0] },
      outlier_threshold: { $round: ["$outlier_threshold", 1] },
      outlier_tracks: 1
    }
  },
  { $sort: { genre: 1 } }
]).toArray();

printjson(outliers);

// ─── Завдання 4: Треки для фонової роботи ──────────────────────────────────
print("\n=== Завдання 4: Треки для фонової роботи ===");

const focusFilter = {
  "audio_features.loudness": { $lt: -10 },
  "audio_features.speechiness": { $lt: 0.1 },
  "audio_features.instrumentalness": { $gt: 0.5 },
  explicit: false
};

const focusTracks = db.tracks.find(
  focusFilter,
  {
    _id: 0,
    track_name: 1,
    artists: 1,
    "audio_features.loudness": 1,
    "audio_features.speechiness": 1,
    "audio_features.instrumentalness": 1
  }
).limit(10).toArray();

print(`Знайдено треків: ${db.tracks.countDocuments(focusFilter)}`);
print("Перші 10:");
printjson(focusTracks);
