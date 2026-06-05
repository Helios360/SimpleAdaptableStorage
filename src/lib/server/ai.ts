/**
 * Intégration IA — appels effectués UNIQUEMENT côté serveur (la clé
 * OPENAI_API_KEY n'est jamais exposée au navigateur). Deux usages :
 *   - génération de questions de test (generateTestQuestions)
 *   - suggestions d'amélioration de CV (cvSuggestions)
 * Chaque fonction renvoie un fallback statique si l'API échoue.
 */
import { env } from '$env/dynamic/private';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';

export type TestType = 'code' | 'logique' | 'psycho' | 'culture';

export interface GeneratedQuestion {
	q: string;
	options: string[]; // exactement 4
	answer: number; // index 0..3 de la bonne réponse
}

export interface CvSuggestion {
	title: string;
	detail: string;
	impact: 'fort' | 'moyen';
}

/** Retire d'éventuelles balises ```json … ``` autour d'une réponse modèle. */
export function stripJsonFences(raw: string): string {
	return raw
		.trim()
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();
}

/**
 * Appel bas-niveau au Chat Completions d'OpenAI. Renvoie le texte de la
 * réponse. Lève une erreur si la clé manque ou si l'API répond en erreur.
 */
export async function callOpenAI(prompt: string, maxTokens = 1500): Promise<string> {
	const key = env.OPENAI_API_KEY;
	if (!key) throw new Error('OPENAI_API_KEY manquante');
	const model = env.OPENAI_MODEL || DEFAULT_MODEL;

	const res = await fetch(OPENAI_URL, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${key}`
		},
		body: JSON.stringify({
			model,
			max_tokens: maxTokens,
			temperature: 0.7,
			response_format: { type: 'json_object' },
			messages: [
				{
					role: 'system',
					content:
						'Tu es un assistant RH francophone. Tu réponds STRICTEMENT en JSON valide, sans texte autour.'
				},
				{ role: 'user', content: prompt }
			]
		})
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`OpenAI ${res.status}: ${body.slice(0, 300)}`);
	}

	const json = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	const content = json.choices?.[0]?.message?.content;
	if (!content) throw new Error('Réponse OpenAI vide');
	return content;
}

function parseJson<T>(raw: string): T {
	return JSON.parse(stripJsonFences(raw)) as T;
}

// ─── Fallbacks statiques ──────────────────────────────────────────────────────

const FALLBACK_QUESTIONS: Record<TestType, GeneratedQuestion[]> = {
	code: [
		{ q: 'Quelle est la complexité moyenne du tri rapide (quicksort) ?', options: ['O(n log n)', 'O(n²)', 'O(n)', 'O(log n)'], answer: 0 },
		{ q: 'Que retourne `typeof null` en JavaScript ?', options: ['"null"', '"object"', '"undefined"', '"number"'], answer: 1 },
		{ q: 'Quel mot-clé déclare une constante en JS ?', options: ['var', 'let', 'const', 'static'], answer: 2 },
		{ q: 'Une clé primaire SQL doit être…', options: ['nullable', 'unique et non nulle', 'forcément un entier', 'indexée en dernier'], answer: 1 },
		{ q: 'Que fait `git revert` ?', options: ['Supprime un commit', 'Crée un commit inverse', 'Change de branche', 'Fusionne deux branches'], answer: 1 }
	],
	logique: [
		{ q: 'Suite : 2, 4, 8, 16, … ?', options: ['24', '32', '20', '18'], answer: 1 },
		{ q: 'Si tous les A sont B et aucun B n’est C, alors…', options: ['des A sont C', 'aucun A n’est C', 'tous les C sont A', 'on ne peut rien dire'], answer: 1 },
		{ q: 'Intrus : Chien, Chat, Lion, Voiture ?', options: ['Chien', 'Chat', 'Lion', 'Voiture'], answer: 3 },
		{ q: 'Suite : 1, 1, 2, 3, 5, … ?', options: ['7', '8', '9', '6'], answer: 1 },
		{ q: 'Combien font 15 % de 200 ?', options: ['20', '30', '15', '25'], answer: 1 }
	],
	psycho: [
		{ q: 'Face à un conflit d’équipe, vous préférez…', options: ['ignorer', 'écouter puis arbitrer', 'imposer votre avis', 'fuir'], answer: 1 },
		{ q: 'Une échéance serrée approche, vous…', options: ['paniquez', 'priorisez les tâches', 'attendez', 'déléguez tout'], answer: 1 },
		{ q: 'Vous recevez une critique, vous…', options: ['vous braquez', 'analysez ce qui est utile', 'l’ignorez', 'changez de sujet'], answer: 1 },
		{ q: 'En réunion, vous êtes plutôt…', options: ['silencieux toujours', 'à l’écoute et force de proposition', 'monopolisez la parole', 'distrait'], answer: 1 },
		{ q: 'Un imprévu bouscule votre plan, vous…', options: ['abandonnez', 'adaptez le plan', 'blâmez les autres', 'attendez des consignes'], answer: 1 }
	],
	culture: [
		{ q: 'Capitale de l’Australie ?', options: ['Sydney', 'Canberra', 'Melbourne', 'Perth'], answer: 1 },
		{ q: 'Le RGPD concerne…', options: ['la fiscalité', 'les données personnelles', 'le droit du travail', 'la propriété foncière'], answer: 1 },
		{ q: 'Qui a peint la Joconde ?', options: ['Michel-Ange', 'Léonard de Vinci', 'Raphaël', 'Botticelli'], answer: 1 },
		{ q: 'Combien de continents sur Terre ?', options: ['5', '6', '7', '8'], answer: 2 },
		{ q: 'L’euro est la monnaie de combien de pays de l’UE (2024) ?', options: ['15', '20', '27', '12'], answer: 1 }
	]
};

const FALLBACK_SUGGESTIONS: CvSuggestion[] = [
	{ title: 'Quantifiez vos résultats', detail: 'Ajoutez des chiffres concrets à vos expériences (ex : « +20 % de trafic »).', impact: 'fort' },
	{ title: 'Adaptez le titre au poste', detail: 'Reprenez l’intitulé exact du poste visé en haut de votre CV.', impact: 'fort' },
	{ title: 'Compétences en évidence', detail: 'Regroupez vos compétences clés dans un bloc visible dès le premier coup d’œil.', impact: 'moyen' },
	{ title: 'Verbes d’action', detail: 'Commencez chaque ligne d’expérience par un verbe d’action (« piloté », « conçu »).', impact: 'moyen' }
];

// ─── Fonctions de haut niveau (avec fallback) ─────────────────────────────────

export async function generateTestQuestions(input: {
	type: TestType;
	poste: string;
	niveau?: string;
}): Promise<{ questions: GeneratedQuestion[]; fallback: boolean }> {
	const { type, poste, niveau } = input;
	const prompt = `Génère 5 questions de test de type "${type}" pour évaluer un candidat sur le poste "${poste}"${
		niveau ? ` (niveau ${niveau})` : ''
	}.
Chaque question a EXACTEMENT 4 options et une seule bonne réponse.
Réponds en JSON strict avec ce format :
{"questions":[{"q":"...","options":["...","...","...","..."],"answer":0}]}
"answer" est l'index (0 à 3) de la bonne option.`;

	try {
		const raw = await callOpenAI(prompt, 1500);
		const parsed = parseJson<{ questions: GeneratedQuestion[] }>(raw);
		const questions = (parsed.questions ?? [])
			.filter((q) => q && Array.isArray(q.options) && q.options.length === 4)
			.map((q) => ({
				q: String(q.q),
				options: q.options.map(String),
				answer: Math.max(0, Math.min(3, Number(q.answer) || 0))
			}))
			.slice(0, 5);
		if (questions.length >= 3) return { questions, fallback: false };
		return { questions: FALLBACK_QUESTIONS[type], fallback: true };
	} catch (e) {
		console.error('generateTestQuestions failed, using fallback:', e);
		return { questions: FALLBACK_QUESTIONS[type], fallback: true };
	}
}

export async function cvSuggestions(input: {
	content: string;
	poste: string;
}): Promise<{ suggestions: CvSuggestion[]; fallback: boolean }> {
	const { content, poste } = input;
	const prompt = `Analyse ce CV pour le poste cible "${poste}" et propose 4 conseils d'amélioration personnalisés.
CV :
"""
${content.slice(0, 4000)}
"""
Réponds en JSON strict avec ce format :
{"suggestions":[{"title":"...","detail":"...","impact":"fort"}]}
"impact" vaut "fort" ou "moyen".`;

	try {
		const raw = await callOpenAI(prompt, 1200);
		const parsed = parseJson<{ suggestions: CvSuggestion[] }>(raw);
		const suggestions = (parsed.suggestions ?? [])
			.filter((s) => s && s.title)
			.map((s) => ({
				title: String(s.title),
				detail: String(s.detail ?? ''),
				impact: s.impact === 'fort' ? 'fort' : ('moyen' as 'fort' | 'moyen')
			}))
			.slice(0, 6);
		if (suggestions.length) return { suggestions, fallback: false };
		return { suggestions: FALLBACK_SUGGESTIONS, fallback: true };
	} catch (e) {
		console.error('cvSuggestions failed, using fallback:', e);
		return { suggestions: FALLBACK_SUGGESTIONS, fallback: true };
	}
}
