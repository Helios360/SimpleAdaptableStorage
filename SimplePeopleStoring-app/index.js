const express = require('express');
const { formidable } = require('formidable');
const authMiddleware = require('./controllers/authControl');
const adminOnly = require('./controllers/adminOnly');
const app = express();
const path = require('path');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const crypto = require('crypto');
// Helpers
const ALLOWED_MIME = new Set(['application/pdf','image/jpeg','image/png']);
const ALLOWED_EXT = new Set(['.pdf','.jpg','.jpeg','.png']);
const BASE_DIR = path.resolve(process.env.APP_BASE_DIR || __dirname);
const UPLOADS_ROOT = path.resolve(process.env.APP_UPLOADS_DIR || path.join(BASE_DIR, 'uploads'));
const TOS_VERSION = process.env.TOS_VERSION;
const userDir = (uid) => path.join(UPLOADS_ROOT, `u_${uid}`);
const relFromAbs = (abs) => path.relative(UPLOADS_ROOT, abs).replace(/\\/g, '/');
const toAbsFromStored = (stored) => {
  if (!stored) return null;
  const rel = stored.replace(/^[\\/]+/,'');
  const abs = path.normalize(path.join(UPLOADS_ROOT,rel));
  if(!abs.startsWith(UPLOADS_ROOT + path.sep)){
    throw new Error('Path escapes uploads root');
  }
  return abs;
}
function guessContentType(p){
  const ext = (path.extname(p)||'').toLowerCase();
  if(ext==='.pdf') return 'application/pdf';
  if(ext==='.png') return 'image/png';
  if(ext==='.jpg' || ext==='.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

// === Security headers setup ===
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'same-site'},
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'"],
      "connect-src": ["'self'"],
      "img-src": ["'self'", "data:", "blob:"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "base-uri": ["'self'"]
    }
  },
  referrerPolicy: {policy: "no-referrer"}
}));
const allowIframeSelf = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    "default-src": ["'self'"],
    "script-src": ["'self'"],
    "connect-src": ["'self'"],
    "img-src": ["'self'", "data:", "blob:"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'self'"],
    "base-uri": ["'self'"]
  }
})

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
// === MySQL ===
const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

