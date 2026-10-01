const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

initializeApp();

exports.submitSurvey = onRequest({ region: 'asia-southeast1', cors: true, maxInstances: 2, timeoutSeconds: 30 }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  const body = req.body || {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id || '') ||
      !body.building || !body.floor || !body.room || !body.createdAt ||
      !['Phần cứng', 'Máy chiếu', 'Điều hòa', 'Điện', 'Nội thất'].includes(body.category) ||
      !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) {
    return res.status(400).json({ error: 'Invalid survey' });
  }
  try {
    const ref = getFirestore().collection('surveys').doc(body.id);
    if ((await ref.get()).exists) return res.status(200).json({ id: body.id, duplicate: true });
    const survey = { ...body, status: 'SYNCED', receivedAt: new Date().toISOString() };
    if (survey.photo) {
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(survey.photo);
      if (!match) return res.status(400).json({ error: 'Invalid photo' });
      const bytes = Buffer.from(match[2], 'base64');
      if (bytes.length > 5_000_000) return res.status(413).json({ error: 'Photo too large' });
      const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
      const object = getStorage().bucket().file(`surveys/${body.id}.${extension}`);
      await object.save(bytes, { contentType: `image/${match[1]}`, resumable: false });
      survey.photo = null;
      survey.photoPath = object.name;
    }
    await ref.create(survey).catch(error => { if (error.code !== 6) throw error; });
    return res.status(200).json({ id: body.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Unable to save survey' });
  }
});
