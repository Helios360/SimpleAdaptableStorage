// ------------------------- CONSTS & IMPORTS ------------------------- //
const { Router } = require('express');
const router = Router();
const { authMiddleware } = require('./controllers/authControl');
const { q } = require('./helpers');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ------------------------- TEST FETCH === USERS ------------------------- //
router.get('/api/test/next', authMiddleware, async (req, res) => {
  try{
    const userId = req.user.id;
    const historyResults = await q('SELECT COUNT(*) AS cnt FROM TestAttempts WHERE user_id = ?', [userId]);
    // type = (1 : frontend; 2 : backend; 3 : psychotechnical)
    // difficulty = (1 : easy; 2 : medium; 3 : hard)
    const cnt = Number(historyResults?.[0]?.cnt ?? 0) || 0;
    const type = cnt + 1;
    
    if(Number(type) > 27) return res.status(409).json({ success: false, message: "L'examen est terminé, vous allez être redirigé" });
    const cycleIndex = type % 27;
    const bucket = Math.floor(cycleIndex / 3);
    const servType = (bucket % 3) + 1;
    // a completed test flag is not used yet, but it should be for when we'll choose to not send the same exercice twice
    const testResults = await q(`SELECT id,question,type,difficulty FROM Tests WHERE type = ? ORDER BY RAND() LIMIT 1`,[servType]);
    if (testResults.length === 0) return res.status(404).json({ success: false, message: "Aucun tests disponible pour l'instant" });
    return res.status(200).json({ success: true, test: testResults[0], count: type});
  } catch (e) {
    console.error('DB error on random test fetch: ', e);
    return res.status(500).json({ success: false, message: 'Database error' });
  }
});

// ------------------------- OPENAI CORRECTION API === USERS ------------------------- //
router.post('/api/test/response', authMiddleware, async (req, res) => {
  try {
    const { testId, answer } = req.body;
    if (typeof testId === 'string') testId.trim();
    if (typeof answer === 'string') answer.trim();
    if (!testId || !answer) return res.status(400).json({ success: false, message: 'La réponse est vide ou le test est invalide' });

    const testIdNum = Number(testId);
    if (!Number.isInteger(testIdNum)) return res.status(400).json({success: false, message: "Invalid testId"});

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
    
    await q('INSERT INTO TestAttempts (user_id, test_id, response, score) VALUES (?, ?, ?, ?)', [req.user.id, testId, answer, score]);
    res.json({ success: true, score });
  } catch (e) {
    console.error('Test/Response Error: ', e);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;