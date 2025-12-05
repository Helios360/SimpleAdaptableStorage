document.getElementById('sub').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = e.target.email.value;
  const password = e.target.password.value;

  const response = await fetch('/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  
  if (data.success) {
    window.location.href=data.redirectTo;
  } else {
    notif(data.message || 'Login failed');
  }
});