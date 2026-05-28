import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

let client: OpenAI | null = null;
function getClient() {
  if (client) return client;
  if (!env.OPENAI_API_KEY) return null;
  client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return client;
}

/**
 * Score a candidate answer against the rubric on a 0–100 scale.
 * Falls back to a deterministic substring heuristic when OpenAI is unavailable
 * so the test flow still works in dev without an API key.
 */
export async function gradeAnswer(question: string, rubric: string, answer: string): Promise<number> {
  const ai = getClient();
  if (!ai) return heuristicScore(rubric, answer);

  try {
    const resp = await ai.responses.create({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content:
            'You are a strict, detail-oriented grader. Score student answers using the rubric. Never add commentary. Do not justify.'
        },
        {
          role: 'user',
          content: `Grade on a 0-100 integer scale using this rubric strictly:
- 100 = fully correct and complete per rubric
- 70-99 = mostly correct; minor omissions
- 40-69 = partially correct; significant gaps
- 1-39 = mostly incorrect
- 0 = blank, off-topic, or copied question

Question: ${question}
Rubric / correct answer: ${rubric}
Student answer: ${answer}

Return only the integer score.`
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'score_only',
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: { score: { type: 'integer', minimum: 0, maximum: 100 } },
            required: ['score']
          },
          strict: true
        }
      }
    });
    const raw = (resp.output[0] as any)?.content?.[0]?.text ?? '';
    try {
      const { score } = JSON.parse(raw) as { score: number };
      return clamp(score);
    } catch {
      return clamp(parseInt(String(raw).trim(), 10));
    }
  } catch (e) {
    console.warn('[grader] OpenAI failed, using heuristic:', (e as Error).message);
    return heuristicScore(rubric, answer);
  }
}

function clamp(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function heuristicScore(rubric: string, answer: string) {
  const a = answer.trim().toLowerCase();
  const r = rubric.trim().toLowerCase();
  if (!a) return 0;
  if (a === r) return 100;
  if (r.includes(a) || a.includes(r)) return 70;
  const tokens = r.split(/\s+/).filter((t) => t.length > 3);
  if (!tokens.length) return 0;
  const hits = tokens.filter((t) => a.includes(t)).length;
  return clamp(Math.round((hits / tokens.length) * 80));
}
