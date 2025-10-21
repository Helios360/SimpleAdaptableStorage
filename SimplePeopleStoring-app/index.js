const express = require('express');
const cors = require('cors');
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

// Helpers
const ALLOWED_MIME = new Set(['application/pdf','image/jpeg','image/png']);
const ALLOWED_EXT = new Set(['.pdf','.jpg','.jpeg','.png']);
const BASE_DIR = path.resolve(process.env.APP_BASE_DIR || BASE_DIR);
const UPLOADS_ROOT = path.resolve(process.env.APP_UPLOADS_DIR, path.join(BASE_DIR, 'uploads'));
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

// === Security headers setup ===
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site'} }));
app.use(cookieParser());

// === Setting up important consts ===
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SECRET = process.env.JWT_SECRET;
// === Middleware ===
app.use(cors({origin: 'http://localhost:8080', credentials: true}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// === Static Files ===
app.use(express.static(path.join(BASE_DIR, 'public')));
// === MySQL ===
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  dateStrings: true,
});

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
// === Rate limit, anti ddos ===
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100 // max 100 requests per 15 minutes
}));

// === Database connection ===
db.connect(err => {
  if (err) {
    console.error('DB Error: ', err.stack);
    return;
  }
  console.log(':3 Connected to MySQL . . .');
});

// === HTML Routes ===
app.get('/', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/index.html')));
app.get('/register', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/register.html')));
app.get('/signin', (_, res) => res.sendFile(path.join(BASE_DIR, 'public/signin.html')));
app.get('/profile', authMiddleware, (req, res) => {res.sendFile(path.join(BASE_DIR, 'views', 'profile.html'));});
app.get('/admin-panel', authMiddleware, adminOnly, (req, res) => {res.sendFile(path.join(BASE_DIR,'views', 'admin.html'));});
app.get('/test', authMiddleware, (req, res) => {res.sendFile(path.join(BASE_DIR,'views', 'test.html'));});

// === /login Route ===
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).send('DB error');
    if (results.length === 0) return res.status(401).json({ success: false, message: 'Email not found' });

    const user = results[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).send('Password error');
      if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid password' });
      const token = jwt.sign({id: user.id, email: user.email, name: user.name, is_admin: user.is_admin }, SECRET, { expiresIn: '2h' });
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_DEV === 'production',
        sameSite: 'Strict',
        maxAge: 2 * 60 * 60 * 1000 // 2h
      });
      res.json({ success: true, user: { email: user.email, name: user.name, sec: user.is_admin} });
    });
  });
});
// === /api/profile (Protected Route) ===
app.post('/api/profile', authMiddleware, (req, res) => {
  const userId = req.user.email;
  db.query('SELECT name,fname,email,tel,addr,city,postal,birth,cv,id_doc,id_doc_verso,skills,status FROM Users WHERE email = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const user = results[0];
    res.json({ success: true, user });
  });
});
// === Admin full sql api ===
app.post('/api/admin-panel', authMiddleware, adminOnly, (req, res) => {
  db.query(`
  SELECT 
      Users.*,
    ROUND(AVG(TestAttempts.score)) AS gen_score
    FROM Users
    LEFT JOIN TestAttempts ON Users.id = TestAttempts.user_id
    GROUP BY Users.id
  ;`, 
  (err, results)=>{
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Result lenght === 0'});
    res.json({ success: true, users: results});
  });
});
// === Single user profile (admin) ===
app.get('/api/user-profile/:id', authMiddleware, adminOnly, (req, res) => {
  const userId = req.params.id;
  db.query('SELECT * FROM Users WHERE id = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: results[0] });
  });
});
// === Only accessible by authenticated admins ===
app.post('/api/admin/student/:email', authMiddleware, adminOnly, (req, res) => {
  const email = decodeURIComponent(req.params.email);
  db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, student: results[0] });
  });
});
// === Update students (admin) ===
app.post('/api/admin/update-student', authMiddleware, adminOnly, (req, res) => {
  const {
    email, name, fname, tel, birth, addr, city, postal, tags, skills, status
  } = req.body;
  db.query(
    'UPDATE Users SET name=?, fname=?, tel=?, birth=?, addr=?, city=?, postal=?, tags=?, skills=?, status=? WHERE email=?',
    [name, fname, tel, birth, addr, city, postal, JSON.stringify(tags), JSON.stringify(skills), status, email],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: 'Database error' });
      res.json({ success: true });
    }
  );
});
// === Update status from list (admin) ===
app.post('/api/admin/update-status', authMiddleware, adminOnly, (req, res) => {
  const { id, status } = req.body;
  db.query('UPDATE Users SET status = ? WHERE id = ?',[status, id],(err, result) => {
      if (err) {
        console.error('DB error on status update:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

// === From profile to db ===
app.post('/api/update-tags', authMiddleware, (req, res) => {
  const userEmail = req.user.email;
  const {name, fname, tel, birth, addr, city, postal, skills, status} = req.body;
  let tags = [];
  if (req.user.is_admin) {tags = Array.isArray(req.body.tags) ? req.body.tags : [];}
  const tagsJSON = JSON.stringify(tags);
  const skillsJSON = JSON.stringify(skills);
  db.query(
    `UPDATE Users 
     SET name = ?, fname = ?, tel = ?, birth = ?, addr = ?, city = ?, postal = ?, tags = ?, skills = ?, status=?
     WHERE email = ?`,
    [name, fname, tel, birth, addr, city, postal, tagsJSON, skillsJSON, status, userEmail],
    (err, result) => {
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      res.json({ success: true, message: 'Profile updated successfully' });
    }
  );
});

// === Register route ===
app.post('/submit-form', (req, res) => {
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
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
        name, fname, email, tel, addr, city,
        postal, birth, password, agree,
      } = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[0]]));
      if (!email || !password || !name || !tel || !addr || !city || !postal || !birth || !agree) return res.status(400).send('Missing required fields');
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
          (name, fname, email, tel, addr, city, postal, birth, cv, id_doc, id_doc_verso, password, agree)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const hashedPassword = await bcrypt.hash(password, 12);
      const insertValues = [name, fname, email, tel, addr, city, postal, birth, null, null, null, hashedPassword, agree ? 1 : 0];
      db.query(insertSql, insertValues, async (err, results) => {
        if (err){
          console.error('DB insert Error: ', err);
          fs.rm(tmpDir, {recursive: true, force: true}, ()=>{});
          return res.status(500).send('Database Error or invalid parameters');
        }
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
        db.query('UPDATE Users SET cv=?,id_doc=?,id_doc_verso=? WHERE id=?', [cvFinalRel, idrFinalRel, idvFinalRel, newId], (err)=>{
          fs.rm(tmpDir, {recursive: true, force: true}, ()=>{});
          if(err){
            console.error('DB Update Error (final paths) : ', err);
            return res.status(500).send('Database error after insert');
          }
          return res.redirect('/signin');
        });
      })
    } catch (e) {
      console.error('Registration handler fault : ', e);
      return res.status(500).send('Server Error');
    }
  });
});

