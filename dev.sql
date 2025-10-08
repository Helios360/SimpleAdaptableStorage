--Just a file to use for tests on the database
INSERT INTO Tests (question, answer, type, exemple, hint, difficulty) VALUES
('What does the CSS class selector do?',
 'It applies styles to all elements that have the specified class attribute.',
 1,
 '.btn { padding: 8px 12px; }',
 'Think of targeting elements by their class name with a dot.',
 1),

('What is the purpose of the alt attribute on an <img> tag?',
 'It provides alternative text for accessibility and when the image cannot be loaded.',
 1,
 '<img src=\"/img/product.jpg\" alt=\"Blue running shoes\">',
 'Consider screen readers and broken image links.',
 1),

('How do you attach a click handler to an element in vanilla JavaScript?',
 'Use addEventListener to register a callback for the \"click\" event.',
 1,
 'document.getElementById(\"buy\").addEventListener(\"click\", () => console.log(\"clicked\"));',
 'No libraries; just the DOM API.',
 1),

('What is a primary key in a relational database?',
 'A column or set of columns that uniquely identifies each row in a table.',
 2,
 'CREATE TABLE users (id INT PRIMARY KEY, email VARCHAR(255));',
 'Think unique identifier per row.',
 1),

('What does HTTP status code 404 mean?',
 'The requested resource was not found on the server.',
 2,
 'curl -I https://example.com/missing-page',
 'Client error for missing resources.',
 1),

('What is an environment variable used for in backend apps?',
 'To configure behavior (like secrets and modes) without changing the code.',
 2,
 'NODE_ENV=production PORT=8080 node server.js',
 'Configuration outside the code base.',
 1),

('What is the next number in the sequence: 2, 4, 8, 16, ?',
 '32',
 3,
 'Pattern: multiply by 2 → 2×2=4, 4×2=8, 8×2=16, 16×2=32.',
 'Think powers of two.',
 1),

('Sum of the first 10 natural numbers?',
 '55',
 3,
 'Formula: n(n+1)/2 → 10×11/2 = 55.',
 'Use the arithmetic series formula.',
 1),

('If \"If it rains, the ground is wet\" and it rains, what follows?',
 'The ground is wet (modus ponens).',
 3,
 'If P→Q and P is true, then Q is true.',
 'Basic deductive reasoning.',
 1),

('Explain CSS specificity order at a high level.',
 'Inline styles > IDs > Classes/attributes/pseudo-classes > Elements/pseudo-elements (with !important overriding within its scope).',
 1,
 '/* Example */ #title { } .title { } h1 { }',
 'Which selector “wins” when rules conflict?',
 2),

('What is the difference between debounce and throttle in JS?',
 'Debounce delays a call until activity stops; throttle limits calls to at most once per interval.',
 1,
 'const debounce = (fn, d) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), d); }; };',
 'Rate-limiting user events like scroll/resize.',
 2),

('How do you provide responsive images in HTML?',
 'Use srcset and sizes so the browser picks the best image for the viewport.',
 1,
 '<img src=\"img-800.jpg\" srcset=\"img-400.jpg 400w, img-800.jpg 800w, img-1200.jpg 1200w\" sizes=\"(max-width:600px) 400px, 800px\" alt=\"Hero\">',
 'Let the browser choose among multiple resolutions.',
 2),

('What are the ACID properties of transactions?',
 'Atomicity, Consistency, Isolation, Durability — ensuring reliable database transactions.',
 2,
 'BEGIN; UPDATE accounts SET balance=balance-100 WHERE id=1; UPDATE accounts SET balance=balance+100 WHERE id=2; COMMIT;',
 'Bank transfer with all-or-nothing semantics.',
 2),

('Difference between PUT and PATCH in REST?',
 'PUT replaces the entire resource; PATCH applies a partial update.',
 2,
 'curl -X PATCH /users/42 -H \"Content-Type: application/json\" -d \"{\\\"email\\\":\\\"a@b.com\\\"}\"',
 'Think full vs partial updates.',
 2),

('What is application-level caching and why use it?',
 'Storing computed or fetched data (e.g., in Redis) to reduce latency and load.',
 2,
 'GET key → miss → compute → SETEX key value 300s → subsequent GET hits.',
 'Trade memory for speed.',
 2),

('What is the probability of getting at least one head in two fair coin tosses?',
 '3/4 (or 75%).',
 3,
 'Sample space: {HH, HT, TH, TT} → 3 favorable out of 4.',
 'Compute complement of zero heads.',
 2),

('Find the missing number: 3, 6, 9, 15, 24, ?',
 '39',
 3,
 'Differences: +3, +3, +6, +9 → next +15 → 24+15=39.',
 'Look at the sequence of differences.',
 2),

('A is taller than B, B is taller than C. Who is tallest?',
 'A is tallest.',
 3,
 'Order: A > B > C.',
 'Transitive comparison.',
 2),

('Describe the browser event loop ordering between microtasks and macrotasks.',
 'After executing a task, the event loop drains the microtask queue (Promises/MutationObserver) before running the next macrotask (setTimeout, message, I/O).',
 1,
 'setTimeout(()=>console.log(\"macro\")); Promise.resolve().then(()=>console.log(\"micro\")); // logs: micro then macro',
 'Consider Promises vs setTimeout.',
 3),

('How do you make dynamic updates accessible to screen readers?',
 'Use ARIA live regions or appropriate roles to announce content changes.',
 1,
 '<div aria-live=\"polite\" id=\"status\"></div> // later: status.textContent = \"Saved\";',
 'Assistive tech needs change announcements.',
 3),

