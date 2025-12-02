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
        const type = password.getAttribute('type') === "password" ? "test" : "password";
        password.setAttribute('type', type);
    })
    const toggleConf = document.getElementById('confirmEye');
    toggleConf.addEventListener('click', ()=>{
        const type = confirm.getAttribute('type') === "password" ? "test" : "password";
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
        const regex = /^[0-9]{10,15}$/;
        return regex.test(phone);
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
      if (file.size > maxSizeBytes) {
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
            errors.push("Téléphone invalide (10-15 chiffres).");
        }

        // Adresse et ville
        if (!document.getElementById("addr").value.trim()) {
            valid = false;
            errors.push("Adresse obligatoire.");
        }
        if (!document.getElementById("city").value.trim()) {
            valid = false;
            errors.push("Ville obligatoire.");
        }

        // Date de naissance
        if (!validateBirth(document.getElementById("birth").value)) {
            valid = false;
            errors.push("Vous devez avoir au moins 18 ans.");
        }

        // Fichiers
        if (!validateFile(document.getElementById("cv"), ["pdf"], 2)) {
            valid = false;
            errors.push("CV invalide (PDF uniquement, max 2 Mo).");
        }
        if (!validateFile(document.getElementById("id_doc"), ["jpg", "png"], 3)) {
            valid = false;
            errors.push("Pièce d'identité recto invalide (JPG/PNG, max 3 Mo).");
        }
        if (!validateFile(document.getElementById("id_doc_verso"), ["jpg", "png"], 3)) {
            valid = false;
            errors.push("Pièce d'identité verso invalide (JPG/PNG, max 3 Mo).");
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
            notifAlert("Erreurs trouvées :<br>- " + errors.join("<br>- "));
            return;
        }

        const fd = new FormData(form);
        const email = (fd.get('email') || '').toString().trim().toLowerCase();
        fd.set('email', email);
        try{
            await api(form.action || '/submit-form', { method: 'POST', body: fd});
            notif('Compte créé avec succès !');
            window.location.href = '/signin';
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