// === GET a random test (READ-ONLY) WITH OPENAI ===
app.get('/api/test/next', authMiddleware, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT COUNT(*) AS cnt FROM TestAttempts WHERE user_id = ?', [userId], (err, historyResults) => {
    if (err) {
      console.error('DB error on history check:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    // type = (1 : frontend; 2 : backend; 3 : psychotechnical)
    // difficulty = (1 : easy; 2 : medium; 3 : hard)
    const type = historyResults[0]?.cnt ?? 0;
    if(Number(type) >= 27){
      return res.status(409).json({ success: false, message: "L'examen est terminé, vous allez être redirigé" });
    }
    const cycleIndex = type % 27;
    const bucket = Math.floor(cycleIndex / 3);
    const difficulty = Math.floor(bucket / 3) + 1;
    const servType = (bucket % 3) + 1;
    // Completed test is not used yet, but it should be for when we'll choose to not send the same exercice twice
    db.query(
      `SELECT id,question,type,exemple,hint FROM Tests WHERE type = ? AND id NOT IN (?) ORDER BY RAND() LIMIT 1`,
      [servType, completedTests.length ? completedTests : [0]],
      (err, testResults) => {
        if (err || testResults.length === 0) return res.status(404).json({ success: false, message: 'No available test found' });
        return res.status(200).json({ success: true, test: testResults[0], count: type });
      }
    );
  });
});

