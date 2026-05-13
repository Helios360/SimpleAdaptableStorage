const params = new URLSearchParams(window.location.search);
const email = params.get("email");
const token = params.get("token");

document.getElementById('sub').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!email || !token) {
        notif("Lien de réinitialisation invalide (token/email manquant)");
        return;
    }
    const password = e.target.password.value;
    const response = await fetch('/reset/confirm', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password, email, token })
    });

    const data = await response.json();
    if (data.success) {
        notif("Mot de passe réinitialisé avec succès");
        setTimeout(() => { window.location.href = "/signin"; }, 1500);
    } else {
        notif(data.message || "Lien invalide ou expiré");
    }
});
