document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    const password = document.getElementById("password");
    const confirm = document.getElementById("confirm");
    const message = document.createElement("span");
    message.id = "password-message";
    confirm.parentNode.appendChild(message);

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
    form.addEventListener("submit", function (e) {
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
        if (!validateFile(document.getElementById("cv"), ["pdf"])) {
            valid = false;
            errors.push("CV invalide (PDF uniquement).");
        }
        if (!validateFile(document.getElementById("id_doc"), ["jpg", "png"])) {
            valid = false;
            errors.push("Pièce d'identité recto invalide (JPG ou PNG).");
        }
        if (!validateFile(document.getElementById("id_doc_verso"), ["jpg", "png"])) {
            valid = false;
            errors.push("Pièce d'identité verso invalide (JPG ou PNG).");
        }
        if (!validateFile(document.getElementById("cv"), ["pdf"], 2)) {
            valid = false;
            errors.push("CV invalide (PDF uniquement, max 2 Mo).");
        }
        if (!validateFile(document.getElementById("id_doc"), ["jpg", "png"], 1)) {
            valid = false;
            errors.push("Pièce d'identité recto invalide (JPG/PNG, max 1 Mo).");
        }
        if (!validateFile(document.getElementById("id_doc_verso"), ["jpg", "png"], 1)) {
            valid = false;
            errors.push("Pièce d'identité verso invalide (JPG/PNG, max 1 Mo).");
        }

        // Mot de passe
        if (!checkPasswordMatch()) {
            valid = false;
            errors.push("Les mots de passe ne correspondent pas.");
        }

        // Conditions
        if (!document.getElementById("agree").checked) {
            valid = false;
            errors.push("Vous devez accepter les conditions.");
        }

        // Si erreur -> bloquer envoi
        if (!valid) {
            e.preventDefault();
            alert("Erreurs trouvées :\n- " + errors.join("\n- "));
        }
    });
    const cvUpload = document.getElementById('cv');
    const pirUpload = document.getElementById('id_doc');
    const pivUpload = document.getElementById('id_doc_verso');
    const labelCV = document.getElementById('cvFileName');
    const labelPir = document.getElementById('piRectoFilename');
    const labelPiv = document.getElementById('piVersoFilename');
    cvUpload.addEventListener('change', () => { if (cvUpload.files.length > 0) labelCV.innerText = cvUpload.files[0].name;})
    pirUpload.addEventListener('change', () => { if (pirUpload.files.length > 0) labelPir.innerText = pirUpload.files[0].name;})
    pivUpload.addEventListener('change', () => { if (pivUpload.files.length > 0) labelPiv.innerText = pivUpload.files[0].name;})

});
