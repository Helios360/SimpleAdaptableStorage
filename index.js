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
require('dotenv').config();
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Setting up important consts
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || 'localhost';
const SECRET = process.env.JWT_SECRET;
// === Middleware ===
app.use(cors({origin: 'http://localhost:8080',credentials:true}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// === Static Files ===
app.use(express.static(path.join(__dirname, 'public')));
// === MySQL ===
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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
      res.json({ success: true, user: { email: user.email, name: user.name } });
    });
  });
});

// === /api/profile (Protected Route) ===
app.get('/api/profile', authMiddleware, (req, res) => {
  const userId = req.user.email;
  db.query('SELECT * FROM Users WHERE email = ?', [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'DB error' });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const user = results[0];
    if (!req.user.is_admin) {
        delete user.tags;
    }
    res.json({ success: true, user });
  });
});
// === Admin full sql api ===
app.get('/api/admin-panel', authMiddleware, adminOnly, (req, res) => {
  db.query('SELECT * FROM Users', (err, results)=>{
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
app.get('/api/admin/student/:email', authMiddleware, adminOnly, (req, res) => {
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
  const filePath = path.join(__dirname, 'uploads', folder, filename);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).send('File not found');
    }
    res.sendFile(filePath);
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
  const form = formidable({
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,       // Limite par fichier
    maxTotalFileSize: 30 * 1024 * 1024,  // Limite cumulée
    multiples: true,
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

// === GET a random test (READ-ONLY) ===
app.get('/api/test/next', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.query('SELECT * FROM Histories WHERE user_id = ?', [userId], (err, historyResults) => {
    if (err) {
      console.error('DB error on history check:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    let completedTests = [];
    let numbOfTest = 0;

    if (historyResults.length > 0) {
      let historyData = historyResults[0].data;
      if (typeof historyData === 'string') historyData = JSON.parse(historyData);

      completedTests = Object.values(historyData.tests).map(t => t.question);
      numbOfTest = completedTests.length;

      if (numbOfTest >= 9) {
        return res.status(200).json({ success: false, message: "L'examen est terminé, vous allez être redirigé" });
      }
    }

    let servType = '';
    if (numbOfTest < 3) servType = 'frontend';
    else if (numbOfTest < 6) servType = 'backend';
    else servType = 'psychotechnique';

    db.query(
      `SELECT * FROM Tests WHERE type = ? AND id NOT IN (?) ORDER BY RAND() LIMIT 1`,
      [servType, completedTests.length ? completedTests : [0]],
      (err, testResults) => {
        if (err || testResults.length === 0) {
          return res.status(404).json({ success: false, message: 'No available test found' });
        }

        return res.status(200).json({ success: true, test: testResults[0] });
      }
    );
  });
});

app.post('/api/test/response', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { testId, type, answer } = req.body;

  if (!testId || !type || !answer) {
    return res.status(400).json({ success: false, message: 'Missing test data' });
  }

  db.query('SELECT * FROM Histories WHERE user_id = ?', [userId], (err, historyResults) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    let historyData = null;
    if (historyResults.length > 0) {
      historyData = historyResults[0].data;
      if (typeof historyData === 'string') historyData = JSON.parse(historyData);
    }

    const newTestKey = historyData ? `test${Object.keys(historyData.tests).length + 1}` : 'test1';
    const newTestEntry = {
      type,
      question: testId,
      response: answer,
      score: null
    };

    if (!historyData) {
      historyData = { tests: { [newTestKey]: newTestEntry } };
      db.query('INSERT INTO Histories (user_id, data) VALUES (?, ?)', [userId, JSON.stringify(historyData)], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Insert error' });
        res.json({ success: true });
      });
    } else {
      historyData.tests[newTestKey] = newTestEntry;
      db.query('UPDATE Histories SET data = ? WHERE user_id = ?', [JSON.stringify(historyData), userId], (err) => {
        if (err) return res.status(500).json({ success: false, message: 'Update error' });
        res.json({ success: true });
      });
    }
  });
});
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