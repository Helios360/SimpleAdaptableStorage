const express = require('express');
const { authMiddleware, adminOnly } = require('./controllers/authControl');
const app = express();
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const crudRouter = require('./crud.routes');
const testRouter = require('./test.routes');
const { BASE_DIR, q, validUser, makeToken } = require('./helpers');
const { sendTo } = require('./mailer');

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
const loginLimiter = rateLimit({windowMs: 10 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false});

// === HTML Routes ===
app.get('/', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/index.html')));
app.get('/register', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/register.html')));
app.get('/signin', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/signin.html')));
app.get('/profile', authMiddleware, (req, res) => {res.sendFile(path.join(BASE_DIR, 'views', 'profile.html'));});
app.get('/admin-panel', authMiddleware, adminOnly, (req, res) => {res.sendFile(path.join(BASE_DIR,'views', 'admin.html'));});
app.get('/test', authMiddleware, (req, res) => {res.sendFile(path.join(BASE_DIR,'views', 'test.html'));});
app.get('/legal', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/legal.html')));
app.get('/reset-password', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/reset-password.html')));

// === /login Route ===
app.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    const results = await q(`SELECT * FROM Users WHERE email = ?`, [email]);
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Identifiants non valides' });
    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Identifiants non valides' });

    let staff_formations = null;
    if(user.is_admin){
      const rows = await q(`SELECT formation_id FROM StaffSettings WHERE staff_user_id = ?`, [user.id]);
      staff_formations = rows.map(r=>Number(r.formation_id));
    }

    const userTypeRows = await q('SELECT F.id FROM Formations F JOIN Users U ON U.formation_id = F.id WHERE U.id = ?', [user.id]);
    const userType = userTypeRows[0]?.id || null;
    const stillTest = await q('SELECT COUNT(*) as testNum FROM TestAttempts as TA INNER JOIN Users as U ON U.id=TA.user_id WHERE U.email=?', [email]);
    const tokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      user_type: userType,
      is_admin: user.is_admin,
      staff_formations
    };
    const token = jwt.sign(tokenPayload, SECRET, { expiresIn: '2h' });
    res.cookie('token', token, {httpOnly: true, secure: IS_PROD, sameSite: 'Strict', maxAge: 2 * 60 * 60 * 1000 }); //2h
    if ((stillTest[0].testNum<=26 && userType==3) || (stillTest[0].testNum<=14 && userType!=3) && !user.is_admin){
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
      u.id, u.name, u.fname, u.email, u.city, u.permis, u.mobile, u.vehicule, u.postal, 
      u.created_at, u.birth, u.status, u.tags, u.skills, f.code as formation_code, f.name as formation_name,
      ROUND(AVG(ta.score)) AS gen_score
    FROM Users u
    JOIN Formations f ON f.id = u.formation_id
    LEFT JOIN TestAttempts ta ON u.id = ta.user_id
    WHERE EXISTS (
      SELECT 1
      FROM StaffSettings ss
      WHERE ss.staff_user_id = ?
      AND ss.formation_id = u.formation_id
    )
    GROUP BY u.id
    ORDER BY u.created_at DESC;
    `, [req.user.id]);
    if (results.length === 0) return res.status(404).json({ success: false, message: 'No users found . . .'});
    res.json({ success: true, users: results });
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
// === Check if user's mail is confirmed (user) ===
app.post('/api/user/valid', authMiddleware, async (req, res) => {
  const result = await validUser(req.body.email);
  if(!result.success) return res.status(404).json({success:false, code:result.code});
  else if(result.code === "NOT_VERIFIED") res.status(403).json({success: false, code:result.code});
  else return res.status(200).json({success:true, code:result.code});
});
// === send verif email to user (user) ===
app.post('/api/user/sendVerif', authMiddleware, async (req, res) => {
  const result = await validUser(req.body.email);
  if (result.code === "NOT_VERIFIED") {
    const {token, tokenHash} = makeToken();
    const expiresAt = new Date(Date.now()+1000*60*60*24);
    await q(`UPDATE Users SET email_verify_token=?, email_verify_expires=? WHERE email=?`, [tokenHash, expiresAt, req.body.email]);
    const verifURL = `${process.env.APP_URL}api/auth/verifMail?token=${token}&email=${encodeURIComponent(req.body.email)}`;
    const content =`
    <h1> Bienvenue sur votre nouvel espace étudiant </h1>
    <p> Pour verifier votre compte</p>
    <a href="${verifURL}">Cliquez-ici</a>
    `
    await sendTo(req.body.email, "Validez votre compte", content);
    return res.status(200).json({success:true});
  }
  return res.status(200).json({success:true});
});
// === verif email when user clicks the mail button (user) ===
app.get("/api/auth/verifMail", async (req, res) => {
  const {token, email} = req.query;
  if (!token || !email) return res.status(400).json({success: false, code: "MISSING_PARAMS"});
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const rows = await q(`SELECT email_verify_token, email_verify_expires FROM Users WHERE email=?`,[email]); 
  if (!rows || rows.length === 0) return res.redirect(`${APP_URL}profile`);
  if (tokenHash === rows[0].email_verify_token && new Date(rows[0].email_verify_expires) > new Date()) {
    await q(`UPDATE Users SET email_verified=1, email_verified_at=NOW(), email_verify_token=NULL, email_verify_expires=NULL WHERE email=?`, [email]);
  } else { return res.status(403).json({success:false, message:"L'identifiant de connexion est éxpiré ou invalide"});}
  return res.redirect(`${process.env.APP_URL}profile`);
});
// === reset password for students (user) ===
app.post('/reset/request', async (req, res) => {
  try{
    const email = (req.body.email || "").trim().toLowerCase();
    const rows = await q(`SELECT id, email FROM Users WHERE email=? LIMIT 1`, [email]);
    if (!rows || rows.length === 0) return res.status(200).json({success: true});
    const {token, tokenHash} = makeToken();
    const expiresAt = new Date(Date.now()+1000*60*60);
    await q(`UPDATE Users SET reset_pwd_token=?, reset_pwd_expires=? WHERE email=?`, [tokenHash, expiresAt, email]);
    const resetPwdURL = `${process.env.APP_URL}reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    const content = `
    <h1> Pour réinitialiser votre mot de passe </h1>
    <p> Cliquez sur le lien ci-dessous (valable 1 heure) :</p>
    <a href="${resetPwdURL}">Cliquez-ici</a>
    `
    await sendTo(email, 'Réinitialisation de mot de passe', content);
    return res.status(200).json({success: true});
  } catch (e) {
    console.error('Mail serving Error: ', e);
    return res.status(200).json({success: true});
  }
});
// === reset password for students (user) ===
app.post('/reset/confirm', async (req, res) => {
  try{
    const email = (req.body.email || "").trim().toLowerCase();
    const token = (req.body.token || "").trim();
    const newPassword = req.body.password || "";
    if (!token || !email || !newPassword) return res.status(400).json({success: false, code: "MISSING_PARAMS"});
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const rows = await q(`SELECT id, reset_pwd_token, reset_pwd_expires FROM Users WHERE email=? LIMIT 1`,[email]); 
    if (!rows || rows.length === 0) return res.status(403).json({success: false, message: "Lien invalide ou éxpiré"});
    if (tokenHash === rows[0].reset_pwd_token && new Date(rows[0].reset_pwd_expires) > new Date()) {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await q(`UPDATE Users SET password=?, reset_pwd_token=NULL, reset_pwd_expires=NULL WHERE email=?`, [passwordHash, email]);
    } else { return res.status(403).json({success:false, message:"L'identifiant de connexion est éxpiré ou invalide"});}
    return res.status(200).json({success:true});
  } catch (e){
    console.error("Reset confirm error: ", e);
    return res.status(500).json({success:false});
  }
});
/*
When a commercial creates an account, the user gets a token and 
the flow is the same as the password reset
so the user is created with
email verified = 0 and status invited or something
i can definitely reuse the reset code, just have to change the texts here and there
*/
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