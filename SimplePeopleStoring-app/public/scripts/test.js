const answer = document.getElementById('answer');
const submit = document.getElementById('submit')
const token = localStorage.getItem('token');
const start = document.getElementById('launch-test');
const popup = document.getElementById('popup');

async function redirectAfterDelay(data) {
  notifAlert(data.message + "... Redirection ..." || 'Alerte... crash, il est toujours possible de reprendre le test la ou vous vous êtes arrété... Redirection ...');
  await wait(3000);
  window.location.href = '/profile';
}

// === Step 1: Launch test (only fetch)
start.addEventListener('click', () => {
  fetch('/api/test/next', {
    method: 'GET',
    credentials: 'include',
    headers:{'Content-Type':'application/json'},
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const test = data.test;
      localStorage.setItem('current_test_id', test.id);
      localStorage.setItem('current_test_type', test.type);
      console.log("New test fetched:", test);
      document.getElementById('test_count').innerText = data.count;
      document.getElementById('exemple').innerText = test.exemple;
      document.getElementById('question').innerText = test.question;
    } else {
      redirectAfterDelay(data);
    }
  });
  popup.remove();
});

// === Step 2: Submit test
submit.addEventListener("click", async event => {
  event.preventDefault();

  const answerText = answer.value;
  const testId = localStorage.getItem('current_test_id');
  const type = localStorage.getItem('current_test_type');

  if (!testId || !type) {
    notifAlert("Aucun test n'est chargé.");
    return;
  }
  try {
    // send answer
    const res = await fetch('/api/test/response', {
      method: "POST",
      credentials: 'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ testId, type, answer: answerText })
    });
    const data = await res.json();

    if (!data.success) {
      notifAlert("Erreur d'envoi du test: " + data.message);
      return;
    }
    notifAlert("Test envoyé ! Passage au suivant...");
    localStorage.removeItem("current_test_id");
    localStorage.removeItem("current_test_type");

    // fetch next test
    const nextRes = await fetch('/api/test/next', {method: 'GET', credentials: 'include'});
    const nextData = await nextRes.json();

    if (nextData.success) {
      const test = nextData.test;
      localStorage.setItem('current_test_id', test.id);
      localStorage.setItem('current_test_type', test.type);
      console.log("New test fetched:", test);
      document.getElementById('test_count').innerText = nextData.count;
      document.getElementById('exemple').innerText = test.exemple;
      document.getElementById('question').innerText = test.question;
    } else {
      redirectAfterDelay(nextData);
    }
  } catch (err) {
    console.error(err);
    notifAlert("Erreur réseau pendant l'envoi.");
  }
});
