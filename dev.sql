--Just a file to use for tests on the database
INSERT INTO Tests (question, type, hint, answer) VALUES ("What is the capital of France?", "frontend", "Think about major European cities", "Paris");
INSERT INTO Tests (question, type, hint, answer) VALUES ("How do you center a div in CSS?", "frontend", "Consider modern layout techniques", "Use flexbox or margin: auto;");
INSERT INTO Tests (question, type, hint, answer) VALUES ("What is the output of console.log(2 + '2') in JavaScript?", "frontend", "Think about type coercion", "22");
INSERT INTO Tests (question, type, hint, answer) VALUES ("Explain the box model in CSS", "frontend", "Visualize a box with layers", "Content, padding, border, margin");
INSERT INTO Tests (question, type, hint, answer) VALUES ("What is the difference between let and const in JavaScript?", "frontend", "Think about variable declaration", "let is reassignable, const is not");
INSERT INTO Tests (question, type, hint, answer) VALUES ("How do you make an API call in React?", "frontend", "Consider lifecycle methods or hooks", "Use fetch or axios");
INSERT INTO Tests (question, type, hint, answer) VALUES ("Write a SQL query to find the second highest salary", "backend", "Think about subqueries", "SELECT MAX(salary) FROM employees WHERE salary NOT IN (SELECT MAX(salary) FROM employees);");
INSERT INTO Tests (question, type, hint, answer) VALUES ("Explain RESTful API principles", "backend", "Think about web standards", "Stateless, resource-based, HTTP methods");
INSERT INTO Tests (question, type, hint, answer) VALUES ("What is middleware in Express.js?", "backend", "Think about the request-response cycle", "Functions that have access to the request and response objects");
INSERT INTO Tests (question, type, hint, answer) VALUES ("How do you handle file uploads in Node.js?", "backend", "Consider multipart/form-data", "Use multer middleware");
INSERT INTO Tests (question, type, hint, answer) VALUES ("What is the purpose of indexing in databases?", "backend", "Think about data retrieval speed", "Improve query performance");
INSERT INTO Tests (question, type, hint, answer) VALUES ("Explain the concept of ACID in database transactions", "backend", "Think about reliable transactions", "Atomicity, Consistency, Isolation, Durability");
INSERT INTO Tests (question, type, hint, answer) VALUES ("If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?", "psychotechnique", "Think about parallel processing", "5 minutes");
INSERT INTO Tests (question, type, hint, answer) VALUES ("In a race, you overtake the second person. What position are you in?", "psychotechnique", "Visualize the race scenario", "Second");
INSERT INTO Tests (question, type, hint, answer) VALUES ("A man builds a house with all four walls facing south. A bear walks by. What color is the bear?", "psychotechnique", "Think about the Earth's geography", "White");
INSERT INTO Tests (question, type, hint, answer) VALUES ("If you have a bowl with six apples and you take away four, how many do you have?", "psychotechnique", "Focus on the action of taking", "4");
INSERT INTO Tests (question, type, hint, answer) VALUES ("A farmer has 17 sheep, and all but 9 die. How many are left?", "psychotechnique", "Pay attention to the wording", "9");
INSERT INTO Tests (question, type, hint, answer) VALUES ("If you're running a race and you pass the person in 2nd place, what place are you in?", "psychotechnique", "Visualize the positions in the race", "2nd place");

select * from Tests\G select * from Users\G select * from Histories\G

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