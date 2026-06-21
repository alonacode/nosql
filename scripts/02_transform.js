// scripts/02_transform.js
// Запуск: mongosh "$MONGO_URI" --file scripts/02_transform.js
//
// Перетворюємо плоску колекцію tracks_raw у документоорієнтовану схему tracks:
//   - аудіохарактеристики ховаємо у вкладений обʼєкт audio_features
//   - рядок виконавців розбиваємо у масив artists
//   - додаємо обчислювані поля duration_sec та popularity_tier

const sdb = db.getSiblingDB("spotify");

sdb.tracks.drop();

sdb.tracks_raw.aggregate([
  {
    $project: {
      _id: 1,
      track_id: 1,
      track_name: 1,
      album_name: 1,
      explicit: 1,
      popularity: 1,
      duration_ms: 1,
      track_genre: 1,

      // Два можливих формати: "['A1', 'A2']" або "A1; A2"
      artists: {
        $cond: {
          if: { $or: [{ $eq: ["$artists", null] }, { $eq: ["$artists", ""] }] },
          then: [],
          else: {
            $let: {
              vars: { raw: "$artists" },
              in: {
                $cond: {
                  if: { $eq: [{ $substrCP: ["$$raw", 0, 2] }, "['"] },
                  then: {
                    $map: {
                      input: {
                        $split: [
                          { $substrCP: ["$$raw", 2, { $subtract: [{ $strLenCP: "$$raw" }, 4] }] },
                          "', '",
                        ],
                      },
                      as: "name",
                      in: { $trim: { input: "$$name" } },
                    },
                  },
                  else: {
                    $map: {
                      input: { $split: ["$$raw", "; "] },
                      as: "name",
                      in: { $trim: { input: "$$name" } },
                    },
                  },
                },
              },
            },
          },
        },
      },

      audio_features: {
        danceability: "$danceability",
        energy: "$energy",
        loudness: "$loudness",
        speechiness: "$speechiness",
        acousticness: "$acousticness",
        instrumentalness: "$instrumentalness",
        liveness: "$liveness",
        valence: "$valence",
        tempo: "$tempo",
        key: "$key",
        mode: "$mode",
        time_signature: "$time_signature",
      },

      duration_sec: { $round: [{ $divide: ["$duration_ms", 1000] }, 1] },

      popularity_tier: {
        $switch: {
          branches: [
            { case: { $gte: ["$popularity", 70] }, then: "high" },
            { case: { $gte: ["$popularity", 40] }, then: "medium" },
          ],
          default: "low",
        },
      },
    },
  },
  { $out: "tracks" },
]);

print("Документів у tracks: " + sdb.tracks.countDocuments({}));
print("Приклад документа:");
printjson(sdb.tracks.findOne());
