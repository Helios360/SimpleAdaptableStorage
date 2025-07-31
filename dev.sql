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