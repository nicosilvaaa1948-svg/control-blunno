const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

initializeApp();
const db = getFirestore();
const bucket = getStorage().bucket();
const COLLECTIONS = [
  "periods","providers","invoices","cash","expenses","investments","employees","hours",
  "employeeDebts","liquidations","tasks","closures","files","imports","audit","settings","agentChats"
];

exports.purgeBlunnoTrash = onSchedule({ schedule: "every 24 hours", timeZone: "America/Argentina/Cordoba", region: "southamerica-east1" }, async () => {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  for (const name of COLLECTIONS) {
    const snap = await db.collection(name).where("deleted", "==", true).limit(400).get();
    if (snap.empty) continue;
    const expired = snap.docs.filter(doc => {
      const d = doc.data();
      const deletedAt = d.deletedAt?.toDate ? d.deletedAt.toDate() : new Date(d.deletedAt || 0);
      return deletedAt <= cutoff;
    });
    if (!expired.length) continue;
    const batch = db.batch();
    for (const doc of expired) {
      const data = doc.data();
      if (name === "files" && data.storagePath) {
        try { await bucket.file(data.storagePath).delete({ ignoreNotFound: true }); } catch (e) { console.error("Storage purge", data.storagePath, e); }
      }
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
});