function q(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => (err ? reject(err) : resolve(results)));
  });
}
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
    
    const token = jwt.sign({id: user.id, email: user.email, name: user.name, is_admin: user.is_admin }, SECRET, { expiresIn: '2h' });
    res.cookie('token', token, {httpOnly: true, secure: IS_PROD, sameSite: 'Strict', maxAge: 2 * 60 * 60 * 1000 }); //2h
    res.json({ success: true, user: { email: user.email, name: user.name, sec: user.is_admin} });
  } catch (e) {
    console.error('Login error: ', e);
    res.status(500).json({succes: false, message: 'Server Error . . .'})
  }
});
app.post('/logout', (req,res) => {
  res.clearCookie('token', {httpOnly: true, secure: IS_PROD, sameSite: 'Strict'});
  res.json({success: true});
});
// === /api/profile (Me profile user) ===
app.post('/api/profile', authMiddleware, async (req, res) => {
  try{
    const userId = req.user.email;
    const results = await q ('SELECT name,fname,email,tel,addr,city,permis,vehicule,mobile,postal,birth,cv,id_doc,id_doc_verso,skills FROM Users WHERE email = ? LIMIT 1', [userId]);
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const user = results[0];
    res.json({ success: true, user });
  } catch (e) {
    console.error('Profile Error: ', e);
    return res.status(500).json({ success: false, message: 'DB Error . . .' });
  }
});
// === Document display
async function kindCheck(kind, userId){
  if(!['cv', 'id_doc', 'id_doc_verso'].includes(kind)) return {ok: false, reason: 'bad-kind'};
  const results = await q('SELECT cv, id_doc, id_doc_verso FROM Users WHERE id=?', [userId]);
  if (results.length === 0) return {ok: false, reason: 'User not found . . .'};
  return {ok: true, path: results[0][kind] || null};
}
app.get('/api/me/files/:kind', authMiddleware, allowIframeSelf, async (req, res) => {
  try {
    const { kind } = req.params;
    const result = await kindCheck(kind, req.user.id);
    if(!result.ok) return res.sendStatus(400);
    if(!result.path) return res.sendStatus(404);
    const abs = toAbsFromStored(result.path);
    await fs.promises.access(abs, fs.constants.R_OK).catch(()=>{ throw 0; });
    res.setHeader('Content-type', guessContentType(abs));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(abs);
  } catch (e) {console.warn(e);}
});
app.get('/api/admin/user/:id/files/:kind', authMiddleware, adminOnly, allowIframeSelf, async (req, res) => {
  try {
    const { id, kind } = req.params;
    const result = await kindCheck(kind, id);
    if(!result.ok) return res.sendStatus(400);
    if(!result.path) return res.sendStatus(404);
    const abs = toAbsFromStored(result.path);
    await fs.promises.access(abs, fs.constants.R_OK).catch(()=>{ throw 0; });
    res.setHeader('Content-type', guessContentType(abs));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');    
    res.sendFile(abs);
  } catch (e) {console.warn(e);}
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

// === Register route ===
app.post('/submit-form', (req, res) => {
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10 Mo
    maxTotalFileSize: 30 * 1024 * 1024,
    multiples: true,
    filter: ({mimetype, originalFilename})=>{
      const ext=path.extname(originalFilename || '').toLowerCase();
      return ALLOWED_MIME.has(mimetype) && ALLOWED_EXT.has(ext);
    }
  });
  const copyInto = async (file, destDir) => {
    if (!file) return null;
    const ext = path.extname(file.originalFilename || '').toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    await fs.promises.mkdir(destDir, {recursive: true});
    const destAbs = path.join(destDir, safeName);
    await fs.promises.copyFile(file.filepath, destAbs);
    return destAbs;
  };
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable error: ', err);
      return res.status(400).send('Form parsing error');
    }
    try {
      const {
        name, fname, email, tel, addr, city, permis, vehicule, mobile,
        postal, birth, password, consent,
      } = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[0]]));
      if (!email || !password || !name || !tel || !addr || !city || !postal || !birth || !consent) return res.status(400).send('Missing required fields');
      const tmpDir = path.join(UPLOADS_ROOT, `tmp_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      await fs.promises.mkdir(tmpDir, {recursive: true});
      const f_cv = files.cv?.[0] || null;
      const f_idr = files.id_doc?.[0] || null;
      const f_idv = files.id_doc_verso?.[0] || null;

      const [cvTmpAbs, idrTmpAbs, idvTmpAbs] = await Promise.all([
        copyInto(f_cv, tmpDir),
        copyInto(f_idr, tmpDir),
        copyInto(f_idv, tmpDir)
      ]);

      const insertSql = `
        INSERT INTO Users
          (name, fname, email, tel, addr, city, permis, vehicule, mobile, postal, birth, cv, id_doc, id_doc_verso, password, consent, terms_version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const hashedPassword = await bcrypt.hash(password, 12);
      const insertValues = [name, fname, email, tel, addr, city, permis ? 1 : 0, vehicule ? 1 : 0, mobile ? 1 : 0, postal, birth, null, null, null, hashedPassword, consent ? 1 : 0, TOS_VERSION];
      try{
        const results = await q(insertSql, insertValues);
        const newId = results.insertId;
        const finalDir = userDir(newId);
        await fs.promises.mkdir(finalDir, {recursive: true});
        const moveToFinal = async (absPath) => {
          if(!absPath) return null;
          const base = path.basename(absPath);
          const dest = path.join(finalDir, base);
          await fs.promises.rename(absPath, dest);
          return relFromAbs(dest);
        };
        const [cvFinalRel, idrFinalRel, idvFinalRel] = await Promise.all([
          moveToFinal(cvTmpAbs),
          moveToFinal(idrTmpAbs),
          moveToFinal(idvTmpAbs)
        ])
        try{
          await q('UPDATE Users SET cv=?,id_doc=?,id_doc_verso=? WHERE id=?', [cvFinalRel, idrFinalRel, idvFinalRel, newId]);
          fs.rm(tmpDir, {recursive: true, force: true}, ()=>{});
          return res.redirect('/signin');
        } catch (e) {
          console.error('DB Update Error after first Insert : ', e);
          res.status(500).send('Database Error after Insert');
        }
      } catch (e) {
        console.error('DB Insert Error: ', e);
        fs.rm(tmpDir, {recursive: true, force: true}, ()=>{});
        if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)){
          return res.status(409).json({ message: "Cet utilisateur est deja enregistré"});
        }
        res.status(500).json({message: 'Database Error or invalid parameters'});
      }
    } catch (e) {
      console.error('Registration handler fault : ', e);
      return res.status(500).send('Server Error');
    }
  });
});