app.post('/api/test/response', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { testId, answer } = req.body;
  if (!testId || !answer) {
    return res.status(400).json({ success: false, message: 'Missing test data' });
  }
  const rows = await q(`SELECT question,answer FROM Tests WHERE id = ?`, [testId]);
  if (!rows.length) return res.status(404).json({ success: false, message: 'Test not found' });

  const { question, answer: official_answer } = rows[0];

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
  try {
    ({ score } = JSON.parse(raw));
  } catch {
    score = Math.max(0, Math.min(100, parseInt(String(raw).trim(), 10)));
    console.log(score);
  } try {
    console.log(score);
    await new Promise((resolve, reject) => {
      db.query('INSERT INTO TestAttempts (user_id, test_id, response, score) VALUES (?, ?, ?, ?)', [userId, testId, answer, score], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    res.json({ success: true, score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// === CRUD ===
function deleteUser(userId, res){
  const userFolder = path.resolve(BASE_DIR, `uploads/u_${userId}`);
  fs.rm(userFolder, { recursive: true, force: true}, (e) => {
    if(e && e.code !== 'ENOENT') console.warn('rm error: ', userFolder, e.message);
  });
  db.query('DELETE FROM Users WHERE id = ?',[userId], (err) => {
    if (err) return res.status(500).json({success : false, message: "Couldn't delete user from database"});
  })
  return res.status(200).json({ success: true, message: `User ${userId} succesfully deleted from the database` });
}
// === CRUD delete route ===
app.delete('/api/delete', authMiddleware, (req, res) => {
  deleteUser(req.user.id, res);
});
// === CRUD delete route (admin) ===
app.delete('/api/admin/users/:id', authMiddleware, adminOnly, (req, res) => {
  deleteUser(req.params.id, res);
});
// === CRUD change(upload)/delete files only route ===
app.post('/api/files',authMiddleware, async (req,res)=>{
  try{
    const rows = await q('SELECT cv, id_doc, id_doc_verso FROM Users WHERE id=?', [req.user.id]);
    if (!rows || !rows[0]) return res.status(500).json({success : false, message : 'User not found'});
    const user = rows[0];
    let filename = null;
    let nullTheColumn = null;
    if(req.body.action === 'del' && user.id_doc){
      filename = toAbsFromStored(user.id_doc);
      nullTheColumn = 'id_doc';
    } else if(req.body.action === 'delV' && user.id_doc_verso){
      filename = toAbsFromStored(user.id_doc_verso);
      nullTheColumn = 'id_doc_verso';
    } else if(req.body.action === 'delCV' && user.cv) {
      filename = toAbsFromStored(user.cv);
      nullTheColumn = 'cv';
    } else { return res.status(400).json({ success : false, message: "No file to delete or invalid parameters"}) }
    try{
      await fs.promises.unlink(filename);
      console.log(`deleted file : ${filename}`);
    } catch (e){
      if (e.code !== 'ENOENT'){
        console.warn('Unlink error:', e);
        return res.status(500).json({success : false, message : "File can't be deleted"});
      } else {console.log('File already deleted');}
    }
    await q(`UPDATE Users SET ${nullTheColumn} = NULL WHERE id=?`, [req.user.id]);
    return res.json({success: true});
  } catch (e) {
    console.error('Delete Route Error: ', e);
    return res.status(500).json({error: 'Server Error'});
  }
})
app.post('/api/upload/:kind', authMiddleware, async (req,res)=>{
  const kind = String(req.params.kind || '').trim();
  if(!['id_doc', 'id_doc_verso', 'cv'].includes(kind)) return res.status(400).json({success: false, message: 'Invalid kind'});
  const userFolder = userDir(req.user.id);
  await fs.promises.mkdir(userFolder, {recursive : true});
  try {
    const rows = await q('SELECT cv, id_doc, id_doc_verso FROM Users WHERE id=?',[req.user.id]);
    const current = rows[0]?.[kind];
    if (current){
      const oldAbs = toAbsFromStored(current);
      try { await fs.promises.unlink(oldAbs);} 
      catch (e) {if (e.code !== 'ENOENT') console.warn('Old file delete error: ', e);}
    }
  } catch (e) {
    console.error('Pre check error: ', e);
    return res.status(500).json({success: false, message: 'server error'});
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
      return `u_${req.user.id}_${kind}${lowerExt}`;
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
      console.error('Erreur upload: ', e);
      return res.status(500).json({success: false, message: 'Server error'});
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