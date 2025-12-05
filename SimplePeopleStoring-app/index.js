const express = require('express');
const { authMiddleware, adminOnly } = require('./controllers/authControl');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const crudRouter = require('./crud.routes');
const testRouter = require('./test.routes');
const { BASE_DIR, q } = require('./helpers.js')

app.disable('x-powered-by');
app.use(cookieParser());

// === Setting up important consts ===
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SECRET = process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

// === Security boot features ===
app.set('trust proxy', 1);
if (!SECRET) {console.error('Missing JWT_SECRET'); process.exit(1);}
// === Middleware ===
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// === Static Files ===
app.use(express.static(path.join(BASE_DIR, 'public')));

// === Rate limit, anti ddos ===
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100 // max 100 requests per 15 minutes
}));
const loginLimiter = rateLimit({windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false});

// === HTML Routes ===
app.get('/', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/index.html')));
app.get('/register', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/register.html')));
app.get('/signin', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/signin.html')));
app.get('/profile', authMiddleware, (req, res) => {res.sendFile(path.join(BASE_DIR, 'views', 'profile.html'));});
app.get('/admin-panel', authMiddleware, adminOnly, (req, res) => {res.sendFile(path.join(BASE_DIR,'views', 'admin.html'));});
app.get('/test', authMiddleware, (req, res) => {res.sendFile(path.join(BASE_DIR,'views', 'test.html'));});

// === /login Route ===
app.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const results = await q(`SELECT * FROM Users WHERE email = ?`, [email]);
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Identifiants non valides' });
    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Identifiants non valides' });
    const stillTest = await q('SELECT COUNT(*) as testNum FROM TestAttempts as TA INNER JOIN Users as U ON U.id=TA.user_id WHERE U.email=?', [email]);
    const token = jwt.sign({id: user.id, email: user.email, name: user.name, is_admin: user.is_admin }, SECRET, { expiresIn: '2h' });
    res.cookie('token', token, {httpOnly: true, secure: IS_PROD, sameSite: 'Strict', maxAge: 2 * 60 * 60 * 1000 }); //2h
    console.log(stillTest[0].testNum);
    if (stillTest[0].testNum<=26 && !user.is_admin){
      redirectTo = '/test';
    } else if (user.is_admin){
      redirectTo = '/admin-panel';
    } else {
      redirectTo = '/profile';
    }
    return res.json({ success: true, redirectTo, user: { email: user.email, name: user.name, sec: user.is_admin} });
  } catch (e) {
    console.error('Login error: ', e);
    res.status(500).json({succes: false, message: 'Server Error . . .'})
  }
});
app.post('/logout', (req,res) => {
  res.clearCookie('token', {httpOnly: true, secure: IS_PROD, sameSite: 'Strict', path: '/'});
  res.json({success: true});
});


// === Admin full sql api ===
app.post('/api/admin-panel', authMiddleware, adminOnly, async (req, res) => {
  try{
    const results = await q(`
    SELECT 
        id, name, fname, email, city, permis, mobile, vehicule, postal, date_inscription, birth, status, tags, skills,
        ROUND(AVG(TestAttempts.score)) AS gen_score
      FROM Users
      LEFT JOIN TestAttempts ON Users.id = TestAttempts.user_id
      GROUP BY Users.id
    ;`);
    if (results.length === 0) return res.status(404).json({ success: false, message: 'No users found . . .'});
    res.json({ success: true, users: results});
  } catch (e) {
    console.error('Admin-panel Error: ', e);
    res.status(500).json({success: false, message: "DB Error . . ."});
  }
});
// === Single user profile access (admin) ===
app.post('/api/user-profile/:id', authMiddleware, adminOnly, async (req, res) => {
  try{
    const userId = req.params.id;
    const results = await q ('SELECT * FROM Users WHERE id = ?', [userId]);
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: results[0] });
  } catch (e) {
    console.error('Admin profile fetch Error: ', e);
    res.status(500).json({ success: false, message: 'DB Error . . .' });
  }
});
// === Only accessible by authenticated admins ===
app.post('/api/admin/student/:email', authMiddleware, adminOnly, async (req, res) => {
  try{
    const email = decodeURIComponent(req.params.email);
    const results = await q('SELECT * FROM Users WHERE email = ?', [email]);
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, student: results[0] });
  } catch (e) {
    console.error('Admin profile fetch Error: ', e);
    res.status(500).json({ success: false, message: 'DB Error . . .' });
  }
});
// === Update students (admin) ===
app.post('/api/admin/update-student', authMiddleware, adminOnly, async (req, res) => {
  try{
    const {email, name, fname, tel, birth, addr, city, permis, vehicule, mobile, postal, tags, skills, status} = req.body;
    await q('UPDATE Users SET name=?, fname=?, tel=?, birth=?, addr=?, city=?, permis=?, vehicule=?, mobile=?, postal=?, tags=?, skills=?, status=? WHERE email=?',
    [name, fname, tel, birth, addr, city, permis, vehicule, mobile, postal, JSON.stringify(tags), JSON.stringify(skills), status, email]);
    res.json({ success: true });
  } catch (e) {
    console.error('Database Update Error: ', e);
    res.status(500).json({success: false, message: 'DB Error . . .'});
  }
});
// === Update status from list (admin) ===
app.post('/api/admin/update-status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { id, status } = req.body;
    await q('UPDATE Users SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Database Update Error: ', e);
    res.status(500).json({success: false, message: 'DB Error . . .'});
  }
});

app.use(crudRouter);
app.use(testRouter);
// === Global error handler ===
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});
// === Fallback route ===
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});
// === Start Server ===
app.listen(PORT, HOST, () => {
  console.log(`:D Server running at http://${HOST}:${PORT}`);
});