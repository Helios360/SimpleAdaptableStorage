document.getElementById('sub').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = e.target.email.value;

  const response = await fetch('/reset/request', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email })
  });

  const data = await response.json();
  notif(data.message || "Si le mail existe, un lien de reset a été envoyé")
});
