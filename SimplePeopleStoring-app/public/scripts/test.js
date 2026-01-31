const answer = document.getElementById('answer');
const submit = document.getElementById('submit')
const start = document.getElementById('launch-test');
const popup = document.getElementById('popup');
const loader = document.getElementById('loader');
const mainContent = document.getElementById('main');  
async function redirectAfterDelay(data) {
  notifAlert(data.message + "... Redirection ..." || 'Alerte... crash, il est toujours possible de reprendre le test la ou vous en êtes arrété... Redirection ...');
  await wait(3000);
  window.location.href = '/profile';
}
function setLoading(isLoading){
  loader.style.display = isLoading ? 'flex' : 'none';
  submit.style.pointerEvents = isLoading ? 'none' : 'auto';
  start.style.pointerEvents = isLoading ? 'none' : 'auto';
  document.body.style.cursor = isLoading ? 'wait' : 'default';
  mainContent.style.opacity = isLoading ? '0.5' : '1';
}
// === Step 1: Launch test (only fetch)
start.addEventListener('click', async () => {
  setLoading(true);
  try {
    const res = await fetch('/api/test/next', {
      method: 'GET',
      headers:{'Content-Type':'application/json'},
    })
    const data = await res.json();
    if (data.success) {
      const test = data.test;
      localStorage.setItem('current_test_id', test.id);
      localStorage.setItem('current_test_type', test.type);
      document.getElementById('test_count').innerText = data.count;
      document.getElementById('question').innerText = test.question;
      popup?.remove();
    } else {
      await redirectAfterDelay(data);
    }
  } catch(e){
    console.error(e);
    notifAlert('Erreur réseau pendant le chargement du test.')
  } finally {setLoading(false);}
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
  setLoading(true);
  try {
    // Send answer
    const res = await fetch('/api/test/response', {
      method: "POST",
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ testId, type, answer: answerText })
    });
    const data = await res.json();

    if (!data.success) {
      notifAlert("Erreur d'envoi du test: " + data.message);
      return;
    }
    localStorage.removeItem("current_test_id");
    localStorage.removeItem("current_test_type");

    // fetch next test
    const nextRes = await fetch('/api/test/next', {method: 'GET'});
    const nextData = await nextRes.json();

    if (nextData.success) {
      const test = nextData.test;
      localStorage.setItem('current_test_id', test.id);
      localStorage.setItem('current_test_type', test.type);
      console.log("New test fetched:", test);
      document.getElementById('test_count').innerText = nextData.count;
      document.getElementById('question').innerText = test.question;
      answer.value='';
    } else {
      redirectAfterDelay(nextData);
    }
  } catch (err) {
    console.error(err);
    notifAlert("Erreur réseau pendant l'envoi.");
  } finally {setLoading(false);}
});