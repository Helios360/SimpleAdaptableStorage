SET NAMES utf8mb4;

INSERT INTO Formations ( code, name ) VALUES
('bts_ndrc', 'BTS NDRC'),
('tp_ntc', 'TP NTC'),
('dev_web_fs', 'Dev Web Fullstack'),
('si_cybersec_expert', 'Expert en systèmes information et sécurité'),
('bts_gpme', 'BTS GPME'),
('cap_aepe', 'CAP AEPE'),
('bts_optique', 'BTS Opticien Lunettier');

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('Que signifie HTML ?', 'HyperText Markup Language', 1, 1),
('Quelle balise HTML crée un paragraphe ?', '<p>', 1, 1),
('Quelle propriété CSS change la couleur du texte ?', 'color', 1, 1),
('À quoi sert le CSS ?', 'À styliser les pages web', 1, 1),
('Quel langage est utilisé pour le web interactif ?', 'JavaScript', 1, 1);

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('Qu’est-ce que le DOM ?', 'La structure arborescente d’une page web', 1, 2),
('À quoi sert Flexbox ?', 'À créer des mises en page flexibles', 1, 2),
('Quelle est la différence entre class et id ?', 'id est unique, class ne l’est pas', 1, 2),
('Que fait querySelector ?', 'Sélectionne un élément HTML', 1, 2),
('À quoi sert une media query ?', 'Adapter le style selon l’écran', 1, 2);

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('Différence entre == et === ?', '=== compare valeur et type', 1, 3),
('Qu’est-ce que le Virtual DOM ?', 'Une copie optimisée du DOM réel', 1, 3),
('Explique le concept de SPA', 'Application web sur une seule page', 1, 3),
('Qu’est-ce qu’un hook en React ?', 'Une fonction pour gérer l’état et le cycle de vie', 1, 3),
('À quoi sert le lazy loading ?', 'Charger les ressources à la demande', 1, 3);

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('Qu’est-ce qu’un serveur ?', 'Une machine qui fournit des services', 2, 1),
('Que signifie SQL ?', 'Structured Query Language', 2, 1),
('Qu’est-ce qu’une base de données ?', 'Un système de stockage de données', 2, 1),
('Que signifie CRUD ?', 'Create Read Update Delete', 2, 1),
('Quel langage est souvent utilisé côté serveur ?', 'PHP ou NodeJS', 2, 1);

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('Qu’est-ce qu’une API ?', 'Interface de communication entre applications', 2, 2),
('Qu’est-ce que REST ?', 'Une architecture basée sur HTTP', 2, 2),
('À quoi sert une clé primaire ?', 'Identifier une ligne de façon unique', 2, 2),
('Qu’est-ce qu’un middleware ?', 'Un intermédiaire entre requête et answer', 2, 2),
('Qu’est-ce qu’une requête HTTP GET ?', 'Une requête pour récupérer des données', 2, 2);

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('À quoi sert un index en base de données ?', 'Accélérer les recherches', 2, 3),
('Différence entre authentification et autorisation ?', 'Identité vs permissions', 2, 3),
('Qu’est-ce qu’un ORM ?', 'Outil de mapping objet-relationnel', 2, 3),
('Explique l’architecture MVC', 'Séparation modèle vue contrôleur', 2, 3),
('Qu’est-ce qu’un webhook ?', 'Un appel automatique via HTTP', 2, 3);

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('Suite logique : 1, 2, 3, 4 ?', '5', 3, 1),
('Combien font 5 + 3 ?', '8', 3, 1),
('Quel est le contraire de grand ?', 'Petit', 3, 1),
('Si tous les chiens sont des animaux, le chien est-il un animal ?', 'Oui', 3, 1),
('Quelle forme a une roue ?', 'Ronde', 3, 1);

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('Quel est l’intrus : Chat, Chien, Pomme, Cheval ?', 'Pomme', 3, 2),
('Suite logique : 2, 4, 8, 16 ?', '32', 3, 2),
('Paul est plus grand que Marc, Marc plus grand que Luc. Qui est le plus petit ?', 'Luc', 3, 2),
('Combien de côtés a un hexagone ?', '6', 3, 2),
('Si hier était lundi, quel jour est demain ?', 'Mercredi', 3, 2);

INSERT INTO Tests (question, answer, type, difficulty) VALUES
('Un père a 4 fils, chaque fils a une sœur. Combien d’enfants ?', '5', 3, 3),
('Angle entre les aiguilles à 3h15 ?', '7,5 degrés', 3, 3),
('Suite logique : 1, 1, 2, 3, 5 ?', '8', 3, 3),
('Si 5 machines font 5 objets en 5 minutes, combien pour 100 objets ?', '5 minutes', 3, 3),
('Complète : A C E G ?', 'I', 3, 3);