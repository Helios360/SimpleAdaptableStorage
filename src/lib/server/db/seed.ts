import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { formations, tests } from './schema';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const client = postgres(url, { max: 1 });
const db = drizzle(client);

await db.insert(formations).values([
  { code: 'bts_ndrc', name: 'BTS NDRC' },
  { code: 'tp_ntc', name: 'TP NTC' },
  { code: 'dev_web_fs', name: 'Dev Web Fullstack' },
  { code: 'si_cybersec_expert', name: 'Expert en systèmes information et sécurité' },
  { code: 'bts_gpme', name: 'BTS GPME' },
  { code: 'cap_aepe', name: 'CAP AEPE' },
  { code: 'bts_optique', name: 'BTS Opticien Lunettier' }
]).onConflictDoNothing();

await db.insert(tests).values([
  // Frontend — easy
  { question: 'Que signifie HTML ?', answer: 'HyperText Markup Language', type: 1, difficulty: 1 },
  { question: 'Quelle balise HTML crée un paragraphe ?', answer: '<p>', type: 1, difficulty: 1 },
  { question: 'Quelle propriété CSS change la couleur du texte ?', answer: 'color', type: 1, difficulty: 1 },
  { question: 'À quoi sert le CSS ?', answer: 'À styliser les pages web', type: 1, difficulty: 1 },
  { question: 'Quel langage est utilisé pour le web interactif ?', answer: 'JavaScript', type: 1, difficulty: 1 },
  // Frontend — medium
  { question: "Qu'est-ce que le DOM ?", answer: "La structure arborescente d'une page web", type: 1, difficulty: 2 },
  { question: 'À quoi sert Flexbox ?', answer: 'À créer des mises en page flexibles', type: 1, difficulty: 2 },
  { question: 'Quelle est la différence entre class et id ?', answer: "id est unique, class ne l'est pas", type: 1, difficulty: 2 },
  { question: 'Que fait querySelector ?', answer: 'Sélectionne un élément HTML', type: 1, difficulty: 2 },
  { question: 'À quoi sert une media query ?', answer: "Adapter le style selon l'écran", type: 1, difficulty: 2 },
  // Frontend — hard
  { question: 'Différence entre == et === ?', answer: '=== compare valeur et type', type: 1, difficulty: 3 },
  { question: "Qu'est-ce que le Virtual DOM ?", answer: 'Une copie optimisée du DOM réel', type: 1, difficulty: 3 },
  { question: 'Explique le concept de SPA', answer: 'Application web sur une seule page', type: 1, difficulty: 3 },
  { question: "Qu'est-ce qu'un hook en React ?", answer: "Une fonction pour gérer l'état et le cycle de vie", type: 1, difficulty: 3 },
  { question: 'À quoi sert le lazy loading ?', answer: 'Charger les ressources à la demande', type: 1, difficulty: 3 },
  // Backend — easy
  { question: "Qu'est-ce qu'un serveur ?", answer: 'Une machine qui fournit des services', type: 2, difficulty: 1 },
  { question: 'Que signifie SQL ?', answer: 'Structured Query Language', type: 2, difficulty: 1 },
  { question: "Qu'est-ce qu'une base de données ?", answer: 'Un système de stockage de données', type: 2, difficulty: 1 },
  { question: 'Que signifie CRUD ?', answer: 'Create Read Update Delete', type: 2, difficulty: 1 },
  { question: 'Quel langage est souvent utilisé côté serveur ?', answer: 'PHP ou NodeJS', type: 2, difficulty: 1 },
  // Backend — medium
  { question: "Qu'est-ce qu'une API ?", answer: 'Interface de communication entre applications', type: 2, difficulty: 2 },
  { question: "Qu'est-ce que REST ?", answer: 'Une architecture basée sur HTTP', type: 2, difficulty: 2 },
  { question: 'À quoi sert une clé primaire ?', answer: 'Identifier une ligne de façon unique', type: 2, difficulty: 2 },
  { question: "Qu'est-ce qu'un middleware ?", answer: 'Un intermédiaire entre requête et réponse', type: 2, difficulty: 2 },
  { question: "Qu'est-ce qu'une requête HTTP GET ?", answer: 'Une requête pour récupérer des données', type: 2, difficulty: 2 },
  // Backend — hard
  { question: 'À quoi sert un index en base de données ?', answer: 'Accélérer les recherches', type: 2, difficulty: 3 },
  { question: 'Différence entre authentification et autorisation ?', answer: 'Identité vs permissions', type: 2, difficulty: 3 },
  { question: "Qu'est-ce qu'un ORM ?", answer: 'Outil de mapping objet-relationnel', type: 2, difficulty: 3 },
  { question: "Explique l'architecture MVC", answer: 'Séparation modèle vue contrôleur', type: 2, difficulty: 3 },
  { question: "Qu'est-ce qu'un webhook ?", answer: 'Un appel automatique via HTTP', type: 2, difficulty: 3 },
  // Psychotechnical — easy
  { question: 'Suite logique : 1, 2, 3, 4 ?', answer: '5', type: 3, difficulty: 1 },
  { question: 'Combien font 5 + 3 ?', answer: '8', type: 3, difficulty: 1 },
  { question: "Quel est le contraire de grand ?", answer: 'Petit', type: 3, difficulty: 1 },
  { question: 'Si tous les chiens sont des animaux, le chien est-il un animal ?', answer: 'Oui', type: 3, difficulty: 1 },
  { question: 'Quelle forme a une roue ?', answer: 'Ronde', type: 3, difficulty: 1 },
  // Psychotechnical — medium
  { question: "Quel est l'intrus : Chat, Chien, Pomme, Cheval ?", answer: 'Pomme', type: 3, difficulty: 2 },
  { question: 'Suite logique : 2, 4, 8, 16 ?', answer: '32', type: 3, difficulty: 2 },
  { question: 'Paul est plus grand que Marc, Marc plus grand que Luc. Qui est le plus petit ?', answer: 'Luc', type: 3, difficulty: 2 },
  { question: 'Combien de côtés a un hexagone ?', answer: '6', type: 3, difficulty: 2 },
  { question: 'Si hier était lundi, quel jour est demain ?', answer: 'Mercredi', type: 3, difficulty: 2 },
  // Psychotechnical — hard
  { question: "Un père a 4 fils, chaque fils a une sœur. Combien d'enfants ?", answer: '5', type: 3, difficulty: 3 },
  { question: 'Angle entre les aiguilles à 3h15 ?', answer: '7,5 degrés', type: 3, difficulty: 3 },
  { question: 'Suite logique : 1, 1, 2, 3, 5 ?', answer: '8', type: 3, difficulty: 3 },
  { question: 'Si 5 machines font 5 objets en 5 minutes, combien pour 100 objets ?', answer: '5 minutes', type: 3, difficulty: 3 },
  { question: 'Complète : A C E G ?', answer: 'I', type: 3, difficulty: 3 }
]).onConflictDoNothing();

console.log('Seeded formations and tests.');
await client.end();
