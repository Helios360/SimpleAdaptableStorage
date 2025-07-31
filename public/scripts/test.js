const answer = document.getElementById('editor');
const submit = document.getElementById('submit')
const token = localStorage.getItem('token');
const start = document.getElementById('launch-test');
const popup = document.getElementById('popup');
let i = 0;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
async function redirectAfterDelay(data) {
  alert(data.message + "... Redirection ..." || 'Alerte... crash, il est toujours possible de reprendre le test la ou vous vous etes arrété... Redirection ...');
  await wait(3000);
  window.location.href = '/profile';
}

// === Step 1: Launch test (only fetch)
start.addEventListener('click', () => {
  fetch('/api/test/next', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const test = data.test;
      localStorage.setItem('current_test_id', test.id);
      localStorage.setItem('current_test_type', test.type);
      localStorage.setItem('test_count', i++);
      console.log("New test fetched:", test);
      document.getElementById('test_count').innerText = i;
      document.getElementById('exemple').innerText = test.exemple;
      document.getElementById('question').innerText = test.question;
    } else {
      redirectAfterDelay(data);
    }
  });
  popup.remove();
});

// === Step 2: Submit test
submit.addEventListener("click", event => {
  event.preventDefault();
  const answerText = editor.state.doc.toString();
  const testId = localStorage.getItem('current_test_id');
  const type = localStorage.getItem('current_test_type');

  if (!testId || !type) {
    alert("No test loaded.");
    return;
  }

  fetch('/api/test/response', {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ testId, type, answer: answerText })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      alert("Test submitted!");
      localStorage.removeItem("current_test_id");
      localStorage.removeItem("current_test_type");
    } else {
      alert("Error submitting test: " + data.message);
    }
  });
  fetch('/api/test/next', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const test = data.test;
      localStorage.setItem('current_test_id', test.id);
      localStorage.setItem('current_test_type', test.type);
      localStorage.setItem('test_count', i++);
      console.log("New test fetched:", test);
      document.getElementById('test_count').innerText = i;
      document.getElementById('exemple').innerText = test.exemple;
      document.getElementById('question').innerText = test.question;
    } else {
      redirectAfterDelay(data);
    }
  });
});
