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
app.use(cookieParser());

// Setting up important consts
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const SECRET = process.env.JWT_SECRET;
// === Middleware ===
app.use(cors({origin: 'http://localhost:8080',credentials:true}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// === Static Files ===
app.use(express.static(path.join(__dirname, 'public')));
// === MySQL ===
const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  dateStrings: true,
});

db.connect(err => {
  if (err) {
    console.error('DB Error:', err.stack);
    return;
  }
  console.log(':3 Connected to DB');
});

// === HTML Routes ===
app.get('/', (_, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/register', (_, res) => res.sendFile(path.join(__dirname, 'public/register.html')));
app.get('/signin', (_, res) => res.sendFile(path.join(__dirname, 'public/signin.html')));
app.get('/profile', authMiddleware, (req, res) => {res.sendFile(path.join(__dirname, 'views', 'profile.html'));});
app.get('/admin-panel', authMiddleware, adminOnly, (req, res) => {res.sendFile(path.join(__dirname,'views', 'admin.html'));});
app.get('/test', authMiddleware, (req, res) => {res.sendFile(path.join(__dirname,'views', 'test.html'));});

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
        secure: false, // mettre `true` en production avec HTTPS
        sameSite: 'Strict', // ou 'Lax' selon ton setup
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
// Only accessible by authenticated admins
app.post('/api/admin/student/:email', authMiddleware, adminOnly, (req, res) => {
  const email = decodeURIComponent(req.params.email);

  db.query('SELECT * FROM Users WHERE email = ?', [email], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, student: results[0] });
  });
});

// === PDF access ===
app.get('/uploads/:folder/:filename', authMiddleware, (req, res) => {
  const { folder, filename } = req.params;
  const filePath = path.join(__dirname, 'uploads');
  const requested = path.normalize(path.join(filePath, folder, filename));
  if (!requested.startsWith(filePath + path.sep)) return res.status(400).send('Invalid path');

  db.query('SELECT cv, id_doc, id_doc_verso FROM Users WHERE id=?', [req.user.id], (err, rows)=>{
    if(err || !rows.length) return res.status(404).send('Not Found');
    const allowed = [rows[0].cv, rows[0].id_doc, rows[0].id_doc_verso].filter(Boolean).map(p=>path.normalize(path.join(__dirname, p)));
    const isOwner = allowed.some(p=>p===requested);
    if(!isOwner && !req.user.is_admin) return res.status(403).send('Forbidden');

    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) return res.status(404).send('File not found');
      res.sendFile(requested, { headers: { 'X-Content-Type-Options': 'nosniff' } });
    });
  });
});

// === update students (admin) ===
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
// === update status from list (admin) ===
app.post('/api/admin/update-status', authMiddleware, adminOnly, (req, res) => {
  const { id, status } = req.body;
  db.query(
    'UPDATE Users SET status = ? WHERE id = ?',
    [status, id],
    (err, result) => {
      if (err) {
        console.error('DB error on status update:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      res.json({ success: true });
    }
  );
});

// === from profile to db ===
app.post('/api/update-tags', authMiddleware, (req, res) => {
  const userEmail = req.user.email;
  const {name, fname, tel, birth, addr, city, postal, skills, status} = req.body;
  let tags = [];

  if (req.user.is_admin) {
    tags = Array.isArray(req.body.tags) ? req.body.tags : [];
  }
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
  const ALLOWED_MIME = new Set(['application/pdf','image/jpeg','image/png']);
  const ALLOWED_EXT = new Set(['.pdf','.jpg','.jpeg','.png']);
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,       // Limite par fichier
    maxTotalFileSize: 30 * 1024 * 1024,  // Limite cumulée
    multiples: true,
    filter: ({mimetype, originalFilename})=>{
      const ext=path.extname(originalFilename || '').toLowerCase();
      return ALLOWED_MIME.has(mimetype) && ALLOWED_EXT.has(ext);
    }
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Formidable error:', err);
      return res.status(500).send('Form parsing error');
    }

    const {
      name, fname, email, tel, addr, city,
      postal, birth, id, password, agree,
    } = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v[0]]));

    // Création du dossier utilisateur
    const userFolderName = `user_${Date.now()}_${email.replace(/[@.]/g, '_')}`;
    const uploadDir = path.join(__dirname, 'uploads', userFolderName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Fonction utilitaire pour déplacer les fichiers
    const moveFile = async (file) => {
      if (!file) return null;
      const oldPath = file[0].filepath;
      const newName = file[0].newFilename;
      const newPath = path.join(uploadDir, newName);
      await fs.promises.copyFile(oldPath, newPath);
      await fs.promises.unlink(oldPath);
      return path.relative(__dirname, newPath);
    };

    try {
      // Attente des chemins de fichiers
      const [cvPath, idDocPath, idDocPathVerso] = await Promise.all([
        moveFile(files.cv),
        moveFile(files.id_doc),
        moveFile(files.id_doc_verso)
      ]);
      // Hash du mot de passe
      const hashedPassword = bcrypt.hashSync(String(password), 10);
      const sql = `
        INSERT INTO Users
          (name, fname, email, tel, addr, city, postal, birth, cv, id_doc, id_doc_verso, password, agree)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const values = [
        name, fname, email, tel, addr, city, postal, birth,
        cvPath, idDocPath, idDocPathVerso, hashedPassword, agree ? 1 : 0
      ];
      db.query(sql, values, (err, result) => {
        if (err) {
          console.error('DB Insert Error:', err);
          return res.status(500).send('Database Error');
        }
        res.redirect('/signin');
      });
    } catch (fileErr) {
      console.error("File move error:", fileErr);
      res.status(500).send("File move error");
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
    //Completed test is not used yet, but it should be for when we'll choose to not send the same exercice twice
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

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

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

// === CRUD delete route ===
app.delete('/api/delete', authMiddleware, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT cv FROM Users WHERE id=?;', [userId], (err,rows) => {
    const userFolder = path.resolve(__dirname, path.dirname(rows[0].cv));
    fs.rm(userFolder, { recursive: true, force: true}, (e) => {
      if(e && e.code !== 'ENOENT') console.warn('rm error: ', userFolder, e.message);
    });
    db.query('DELETE FROM Users WHERE id = ?',[userId], (err) => {
      if (err) return res.status(500).json({success : false, message: "Couldn't delete user from database"});
    })
    if(err) return res.status(500).json({success: false, message: "Couldn't delete user from database, contact superadmin"});
    return res.status(200).json({ success: true, message: `User ${userId} succesfully deleted from the database` });
  });
});
// === CRUD change/delete files only route ===


// === CRUD delete route (admin) ===
app.delete('/api/admin/users/:id', authMiddleware, adminOnly, (req, res) => {
  const targetId = req.params.id;
  db.query('SELECT cv FROM Users WHERE id=?;', [targetId], (err,rows) => {
    const userFolder = path.resolve(__dirname, path.dirname(rows[0].cv));
    fs.rm(userFolder, { recursive: true, force: true}, (e) => {
      if(e && e.code !== 'ENOENT') console.warn('rm error: ', userFolder, e.message);
    });
    db.query('DELETE FROM Users WHERE id = ?',[targetId], (err) => {
      if (err) return res.status(500).json({success : false, message: "Couldn't delete user from database"});
    })
    if(err) return res.status(500).json({success: false, message: "Couldn't delete user from database, contact superadmin"});
    return res.status(200).json({ success: true, message: `User ${targetId} succesfully deleted from the database` });
  });
});
// === CRUD change/delete files only route (admin) ===


// === Rate limit, anti ddos ===
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100 // max 100 requests per 15 minutes
}));
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
