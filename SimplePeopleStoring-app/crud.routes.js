// ------------------------- CONSTS & IMPORTS ------------------------- //
const { Router } = require('express');
const { formidable } = require('formidable');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const { 
    q, userDir, relFromAbs, toAbsFromStored,
    ALLOWED_EXT, ALLOWED_MIME, addWatermark, 
} = require('./helpers');
const { authMiddleware, adminOnly} = require('./controllers/authControl');
const router = Router();

// ------------------------- CREATE > PROFILE === USERS ------------------------- //
router.post('/submit-form', (req, res) => {
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
    await fs.mkdir(destDir, {recursive: true});
    const destAbs = path.join(destDir, safeName);
    await fs.copyFile(file.filepath, destAbs);
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
      await fs.mkdir(tmpDir, {recursive: true});
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
        await fs.mkdir(finalDir, {recursive: true});
        const moveToFinal = async (absPath) => {
          if(!absPath) return null;
          const base = path.basename(absPath);
          const dest = path.join(finalDir, base);
          await fs.rename(absPath, dest);
          return relFromAbs(dest);
        };
        let [cvFinalRel, idrFinalRel, idvFinalRel] = await Promise.all([
          moveToFinal(cvTmpAbs),
          moveToFinal(idrTmpAbs),
          moveToFinal(idvTmpAbs)
        ])
        if(cvFinalRel && cvFinalRel.toLowerCase().endsWith('.pdf')){
          const absCvPath = toAbsFromStored(cvFinalRel);
          const tempWatermarkedPath = absCvPath.replace(/\.pdf$/,'_wm.pdf');
          const success = await addWatermark(absCvPath, tempWatermarkedPath);
          if (success) await fs.rename(tempWatermarkedPath, absCvPath);
        }
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

// ------------------------- UPDATE > USER === USERS ------------------------- //
router.post('/api/update-tags', authMiddleware, async (req, res) => {
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

// ------------------------- DELETE > USER === USERS ------------------------- //
router.delete('/api/delete', authMiddleware, async (req, res) => {
  try { await deleteUser(req.user.id); res.json({success: true});}
  catch (e) { res.status(e.status || 500).json({success: false, message: e.message || "Couldn't delete user"});}
});

// ------------------------- DELETE > USER === ADMINS ------------------------- //
router.delete('/api/admin/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try { await deleteUser(req.params.id); res.json({success: true});}
  catch (e) { res.status(e.status || 500).json({success: false, message: e.message || "Couldn't delete user"});}
});


// ------------------------- READ > FILE === USERS ------------------------- //
router.get('/api/me/files/:kind', authMiddleware, allowIframeSelf, async (req, res) => {
  try {
    const { kind } = req.params;
    const result = await kindCheck(kind, req.user.id);
    if(!result.ok) return res.sendStatus(400);
    if(!result.path) return res.sendStatus(404);
    const abs = toAbsFromStored(result.path);
    await fs.access(abs, fs.constants.R_OK).catch(()=>{ throw 0; });
    res.setHeader('Content-type', guessContentType(abs));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.sendFile(abs);
  } catch (e) {console.warn(e);}
});

// ------------------------- READ > FILE === ADMINS ------------------------- //
router.get('/api/admin/user/:id/files/:kind', authMiddleware, adminOnly, allowIframeSelf, async (req, res) => {
  try {
    const { id, kind } = req.params;
    const result = await kindCheck(kind, id);
    if(!result.ok) return res.sendStatus(400);
    if(!result.path) return res.sendStatus(404);
    const abs = toAbsFromStored(result.path);
    await fs.access(abs, fs.constants.R_OK).catch(()=>{ throw 0; });
    res.setHeader('Content-type', guessContentType(abs));
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');    
    res.sendFile(abs);
  } catch (e) {console.warn(e);}
});

// ------------------------- DELETE > FILE === ADMINS ------------------------- //
router.post('/api/files/:id', authMiddleware, adminOnly, async (req,res)=>{
  try{
    const result = await deleteFile(req.params.id, req.body.action);
    return res.json(result);
  } catch (e) {
    console.error('Delete Route Error: ', e);
    return res.status(e.status || 500).json({success: false, message: e.message ||  'Server File Delete Error . . .'});
  }
});

// ------------------------- DELETE > FILE === USERS ------------------------- //
router.post('/api/files',authMiddleware, async (req,res)=>{
  try{
    const result = await deleteFile(req.user.id, req.body.action);
    return res.json(result);
  } catch (e) {
    console.error('Delete Route Error: ', e);
    return res.status(e.status || 500).json({success: false, message: e.message ||  'Server File Delete Error . . .'});
  }
});

// ------------------------- UPDATE > FILE === USERS ------------------------- //
router.post('/api/upload/:kind', authMiddleware, async (req,res)=>{
  const kind = String(req.params.kind || '').trim();
  if(!['id_doc', 'id_doc_verso', 'cv'].includes(kind)) return res.status(400).json({success: false, message: 'Invalid kind'});
  const userFolder = userDir(req.user.id);
  await fs.mkdir(userFolder, {recursive : true});
  try {
    const results = await q('SELECT cv, id_doc, id_doc_verso FROM Users WHERE id=?',[req.user.id]);
    const current = results[0]?.[kind];
    if (current){
      const oldAbs = toAbsFromStored(current);
      try { await fs.unlink(oldAbs);} 
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
      if(kind == 'cv' && ext === '.pdf'){
        const tempWatermarked = f.filepath.replace(/\.pdf$/, '_wm.pdf');
        const success = await addWatermark(f.filepath, tempWatermarked);
        if (success) await fs.rename(tempWatermarked, f.filepath);
      }
      const storedPath = relFromAbs(f.filepath);
      await q(`UPDATE Users SET ${kind}=? WHERE id=?`, [storedPath, req.user.id]);
      return res.json({success: true, path : storedPath});
    } catch (e) {
      console.error('Path Upload DIR Error: ', e);
      return res.status(500).json({success: false, message: 'Server Path Upload Error'});
    }
  });
});

// ------------------------- TEST FETCH === USERS ------------------------- //
router.get('/api/test/next', authMiddleware, async (req, res) => {
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

// ------------------------- OPENAI CORRECTION API === USERS ------------------------- //
router.post('/api/test/response', authMiddleware, async (req, res) => {
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

module.exports = router;