('How can you reduce Cumulative Layout Shift (CLS) in a page?',
 'Reserve space for content, set width/height on media, preload critical fonts, and avoid inserting content above existing content.',
 1,
 '<img src=\"card.jpg\" width=\"640\" height=\"360\" alt=\"Card\">',
 'Prevent unexpected reflow during load.',
 3),

('Explain READ COMMITTED vs SERIALIZABLE isolation and phantom reads.',
 'READ COMMITTED prevents dirty reads but allows non-repeatable and phantom reads; SERIALIZABLE prevents them by making transactions appear sequential.',
 2,
 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE; -- run range queries without phantoms',
 'Think anomalies across concurrent transactions.',
 3),

('What is an idempotency key and why use it for POST endpoints?',
 'A unique client-sent token so that retrying the same request does not create duplicate effects.',
 2,
 'POST /payments with Idempotency-Key: 9f… → server stores result keyed by that value.',
 'Network retries without double-charging.',
 3),

('Compare at-least-once and exactly-once processing in distributed systems.',
 'At-least-once may deliver duplicates; exactly-once aims to process each message once (often via idempotency + dedup/transactions).',
 2,
 'Consumer stores processed IDs or uses transactional consume→process→commit.',
 'Delivery vs processing semantics — duplicates?',
 3),
('A test is 99% accurate; disease prevalence is 1%. If you test positive, what is the approximate probability you have the disease?',
 'About 50% (more precisely ~50.0% assuming 1% false positive rate).',
 3,
 'Out of 10,000: 100 sick → ~99 true positive; 9,900 healthy → ~99 false positive → 99/(99+99) ≈ 50%.',
 'Apply Bayes’ theorem with base rates.',
 3),

('You have a 3L and a 5L jug and unlimited water. How to measure exactly 4L?',
 'Fill 5L → pour into 3L (leaves 2L). Empty 3L. Pour 2L into 3L. Refill 5L → pour into 3L until full (you transfer 1L), leaving exactly 4L in the 5L jug.',
 3,
 'State transitions of jug volumes.',
 'Think backward from 4L in the 5L jug.',
 3),

('In a 3×3 magic square using 1–9, what is the magic constant?',
 '15',
 3,
 'Sum = 1+…+9 = 45; rows=3 → 45/3 = 15.',
 'Use total sum divided by number of rows.',
 3);

select * from Tests\G select * from Users\G select * from TestAttempts\G
DESCRIBE Tests; DESCRIBE Users; DESCRIBE TestAttempts;
INSERT INTO Users (
  name, fname, email, tel, addr, city,
  postal, birth, password, agree,
  date_inscription, tags, skills, status, is_admin
) VALUES (
  'Barakat',
  'Abdelkader',
  'barakat123@example.com',
  '0612345678',
  '123 Rue du Cloud',
  'Casablanca',
  '20000',
  '1990-08-01',
  '$2b$10$abc123fakehashedpass',
  1,
  NOW(),
  '["informatique", "cloud"]',
  '["Node.js", "SQL", "DevOps"]',
  1,
  0
);
INSERT INTO Users (
  name, fname, email, tel, addr, city,
  postal, birth, password, agree,
  date_inscription, tags, skills, status, is_admin
) VALUES (
  'Labbé', 'Louise', 'louise.labbé0@example.com', '0803300868', '89, chemin Élisabeth Bernier', 'Françoisboeuf',
  '20527', '2001-01-13', '1f489582f7ea4c208b70219a2bb6a322227a7516630530a10ed7f2710cfbe447', 1,
  NOW(), '["finance", "cloud"]', '["Node.js", "SQL", "Docker"]', 1, 0
);

INSERT INTO Users (
  name, fname, email, tel, addr, city,
  postal, birth, password, agree,
  date_inscription, tags, skills, status, is_admin
) VALUES (
  'Daniel', 'Jérôme', 'jérôme.daniel1@example.com', '0650392816', '1, avenue Gérard Étienne', 'Lemoine',
  '72612', '1993-01-14', '0b14d501a594442a01c6859541bcb3e8164d183d32937b851835442f69d5c94e', 0,
  NOW(), '["finance", "business"]', '["Node.js", "DevOps", "Docker"]', 0, 0
);

INSERT INTO Users (
  name, fname, email, tel, addr, city,
  postal, birth, password, agree,
  date_inscription, tags, skills, status, is_admin
) VALUES (
  'Masse', 'Yves', 'yves.masse2@example.com', '+33571521886', '45, chemin Lombard', 'Saint Augustin',
  '09844', '2000-04-10', '6cf615d5bcaac778352a8f1f3360d23f02f34ec182e259897fd6ce485d7870d4', 1,
  NOW(), '["informatique", "marketing"]', '["DevOps", "SQL", "Node.js"]', 1, 0
);

INSERT INTO Users (
  name, fname, email, tel, addr, city,
  postal, birth, password, agree,
  date_inscription, tags, skills, status, is_admin
) VALUES (
  'Lejeune', 'Michelle', 'michelle.lejeune3@example.com', '0309675630', '624, boulevard Hardy', 'Pereira',
  '78570', '1991-10-29', '5906ac361a137e2d286465cd6588ebb5ac3f5ae955001100bc41577c3d751764', 0,
  NOW(), '["finance", "marketing"]', '["DevOps", "React", "SQL"]', 0, 0
);

SELECT 
  Users.*,
  ROUND(AVG(TestAttempts.score))
  FROM Users
  LEFT JOIN TestAttempts ON Users.id = TestAttempts.user_id
  GROUP BY Users.id
  ;