const Election = require("../models/election");

async function runElectionTimeUpdater() {
  const now = new Date();
  // Added for debugging
  // console.log('runElectionTimeUpdater tick at', now.toISOString());

  try {
    // Auto-start
    // Start elections that are scheduled/draft whose startTime <= now and endTime > now
    const startFilter = {
      status: { $in: ["draft", "scheduled"] },
      startTime: { $lte: now },
      endTime: { $gt: now },
    };

    //bulk update status only
    const startResult = await Election.updateMany(startFilter, {
      $set: { status: "ongoing" },
      // we'll only set startedAt if it's not set already in a separate step below
    });

    // Added for debugging
    // console.log(`auto-start: matched ${startResult.matchedCount || startResult.n} / modified ${startResult.modifiedCount || startResult.nModified}`);

    // set startedAt = startTime for docs where startedAt is null
    const startedAtResult = await Election.updateMany(
      {
        status: "ongoing", // status after first update
        startedAt: null,
      },
      [{ $set: { startedAt: "$startTime" } }],
    );

    if (startedAtResult) {
      // Added for debugging
      // console.log('startedAt set for', startedAtResult.modifiedCount || startedAtResult.nModified);
    } else {
      // load docs and set startedAt per document
      const toStartDocs = await Election.find({
        ...startFilter,
        startedAt: null,
      }).select("_id startTime");
      if (toStartDocs.length) {
        const bulkOps = toStartDocs.map((d) => ({
          updateOne: {
            filter: { _id: d._id, startedAt: null }, // double-check still null
            update: { $set: { startedAt: d.startTime } },
          },
        }));
        const res = await Election.bulkWrite(bulkOps);
        // Added for debugging
        //console.log('fallback startedAt set count:', (res.modifiedCount || res.nModified || 0));
      }
    }

    // Auto-close (bulk)
    const closeFilter = {
      status: { $ne: "closed" },
      endTime: { $lte: now },
    };

    const closeResult = await Election.updateMany(closeFilter, {
      $set: { status: "closed" },
    });

    // Added for debugging
    // console.log(`auto-close: matched ${closeResult.matchedCount || closeResult.n} / modified ${closeResult.modifiedCount || closeResult.nModified}`);

    // Set closedAt = endTime where closedAt is null
    const closedAtResult = await Election.updateMany(
      {
        status: "closed", // status after first update
        closedAt: null,
      },
      [{ $set: { closedAt: "$endTime" } }],
    );

    if (closedAtResult) {
      // Added for debugging
      // console.log('closedAt set for', closedAtResult.modifiedCount || closedAtResult.nModified);
    } else {
      // fallback: per-doc bulk
      const toCloseDocs = await Election.find({
        ...closeFilter,
        closedAt: null,
      }).select("_id endTime");
      if (toCloseDocs.length) {
        const bulkOps = toCloseDocs.map((d) => ({
          updateOne: {
            filter: { _id: d._id, closedAt: null },
            update: { $set: { closedAt: d.endTime } },
          },
        }));
        const res = await Election.bulkWrite(bulkOps);
        // Added for debugging
        // console.log('fallback closedAt set count:', (res.modifiedCount || res.nModified || 0));
      }
    }
  } catch (err) {
    console.error("runElectionTimeUpdater error:", err);
  }
}

module.exports = { runElectionTimeUpdater };
