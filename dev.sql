--Just a file to use for tests on the database
INSERT INTO Tests (question, type, exemple, hint) VALUES ("What is the capital of France?", "frontend", "Paris", "Think about major European cities");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("How do you center a div in CSS?", "frontend", "Use flexbox or margin: auto;", "Consider modern layout techniques");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("What is the output of console.log(2 + '2') in JavaScript?", "frontend", "22", "Think about type coercion");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("Explain the box model in CSS", "frontend", "Content, padding, border, margin", "Visualize a box with layers");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("What is the difference between let and const in JavaScript?", "frontend", "let is reassignable, const is not", "Think about variable declaration");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("How do you make an API call in React?", "frontend", "Use fetch or axios", "Consider lifecycle methods or hooks");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("Write a SQL query to find the second highest salary", "backend", "SELECT MAX(salary) FROM employees WHERE salary NOT IN (SELECT MAX(salary) FROM employees);", "Think about subqueries");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("Explain RESTful API principles", "backend", "Stateless, resource-based, HTTP methods", "Think about web standards");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("What is middleware in Express.js?", "backend", "Functions that have access to the request and response objects", "Think about the request-response cycle");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("How do you handle file uploads in Node.js?", "backend", "Use multer middleware", "Consider multipart/form-data");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("What is the purpose of indexing in databases?", "backend", "Improve query performance", "Think about data retrieval speed");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("Explain the concept of ACID in database transactions", "backend", "Atomicity, Consistency, Isolation, Durability", "Think about reliable transactions");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?", "psychotechnique", "5 minutes", "Think about parallel processing");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("In a race, you overtake the second person. What position are you in?", "psychotechnique", "Second", "Visualize the race scenario");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("A man builds a house with all four walls facing south. A bear walks by. What color is the bear?", "psychotechnique", "White", "Think about the Earth's geography");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("If you have a bowl with six apples and you take away four, how many do you have?", "psychotechnique", "4", "Focus on the action of taking");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("A farmer has 17 sheep, and all but 9 die. How many are left?", "psychotechnique", "9", "Pay attention to the wording");
INSERT INTO Tests (question, type, exemple, hint) VALUES ("If you're running a race and you pass the person in 2nd place, what place are you in?", "psychotechnique", "2nd place", "Visualize the positions in the race");

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