// === GET a random test (READ-ONLY) ===
app.get('/api/test/next', authMiddleware, async (req, res) => {
  try{
    const userId = req.user.id;
    const historyResults = await q('SELECT COUNT(*) AS cnt FROM TestAttempts WHERE user_id = ?', [userId]);
    // type = (1 : frontend; 2 : backend; 3 : psychotechnical)
    // difficulty = (1 : easy; 2 : medium; 3 : hard)
    const cnt = Number(historyResults?.[0]?.cnt ?? 0) || 0;
    const type = cnt === 0 ? 1 : cnt;
    
    if(Number(type) >= 28) return res.status(409).json({ success: false, message: "L'examen est terminé, vous allez être redirigé" });
    const cycleIndex = type % 27;
    const bucket = Math.floor(cycleIndex / 3);
    const servType = (bucket % 3) + 1;
    // Completed test is not used yet, but it should be for when we'll choose to not send the same exercice twice
    const testResults = await q(`SELECT id,question,type,exemple,hint FROM Tests WHERE type = ? ORDER BY RAND() LIMIT 1`,[servType]);
    if (testResults.length === 0) return res.status(404).json({ success: false, message: 'No available test found' });
    return res.status(200).json({ success: true, test: testResults[0], count: type });
  } catch (e) {
    console.error('DB error on random test fetch: ', e);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

app.post('/api/test/response', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { testId, answer } = req.body;
    if (!testId || !answer) return res.status(400).json({ success: false, message: 'Missing test data' });
    const results = await q(`SELECT question,answer FROM Tests WHERE id = ?`, [testId]);
    if (!results.length) return res.status(404).json({ success: false, message: 'Test not found' });

    const { question, answer: official_answer } = results[0];

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: `System:
        You are a strict, detail-oriented grader. Score student answers using the rubric. 
        Never add commentary. Do not justify.`},
        { role:"user", content: `User:
        Grade the student’s answer and return only a numeric score from 0 to 100 (integers only).
        Use this rubric strictly:
        - 100 = fully correct and complete per rubric
        - 70–99 = mostly correct; minor omissions or errors
        - 40–69 = partially correct; significant gaps
        - 1–39 = mostly incorrect; minimal correct elements
        - 0 = blank, off-topic, or copied question

        Important rules:
        - If the rubric lists point weights, respect them and scale to 0–100.
        - If multiple parts exist, weight each part as specified; if unspecified, weight equally.
        - Penalize fabricated facts or contradictions with the provided references.
        - If the answer is not in the requested language or format, deduct up to 10 points.
        - Clamp final result to 0–100 and round to nearest integer.

        Question:
        ${question}

        Rubric / Correct answer or key points (use this, not your own knowledge):
        ${official_answer}

        Student answer:
        ${answer}

        Return only the final integer score.
        `},
      ],
      text: {
        format: {
          type: "json_schema",
          name: "score_only",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: {
                type: "integer",
                minimum: 0,
                maximum: 100
              }
            },
            required: ["score"]
          },
          strict: true
        }
      }
    });
    const raw = response.output[0].content[0].text;
    let score;
    
    try { ({ score } = JSON.parse(raw)); }
    catch { score = Math.max(0, Math.min(100, parseInt(String(raw).trim(), 10))); }
    
    await q('INSERT INTO TestAttempts (user_id, test_id, response, score) VALUES (?, ?, ?, ?)', [userId, testId, answer, score]);
    res.json({ success: true, score });
  } catch (e) {
    console.error('Test/Response Error: ', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// === CRUD ===
async function deleteUser(userId) {
  const userFolder = path.resolve(UPLOADS_ROOT, `u_${userId}`);
  try { await fs.promises.rm(userFolder, { recursive: true, force: true});} 
  catch (e) { if (e.code !== 'ENOENT') console.warn('File RM Error: ', userFolder, e.message); }
  const confirm = await q('DELETE FROM Users WHERE id = ?',[userId]);
  if ((confirm?.affectedRows || 0) === 0) {
    const err = new Error('User not found while trying to Delete user:');
    err.status = 404;
    throw err;
  }
}
// === From profile to db users ===
app.post('/api/update-tags', authMiddleware, async (req, res) => {
  const userEmail = req.user.email;
  const {name, fname, tel, birth, addr, city, permis, vehicule, mobile, postal, skills} = req.body;
  let tags = [];
  if (req.user.is_admin) {tags = Array.isArray(req.body.tags) ? req.body.tags : [];}
  const tagsJSON = JSON.stringify(tags);
  const skillsJSON = JSON.stringify(skills);
  try {
    await q(
    `UPDATE Users 
     SET name = ?, fname = ?, tel = ?, birth = ?, addr = ?, city = ?, permis=?, vehicule=?, mobile=?, postal = ?, tags = ?, skills = ?
     WHERE email = ?`,
    [name, fname, tel, birth, addr, city, permis, vehicule, mobile, postal, tagsJSON, skillsJSON, userEmail]);
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (e) {
    console.error('DB Profile Update Error: ', e);
    res.status(500).json({ success: false, message: 'Database error . . .' });
  }
});
// === CRUD delete route ===
app.delete('/api/delete', authMiddleware, async (req, res) => {
  try { await deleteUser(req.user.id); res.json({success: true});}
  catch (e) { res.status(e.status || 500).json({success: false, message: e.message || "Couldn't delete user"});}
});
// === CRUD delete route (admin) ===
app.delete('/api/admin/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try { await deleteUser(req.params.id); res.json({success: true});}
  catch (e) { res.status(e.status || 500).json({success: false, message: e.message || "Couldn't delete user"});}
});
// === CRUD change(upload)/delete files only route ===
async function deleteFile(userId, action) {
  const results = await q('SELECT cv, id_doc, id_doc_verso FROM Users WHERE id=?', [userId]);
  if (!results || !results[0]) throw Object.assign(new Error('User not found'), {status : 404});
  const user = results[0];
  let filename = null;
  let nullTheColumn = null;
  if(action === 'del' && user.id_doc){
    filename = toAbsFromStored(user.id_doc);
    nullTheColumn = 'id_doc';
  } else if(action === 'delV' && user.id_doc_verso){
    filename = toAbsFromStored(user.id_doc_verso);
    nullTheColumn = 'id_doc_verso';
  } else if(action === 'delCV' && user.cv) {
    filename = toAbsFromStored(user.cv);
    nullTheColumn = 'cv';
  } else { return {success: false} }
  try{
    await fs.promises.unlink(filename);
  } catch (e){
    if (e.code !== 'ENOENT'){
      console.warn('Unlink error:', e);
      const err = new Error("File can't be deleted"); err.status=500; throw err;
    } else {console.log('File already deleted');}
  }
  await q(`UPDATE Users SET ${nullTheColumn} = NULL WHERE id=?`, [userId]);
  return {success: true};
}
app.post('/api/files',authMiddleware, async (req,res)=>{
  try{
    const result = await deleteFile(req.user.id, req.body.action);
    return res.json(result);
  } catch (e) {
    console.error('Delete Route Error: ', e);
    return res.status(e.status || 500).json({success: false, message: e.message ||  'Server File Delete Error . . .'});
  }
})
app.post('/api/files/:id', authMiddleware, adminOnly, async (req,res)=>{
  try{
    const result = await deleteFile(req.params.id, req.body.action);
    return res.json(result);
  } catch (e) {
    console.error('Delete Route Error: ', e);
    return res.status(e.status || 500).json({success: false, message: e.message ||  'Server File Delete Error . . .'});
  }
})
app.post('/api/upload/:kind', authMiddleware, async (req,res)=>{
  const kind = String(req.params.kind || '').trim();
  if(!['id_doc', 'id_doc_verso', 'cv'].includes(kind)) return res.status(400).json({success: false, message: 'Invalid kind'});
  const userFolder = userDir(req.user.id);
  await fs.promises.mkdir(userFolder, {recursive : true});
  try {
    const results = await q('SELECT cv, id_doc, id_doc_verso FROM Users WHERE id=?',[req.user.id]);
    const current = results[0]?.[kind];
    if (current){
      const oldAbs = toAbsFromStored(current);
      try { await fs.promises.unlink(oldAbs);} 
      catch (e) {if (e.code !== 'ENOENT') console.warn('Old file delete error: ', e);}
    }
  } catch (e) {
    console.error('Pre check error: ', e);
    return res.status(500).json({success: false, message: 'Server Upload Error'});
  }
  const form = formidable({
    uploadDir: userFolder,
    keepExtensions: true,
    multiples: false,
    maxFileSize: 10 * 1024 * 1024,
    filter: ({mimetype, originalFilename}) => {
      const ext = path.extname(originalFilename || '').toLowerCase();
      return ALLOWED_MIME.has(mimetype) && ALLOWED_EXT.has(ext);
    },
    filename: (name, ext, part, form) => {
      const lowerExt = (ext || path.extname(name || '')).toLowerCase();
      return `u_${req.user.id}_${kind}_${crypto.randomUUID()}${lowerExt}`;
    }
  });

  form.parse(req, async (err, fields, files) => {
    if(err){
      console.error('Formidable error: ', err);
      return res.status(400).json({success: false, message: "Bad upload"});
    }
    const f = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!f) return res.status(400).json({success: false, message: 'No file'});
    const ext = path.extname(f.originalFilename || '').toLowerCase();
    if (!ALLOWED_MIME.has(f.mimetype) || !ALLOWED_EXT.has(ext)) {
      return res.status(415).json({success: false, message: 'Unsupported file type'});
    }
    try{
      const storedPath = relFromAbs(f.filepath);
      await q(`UPDATE Users SET ${kind}=? WHERE id=?`, [storedPath, req.user.id]);
      return res.json({success: true, path : storedPath});
    } catch (e) {
      console.error('Path Upload DIR Error: ', e);
      return res.status(500).json({success: false, message: 'Server Path Upload Error'});
    }
  });
})

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