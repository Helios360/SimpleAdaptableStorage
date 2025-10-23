Salut jeune dev de Cloud Campus voici comment mettre en place l'image du site :
    NORMALEMENT le fichier install.sh devrait être suffisant . . .

I/ Créer un fichier .env sous cette forme :

PORT=3000
HOST=0.0.0.0

MYSQL_HOST=mysql
MYSQL_USER=mysql
MYSQL_DATABASE=$DB_NAME
MYSQL_PASSWORD=$PASS
MYSQL_ROOT_PASSWORD=$ROOT_PASS

JWT_SECRET=$SECRET
OPENAI_API_KEY=$API

Evidement tout est modifiable pour peut que tu modifies les bonnes variables dans le serveur node est la config docker

Démarer le service : sudo docker compose --build

Fermer le service : sudo docker compose down (ex: Change .env)

Redemarer l'app seulement : 
    >>> docker compose stop app
    >>> docker compose rm -f app
    >>> docker compose up -d app

!!! supprimer la base de donnée : sudo docker volume rm simplepeoplestoring_db-data !!!

II/ Stockage et base de donnée
Ne jamais reconstruire avec le -v flag !!

Pour acceder a la bdd il faut etre dans le dir du projet puis
    mysql -h 127.0.0.1 -P 3307 -u root -p Main
    Cette commande permet d'acceder a la console mysql du docker, elle est pérsitente a travers les reboot (normalement)
    Tu peux faire ce que tu veux dessus comme des backups lolilol


Pour créer des tests:
CREATE TABLE IF NOT EXISTS Tests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(200),
    answer VARCHAR(1000),
    type TINYINT,
    exemple VARCHAR(500),
    hint VARCHAR(255),
    difficulty TINYINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

Make multiple Tests creation queries
5 Tests about frontend = 1
5 Tests about backend = 2
5 Psychotechnical Tests = 3
In 3 difficulties
1 = easy 
2 = medium
3 = hard

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is the purpose of the "alt" attribute in HTML?',
'The "alt" attribute provides alternative text for an image if it cannot be displayed, and is also used by screen readers for accessibility.',
1,
'<img src="image.jpg" alt="A red apple">',
'Think about accessibility and what happens if the image fails to load.',
1);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('How do you center a div horizontally and vertically using CSS?',
'Use `display: flex; justify-content: center; align-items: center;` on the parent element.',
1,
'.parent { display: flex; justify-content: center; align-items: center; }',
'Flexbox is a powerful tool for alignment.',
2);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is the difference between "==" and "===" in JavaScript?',
'"==" checks for equality after type conversion, while "===" checks for strict equality without type conversion.',
1,
'5 == "5" // true\n5 === "5" // false',
'Think about type coercion.',
3);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is the Virtual DOM in React?',
'The Virtual DOM is a lightweight copy of the real DOM, used by React to improve performance by minimizing direct DOM updates.',
1,
'React updates the Virtual DOM first, then only changes the real DOM where necessary.',
'It helps optimize rendering.',
1);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is the purpose of the "useEffect" hook in React?',
'The "useEffect" hook allows you to perform side effects in functional components, such as data fetching, subscriptions, or manually changing the DOM.',
1,
'useEffect(() => { fetchData(); }, []);',
'It runs after render and can be controlled with dependencies.',
2);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is the difference between GET and POST HTTP methods?',
'GET is used to request data from a specified resource, while POST is used to send data to a server to create or update a resource.',
2,
'GET /users\nPOST /users { "name": "John" }',
'GET is idempotent, POST is not.',
1);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is middleware in Express.js?',
'Middleware are functions that have access to the request and response objects, and the next middleware function in the application’s request-response cycle.',
2,
'app.use((req, res, next) => { console.log("Middleware"); next(); });',
'They can modify requests and responses.',
2);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is SQL injection and how can it be prevented?',
'SQL injection is a code injection technique that might destroy your database. It can be prevented by using prepared statements and parameterized queries.',
2,
'// Bad: "SELECT * FROM users WHERE id = " + userId\n// Good: "SELECT * FROM users WHERE id = ?"',
'Never trust user input.',
3);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is the purpose of JWT in authentication?',
'JWT (JSON Web Token) is used to securely transmit information between parties as a JSON object, often used for authentication and authorization.',
2,
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
'It is stateless and can be used for single sign-on.',
2);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is the difference between REST and GraphQL?',
'REST is an architectural style for designing networked applications, while GraphQL is a query language for APIs and a runtime for fulfilling those queries with existing data.',
2,
'REST: /users, /users/1\nGraphQL: { user(id: 1) { name } }',
'GraphQL allows clients to request exactly what they need.',
3);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('If you rearrange the letters "CIFAIPC" you would have the name of a:',
'Ocean (Pacific)',
3,
'CIFAIPC → PACIFIC',
'Think of large bodies of water.',
1);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What number should come next in this pattern? 1, 1, 2, 3, 5, 8, 13, ...',
'21 (Fibonacci sequence)',
3,
'Each number is the sum of the two preceding ones.',
'Look for a mathematical relationship between numbers.',
2);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('Which one of the following does not belong: Apple, Orange, Banana, Carrot?',
'Carrot (it is a vegetable, not a fruit)',
3,
'Apple, Orange, Banana, Carrot',
'Think about categories of food.',
1);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely Lazzies. True or False?',
'True',
3,
'Bloop → Razzie → Lazzies',
'This is a logical syllogism.',
3);

INSERT INTO Tests (question, answer, type, exemple, hint, difficulty)
VALUES
('What is the missing number in the sequence: 2, 6, 12, 20, 30, ...?',
'42 (n² + n)',
3,
'2, 6, 12, 20, 30, 42',
'Look for a polynomial pattern.',
3);