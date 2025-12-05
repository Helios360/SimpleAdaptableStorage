document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    const password = document.getElementById("password");
    const confirm = document.getElementById("confirm");
    const message = document.getElementById("password-message")
    const telInput = document.getElementById('tel');
    telInput.addEventListener('input', () => {
        telInput.value = telInput.value.replace(/\s+/g, "");
    })

    const togglePwd = document.getElementById('pwdEye');
    togglePwd.addEventListener('click', ()=>{
        const type = password.getAttribute('type') === "password" ? "text" : "password";
        password.setAttribute('type', type);
    })
    const toggleConf = document.getElementById('confirmEye');
    toggleConf.addEventListener('click', ()=>{
        const type = confirm.getAttribute('type') === "password" ? "text" : "password";
        confirm.setAttribute('type', type);
    })

    // Vérification mot de passe et confirmation
    function checkPasswordMatch() {
        if (confirm.value === "") {
            message.textContent = "";
            return false;
        }
        if (password.value === confirm.value) {
            message.textContent = "✔️ Les mots de passe correspondent";
            message.style.color = "green";
            return true;
        } else {
            message.textContent = "❌ Les mots de passe ne correspondent pas";
            message.style.color = "red";
            return false;
        }
    }

    password.addEventListener("input", checkPasswordMatch);
    confirm.addEventListener("input", checkPasswordMatch);

    // Vérification email
    function validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    // Vérification téléphone (10 chiffres minimum)
    function validatePhone(phone) {
        if (typeof phone !== 'string') return false;
        const normalize = phone.replace(/[\s\-()]/g, "");
        const regex = /^0[1-9][0-9]{8}$/;
        return regex.test(normalize);
    }
    function validatePostal(postal) {
        if (typeof postal !== 'string') return false;
        const normalize = postal.replace(/\s+/g, "");
        const regex = /^(0[1-9]|[1-8][0-9]|9[0-8])[0-9]{3}$/;
        return regex.test(normalize);
    }
    // Vérification nom/prénom (lettres uniquement)
    function validateName(name) {
        const regex = /^[A-Za-zÀ-ÖØ-öø-ÿ\s\-]+$/;
        return regex.test(name);
    }

    // Vérification date de naissance (18 ans minimum)
    function validateBirth(dateString) {
        const birthDate = new Date(dateString);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        return age > 18 || (age === 18 && m >= 0);
    }

    // Vérification fichiers
    function validateFile(input, allowedExtensions, maxSizeMB) {
      if (!input.files.length) return false;
      const file = input.files[0];

      // Vérification extension
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) return false;

      // Vérification taille
      const maxSizeBytes = maxSizeMB * 1024 * 1024; 
      if (file.size > maxSizeBytes || file.size == 0) {
          return false;
      }
      return true;
    }

    // Validation globale avant envoi
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        let valid = true;
        let errors = [];

        // Nom et prénom
        if (!validateName(document.getElementById("name").value)) {
            valid = false;
            errors.push("Nom invalide (lettres uniquement).");
        }
        if (!validateName(document.getElementById("fname").value)) {
            valid = false;
            errors.push("Prénom invalide (lettres uniquement).");
        }

        // Email
        if (!validateEmail(document.getElementById("email").value)) {
            valid = false;
            errors.push("Email invalide.");
        }

        // Téléphone
        if (!validatePhone(document.getElementById("tel").value)) {
            valid = false;
            errors.push("Téléphone invalide (10 chiffres).");
        }

        // Adresse, ville et code postal
        if (!document.getElementById("addr").value.trim()) {
            valid = false;
            errors.push("Adresse obligatoire.");
        }
        if (!document.getElementById("city").value.trim()) {
            valid = false;
            errors.push("Ville obligatoire.");
        }
        if (!validatePostal(document.getElementById("postal").value)) {
            valid = false;
            errors.push("Code postal invalide (5 chiffres).");
        }


        // Date de naissance
        if (!validateBirth(document.getElementById("birth").value)) {
            valid = false;
            errors.push("Vous devez avoir au moins 18 ans.");
        }

        // Fichiers
        if (!validateFile(document.getElementById("cv"), ["pdf"], 2)) {
            valid = false;
            errors.push("CV invalide ou manquant (PDF uniquement, max 2 Mo).");
        }
        if (!validateFile(document.getElementById("id_doc"), ["jpg", "png"], 3)) {
            valid = false;
            errors.push("Pièce d'identité recto invalide ou manquante (JPG/PNG, max 3 Mo).");
        }
        if (!validateFile(document.getElementById("id_doc_verso"), ["jpg", "png"], 3)) {
            valid = false;
            errors.push("Pièce d'identité verso invalide ou manquant (JPG/PNG, max 3 Mo).");
        }
        const fileAuth = document.getElementById('stateWorkAuth').files[0];
        if (fileAuth) {
            const ext = fileAuth.name.split('.').pop().toLowerCase();
            if (ext !== "pdf") {
                valid = false;
                errors.push("Extension autorisation de travail invalide (PDF, max 2 Mo).");
            }
            const maxSizeBytes = 2 * 1024 * 1024; 
            if (fileAuth.size > maxSizeBytes) {
                valid = false;
                errors.push("Taille autorisation de travail invalide (PDF, max 2 Mo).");
            }
        }

        // Mot de passe
        if (!checkPasswordMatch()) {
            valid = false;
            errors.push("Les mots de passe ne correspondent pas.");
        }
        // Conditions
        if (!document.getElementById("consent").checked) {
            valid = false;
            errors.push("Vous devez accepter les conditions.");
        }
        // Si erreur -> bloquer envoi
        if (!valid) {
            notifAlert("Infos manquantes :<br>- " + errors.join("<br>- "));
            return;
        }

        const fd = new FormData(form);
        const email = (fd.get('email') || '').toString().trim().toLowerCase();
        const password = fd.get('password');
        fd.set('email', email);
        try{
            await api(form.action || '/submit-form', { method: 'POST', body: fd});
            const choice = await alertChoice("Votre compte a bien été créé, veuiller cliquer suivant pour passer au test.");
            if (choice) {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const data = await response.json();
                if (data.success) window.location.href = '/test';
                else notif(data.message || 'Login failed');
            }
        } catch (e) {
            if(e.status === 409){
                const emailInput = form.querySelector('#email');
                if (emailInput) {
                    emailInput.classList.add('is-invalid');
                    emailInput.focus();
                }
            }
        }
    });
    const cvCross = document.getElementById('cvCross');
    const pirCross = document.getElementById('pirCross');
    const pivCross = document.getElementById('pivCross');
    const stateWorkAuthCross = document.getElementById('stateWorkAuthCross');

    const cvUpload = document.getElementById('cv');
    const pirUpload = document.getElementById('id_doc');
    const pivUpload = document.getElementById('id_doc_verso');
    const stateWorkAuthUpload = document.getElementById('stateWorkAuth');

    const labelCV = document.getElementById('cvFileName');
    const labelPir = document.getElementById('piRectoFilename');
    const labelPiv = document.getElementById('piVersoFilename');
    const labelStateWorkAuth = document.getElementById('stateWorkAuthFilename');

    cvUpload.addEventListener('change', () => { if (cvUpload.files.length > 0) labelCV.innerText = cvUpload.files[0].name; cvCross.style.display = 'block';})
    pirUpload.addEventListener('change', () => { if (pirUpload.files.length > 0) labelPir.innerText = pirUpload.files[0].name; pirCross.style.display = 'block';})
    pivUpload.addEventListener('change', () => { if (pivUpload.files.length > 0) labelPiv.innerText = pivUpload.files[0].name; pivCross.style.display = 'block';})
    stateWorkAuthUpload.addEventListener('change', () => { if (stateWorkAuthUpload.files.length > 0) labelStateWorkAuth.innerText = stateWorkAuthUpload.files[0].name; stateWorkAuthCross.style.display = 'block';})
    cvCross.addEventListener('click', ()=>{
        labelCV.innerText = 'CV (.pdf)';
        cvUpload.value = '';
        cvCross.style.display = 'none';
    })
    pirCross.addEventListener('click', ()=>{
        labelPir.innerText = "Pièce d'identité (recto) (.png/.jpg)";
        pirUpload.value = '';
        pirCross.style.display = 'none';
    })
    pivCross.addEventListener('click', ()=>{
        labelPiv.innerText = "Pièce d'identité (verso) (.png/.jpg)";
        pivUpload.value = '';
        pivCross.style.display = 'none';
    })
    stateWorkAuthCross.addEventListener('click', ()=>{
        labelStateWorkAuth.innerText = "Pièce d'identité (verso) (.png/.jpg)";
        stateWorkAuthUpload.value = '';
        stateWorkAuthCross.style.display = 'none';
    })

});

