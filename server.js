const express = require('express'), multer = require('multer'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const app = express(), PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'manjit@123'; // CHANGE THIS
const DB = path.join(__dirname, 'data.json'), UP = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UP, { recursive: true });
const U = id => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;
const seed = {
  gallery: [
    ['photo-1519741497674-611481863552','Wedding'],['photo-1511285560929-80b456fea0bc','Wedding'],
    ['photo-1537633552985-df8429e8048b','Wedding'],['photo-1606216794074-735e91aa2c92','Pre-Wedding'],
    ['photo-1583939003579-730e3918a45a','Pre-Wedding'],['photo-1465495976277-4387d4b0b4c6','Wedding'],
    ['photo-1522673607200-164d1b6ce486','Events'],['photo-1529636798458-92182e662485','Portrait']
  ].map(([id, cat], i) => ({ id: 's' + i, url: U(id), category: cat })),
  reviews: [
    ['Simran & Arjun','Manjit captured our wedding like a movie. Every emotion is in the frames!',5],
    ['Harpreet Kaur','Super professional and so friendly. Our pre-wedding shoot turned out stunning.',5],
    ['Gurpreet Sandhu','Video edit was cinematic. Delivered on time and the whole family loved it.',5],
    ['Navneet & Riya','Best photographer in the area. Candid shots were beyond our expectations.',5],
    ['Amandeep Brar','Great quality, great price and great vibes on the day. Highly recommended!',4]
  ].map(([name, text, rating], i) => ({ id: 'r' + i, name, text, rating, date: new Date().toISOString() })),
  inquiries: []
};
if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify(seed, null, 2));
const load = () => JSON.parse(fs.readFileSync(DB)), save = d => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
const tokens = new Set();
const auth = (req, res, next) => tokens.has(req.headers['x-token']) ? next() : res.status(401).json({ error: 'Unauthorized' });
const upload = multer({
  storage: multer.diskStorage({ destination: UP, filename: (q, f, cb) => cb(null, Date.now() + path.extname(f.originalname).toLowerCase()) }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (q, f, cb) => cb(null, /^image\//.test(f.mimetype))
});
const clean = (s, n = 500) => String(s || '').trim().slice(0, n);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', (req, res) => {
  if (req.body.password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const t = crypto.randomBytes(24).toString('hex'); tokens.add(t); res.json({ token: t });
});
app.get('/api/gallery', (q, res) => res.json(load().gallery));
app.post('/api/gallery', auth, upload.array('images', 20), (req, res) => {
  const d = load(), cat = clean(req.body.category, 30) || 'Wedding';
  (req.files || []).forEach(f => d.gallery.unshift({ id: crypto.randomUUID(), url: '/uploads/' + f.filename, category: cat }));
  save(d); res.json({ ok: true });
});
app.delete('/api/gallery/:id', auth, (req, res) => {
  const d = load(), img = d.gallery.find(g => g.id === req.params.id);
  if (img && img.url.startsWith('/uploads/')) fs.unlink(path.join(UP, path.basename(img.url)), () => {});
  d.gallery = d.gallery.filter(g => g.id !== req.params.id); save(d); res.json({ ok: true });
});
app.get('/api/reviews', (q, res) => res.json(load().reviews));
app.post('/api/reviews', (req, res) => {
  const name = clean(req.body.name, 60), text = clean(req.body.text, 400), rating = Math.min(5, Math.max(1, +req.body.rating || 5));
  if (!name || !text) return res.status(400).json({ error: 'Name and review required' });
  const d = load(); d.reviews.unshift({ id: crypto.randomUUID(), name, text, rating, date: new Date().toISOString() });
  save(d); res.json({ ok: true });
});
app.delete('/api/reviews/:id', auth, (req, res) => { const d = load(); d.reviews = d.reviews.filter(r => r.id !== req.params.id); save(d); res.json({ ok: true }); });
app.post('/api/inquiries', (req, res) => {
  const b = req.body, name = clean(b.name, 60), phone = clean(b.phone, 20);
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' });
  const d = load();
  d.inquiries.unshift({ id: crypto.randomUUID(), name, phone, email: clean(b.email, 80), eventType: clean(b.eventType, 40), eventDate: clean(b.eventDate, 20), message: clean(b.message, 1000), date: new Date().toISOString() });
  save(d); res.json({ ok: true });
});
app.get('/api/inquiries', auth, (q, res) => res.json(load().inquiries));
app.delete('/api/inquiries/:id', auth, (req, res) => { const d = load(); d.inquiries = d.inquiries.filter(i => i.id !== req.params.id); save(d); res.json({ ok: true }); });

app.listen(PORT, () => console.log(`Site: http://localhost:${PORT}  |  Admin: http://localhost:${PORT}/admin.html`));
