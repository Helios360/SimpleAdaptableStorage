fetch('/admin-panel')
  .then(res => res.text())
  .catch(err => console.error('Erreur admin fetch:', err));
  
const allUsers = [];
function renderUser (users) {
  const list = document.getElementById('list');
  list.innerHTML='';
  users.forEach(user => {
    const rawScore = user.gen_score;
    const displayScore = rawScore == null ? "N/A" : rawScore;
    if (rawScore == null) scoreColor = "var(--secondary)";
    else if (rawScore < 20) scoreColor="#E02424";
    else if (rawScore < 40) scoreColor="#F54927";
    else if (rawScore < 60) scoreColor="#D5DB1F";
    else scoreColor="#32DB1F";
    list.innerHTML+=`
    <div class="user" data-user-id="${user.id}">
    <span><a href="/profile?id=${encodeURIComponent(user.id)}"><p>${user.name.toUpperCase()}</p><p>${user.fname}</p></a></span>
    <span style="font-size:19px; font-weight:600; color:${scoreColor}">${displayScore}</span>
    <span style="line-break:loose" class="resped">${user.city}, ${user.postal}</span>
    <span>
        <select class="status-select" data-user-id="${user.id}">
            <option value="active" ${user.status === 'active' ? 'selected' : ''}>Recherche active</option>
            <option value="recherche" ${user.status === 'recherche' ? 'selected' : ''}>En recherche</option>
            <option value="entreprise" ${user.status === 'entreprise' ? 'selected' : ''}>En Entreprise</option>
            <option value="archive" ${user.status === 'archive' ? 'selected' : ''}>Archive</option>
        </select>
    </span>
    <span class="resped"><p class="creationDate">${user.date_inscription.match(/^\d{4}-\d{2}-\d{2}/)}</p></span>
    </div>
    `;
  });
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', event => {
      const newStatus = event.target.value;
      const userId = event.target.getAttribute('data-user-id');

      fetch('/api/admin/update-status', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          id: userId,
          status: newStatus
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log(`Status updated for user ${userId}`);
          const userToUpdate = allUsers.find(user => user.id == userId);
          if (userToUpdate) userToUpdate.status = parseInt(newStatus, 10);
        } else {
          throw new Error(data.message);
        }
      })
      .catch(err => {
        console.error(`Failed to update status for user ${userId}:`, err);
        notif("Erreur lors de la mise à jour du statut.");
      });
    });
  });
}
function sortUsers(by, ascending = true) {
  const sorted = [...allUsers];
  sorted.sort((a, b) => {
    let valA = a[by];
    let valB = b[by];

    // Normalize for string or date
    if (by === 'date_inscription') {
      valA = new Date(valA);
      valB = new Date(valB);
    }
    if (by === "gen_score") {
      valA = (valA === null || valA === undefined || valA === "") ? -Infinity : Number(valA);
      valB = (valB === null || valB === undefined || valB === "") ? -Infinity : Number(valB);
      if (isNaN(valA)) valA = -Infinity;
      if (isNaN(valB)) valB = -Infinity;
    }
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }

    if (valA < valB) return ascending ? -1 : 1;
    if (valA > valB) return ascending ? 1 : -1;
    return 0;
  });

  renderUser(sorted);
}

fetch('/api/admin-panel', { method: 'POST'})
.then(res => res.json())
.then(data => {
  if (data.success) {
    const users = data.users;
    allUsers.push(...users);
    renderUser(users);
    attachFormListeners();
    document.addEventListener('click', (e) => {
      const wrapper = e.target.closest('#name-fname');
      if (wrapper) {
      const clickedSvg = wrapper.querySelector('svg');
      document.querySelectorAll('#name-fname svg, #localisation svg, #status svg, #creation-date svg')
        .forEach(svg => {
          if (svg !== clickedSvg) {
            svg.classList.remove('rotated');
            svg.classList.add('unrotate');
          }
        });
        if (clickedSvg) {
          const isRotated = clickedSvg.classList.contains('rotated');
          if(isRotated == false) {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("name",true);
          } else {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("name",false);
          }
        }
      }
    });
    document.addEventListener('click', (e) => {
      const wrapper = e.target.closest('#score');
      if (wrapper) {
        const clickedSvg = wrapper.querySelector('svg');
        document.querySelectorAll('#name-fname svg, #localisation svg, #status svg, #creation-date svg')
          .forEach(svg => {
            if (svg !== clickedSvg) {
              svg.classList.remove('rotated');
              svg.classList.add('unrotate');
            }
          });

        if (clickedSvg) {
          const isRotated = clickedSvg.classList.contains('rotated');
          if(isRotated == false) {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("gen_score",true);
          } else {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("gen_score",false);
          }
        }
      }
    });
    document.addEventListener('click', (e) => {
      const wrapper = e.target.closest('#localisation');
      if (wrapper) {
        const clickedSvg = wrapper.querySelector('svg');
        document.querySelectorAll('#name-fname svg, #localisation svg, #status svg, #creation-date svg')
          .forEach(svg => {
            if (svg !== clickedSvg) {
              svg.classList.remove('rotated');
              svg.classList.add('unrotate');
            }
          });

        if (clickedSvg) {
          const isRotated = clickedSvg.classList.contains('rotated');
          if(isRotated == false) {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("city",true);
          } else {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("city",false);
          }
        }
      }
    });
    document.addEventListener('click', (e) => {
      const wrapper = e.target.closest('#status');
      if (wrapper) {
        const clickedSvg = wrapper.querySelector('svg');
        document.querySelectorAll('#name-fname svg, #localisation svg, #status svg, #creation-date svg')
          .forEach(svg => {
            if (svg !== clickedSvg) {
              svg.classList.remove('rotated');
              svg.classList.add('unrotate');
            }
          });

        if (clickedSvg) {
          const isRotated = clickedSvg.classList.contains('rotated');
          if(isRotated == false) {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("status",true);
          } else {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("status",false);
          }
        }
      }
    });
    document.addEventListener('click', (e) => {
      const wrapper = e.target.closest('#creation-date');
      if (wrapper) {
        const clickedSvg = wrapper.querySelector('svg');
        document.querySelectorAll('#name-fname svg, #localisation svg, #status svg, #creation-date svg')
          .forEach(svg => {
            if (svg !== clickedSvg) {
              svg.classList.remove('rotated');
              svg.classList.add('unrotate');
            }
          });

        if (clickedSvg) {
          const isRotated = clickedSvg.classList.contains('rotated');
          if(isRotated == false) {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("date_inscription",true);
          } else {
            clickedSvg.classList.toggle('rotated', !isRotated);
            clickedSvg.classList.toggle('unrotate', isRotated);
            sortUsers("date_inscription",false);
          }
        }
      }
    });
  }
})
.catch(err => { console.error('Error fetching users:', err); });

function filterUsers() {
  const nameValue = (document.getElementById('nomPrenom')?.value || '').toLowerCase();
  const statusRaw = (document.getElementById('searchStatus')?.value || '');
  const statusValue = statusRaw.toLowerCase();
  const placeValue = (document.getElementById('place')?.value || '').toLowerCase();
  const postalValue = (document.getElementById('postal')?.value || '').toLowerCase();
  const ageValue = (document.getElementById('age')?.value || '');
  const trancheValue = (document.getElementById('trancheAge')?.value || '');
  const skillsValue = [...document.querySelectorAll('#skills span')].map(span => span.textContent);
  const tagsValue = [...document.querySelectorAll('#tags span')].map(span => span.textContent);
  const permisValue = Number(document.getElementById('permis').checked);
  const vehiculeValue = Number(document.getElementById('vehicule').checked);
  const mobileValue = Number(document.getElementById('mobile').checked);
  const noFilters = 
    !nameValue &&
    !(statusRaw || statusRaw === 'all') &&
    !placeValue &&
    !postalValue &&
    !ageValue &&
    !trancheValue &&
    !skillsValue.length === 0 &&
    !tagsValue.length === 0 &&
    !permisValue &&
    !vehiculeValue &&
    !mobileValue;
  
  if (noFilters) {
    renderUser(allUsers);
    return;
  }
  const filtered = allUsers.filter(user => {
    if (!user) return false;
    // Calculate age
    const birthDate = new Date(user.birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    const fullName = `${user.name} ${user.fname}`.toLowerCase();
    const matchName = nameValue === '' || fullName.includes(nameValue);
    const matchStatus = statusValue === '' || user.status === statusValue;
    const matchPlace = placeValue === '' || user.city?.toLowerCase().includes(placeValue);
    const matchPostal = postalValue === '' || user.postal?.toLowerCase().includes(postalValue);
    const matchAge = ageValue === '' || age === parseInt(ageValue);
    let matchTranche = true;
    if (trancheValue !== ''){
      const [minAge, maxAge] = trancheValue.split('-').map(v=>parseInt(v,10));
      matchTranche = age >= minAge && age <= maxAge;
    }
    const matchSkills = skillsValue.length === 0 || skillsValue.every(term => (user.skills || []).some(skill => skill.toLowerCase().includes(term.trim().toLowerCase())));
    const matchTags = tagsValue.length === 0 || tagsValue.every(term => (user.tags || []).some(tag => tag.toLowerCase().includes(term.trim().toLowerCase())));

    const matchPermis = !permisValue || user.permis === permisValue;
    const matchVehicule = !vehiculeValue || user.vehicule === vehiculeValue;
    const matchMobile = !mobileValue || user.mobile === mobileValue;
    return matchName && matchStatus && matchPlace && matchPostal && matchAge && matchTranche && matchSkills && matchTags && matchPermis && matchVehicule && matchMobile;
  });
  renderUser(filtered);
}

function attachFormListeners() {
  const form = document.getElementById('search-form');
  form.querySelectorAll('input, select, textarea').forEach(field => {
    field.addEventListener('input', filterUsers);
    field.addEventListener('change', filterUsers);
  });
}
function refreshUserList() {
  fetch('/api/admin-panel', {method: 'POST'})
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      allUsers.length = 0; // Vider l'ancien tableau
      allUsers.push(...data.users); // Remplir avec les vraies données
      renderUser(data.users);
    }
  })
  .catch(err => {console.error('Erreur lors du refresh:', err);});
}
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.log("Retour depuis le cache détecté, rechargement forcé.");
    window.location.reload();
  }
});

document.getElementById('addStud').addEventListener('click', ()=>{
  const popup = document.createElement('div');
  popup.className = 'notif-alert';
  popup.id = 'alertnotif';
  popup.innerHTML=`<div class="admin-register"><button id="exit-popup">Retour</button><br><br>
  <form action="/submit-form-admin" data-ajax method="POST" enctype="multipart/form-data" class="form-admin" novalidate>
    <div>
        <label for="formation">Formation</label>
        <select id="formation" name="formation" required>
            <option value="btsndrc">BTS NDRC</option>
            <option value="tpntc">TP NTC</option>
            <option value="fullstack">Developpeur Web Full Stack</option>
            <option value="cybersec">Expert en systeme d'information</option>
        </select>
    </div>
    <div>
        <label for="name">Nom</label>
        <input type="text" id="name" name="name" required>
    </div>
    <div>
        <label for="first-name">Prénom</label>
        <input type="text" id="fname" name="fname" required>
    </div>
    <div>
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required>
    </div>
    <div>
        <label for="tel">Téléphone</label>
        <input type="tel" id="tel" name="tel" required>
    </div>
    <div>
        <label for="adresse">Adresse</label>
        <input type="text" id="addr" name="addr" required>
    </div>
    <div>
        <label for="city">Ville/Village</label>
        <input type="text" id="city" name="city" required>
    </div>
    <div>
        <label for="postal">Code Postal</label>
        <input type="text" id="postal" name="postal" pattern="[A-Za-z0-9\s\-]{3,10}" required>
    </div>
    <div>
        <label for="birth">Date de naissance</label>
        <input type="date" id="birth" name="birth" required>
    </div>
        <ul class="form2 inputs" >
            <p>Documents :</p>
            <li class="file-upload inputs">
                <label class="inputs" for="cv" id="cvFileName">CV (.pdf)</label><span id="cvCross" class="supprFile">X</span>
                <input class="inputs" type="file" id="cv" name="cv" accept=".pdf" required>
            </li>
            <li class="file-upload">
                <label class="inputs" for="id_doc" id="piRectoFilename">Pièce d'identité (recto) (.png/.jpg)</label><span id="pirCross" class="supprFile">X</span>
                <input class="inputs" type="file" id="id_doc" name="id_doc" accept=".png, .jpg" required>
            </li>
            <li class="file-upload">
                <label class="inputs" for="id_doc_verso" id="piVersoFilename">Pièce d'identité (verso) (.png/.jpg)</label><span id="pivCross" class="supprFile">X</span>
                <input class="inputs" type="file" id="id_doc_verso" name="id_doc_verso" accept=".png, .jpg" required>
            </li>
            <div class="showdown">
                <p>Je suis étudiant étrangé arrivé en france ⬇️</p>
                <li class="file-upload">
                    <label class="inputs" for="stateWorkAuth" id="stateWorkAuthFilename">Autorisation de travail (.pdf)</label><span id="stateWorkAuthCross" class="supprFile">X</span>
                    <input class="inputs" type="file" id="stateWorkAuth" name="stateWorkAuth" accept=".pdf">
                </li>
            </div>
        </ul>
        <div>
            <span>
                <input type="checkbox" id="permis" name="permis">
                <label for="permis">Permis B</label>
            </span><br>
            <span>
                <input type="checkbox" id="vehicule" name="vehicule">
                <label for="vehicule">Véhiculé</label>
            </span><br>
            <span>    
                <input type="checkbox" id="mobile" name="mobile">
                <label for="mobile">Mobile geographiquement</label>
            </span>
        </div>
        <div>
            <label for="password">Mot de passe</label>
            <span class="eye-contain">
                <input class="inputs" type="password" id="password" name="password" required>
                <svg id="pwdEye" class="eye" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 1200 1200" xml:space="preserve">
                    <path fill="var(--secondary)" d="M779.843 599.925c0 95.331-80.664 172.612-180.169 172.612-99.504 0-180.168-77.281-180.168-172.612 0-95.332 80.664-172.612 180.168-172.612 99.505-.001 180.169 77.281 180.169 172.612M600 240.521c-103.025.457-209.814 25.538-310.904 73.557C214.038 351.2 140.89 403.574 77.394 468.219 46.208 501.218 6.431 549 0 599.981c.76 44.161 48.13 98.669 77.394 131.763 59.543 62.106 130.786 113.018 211.702 154.179C383.367 931.674 487.712 958.015 600 959.48c103.123-.464 209.888-25.834 310.866-73.557 75.058-37.122 148.243-89.534 211.74-154.179 31.185-32.999 70.962-80.782 77.394-131.763-.76-44.161-48.13-98.671-77.394-131.764-59.543-62.106-130.824-112.979-211.74-154.141C816.644 268.36 712.042 242.2 600 240.521m-.076 89.248c156.119 0 282.675 120.994 282.675 270.251S756.043 870.27 599.924 870.27 317.249 749.275 317.249 600.02c0-149.257 126.556-270.251 282.675-270.251"/>
                </svg>
            </span>
        </div>
        <div>
            <label for="confirm">Confirmer le mot de passe</label>
            <span class="eye-contain">
                <input class="inputs" type="password" id="confirm" name="confirm" required>
                <svg id="confirmEye" class="eye" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 1200 1200" xml:space="preserve">
                    <path fill="var(--secondary)" d="M779.843 599.925c0 95.331-80.664 172.612-180.169 172.612-99.504 0-180.168-77.281-180.168-172.612 0-95.332 80.664-172.612 180.168-172.612 99.505-.001 180.169 77.281 180.169 172.612M600 240.521c-103.025.457-209.814 25.538-310.904 73.557C214.038 351.2 140.89 403.574 77.394 468.219 46.208 501.218 6.431 549 0 599.981c.76 44.161 48.13 98.669 77.394 131.763 59.543 62.106 130.786 113.018 211.702 154.179C383.367 931.674 487.712 958.015 600 959.48c103.123-.464 209.888-25.834 310.866-73.557 75.058-37.122 148.243-89.534 211.74-154.179 31.185-32.999 70.962-80.782 77.394-131.763-.76-44.161-48.13-98.671-77.394-131.764-59.543-62.106-130.824-112.979-211.74-154.141C816.644 268.36 712.042 242.2 600 240.521m-.076 89.248c156.119 0 282.675 120.994 282.675 270.251S756.043 870.27 599.924 870.27 317.249 749.275 317.249 600.02c0-149.257 126.556-270.251 282.675-270.251"/>
                </svg>
            </span>
        </div>
        <span id="password-message"></span>
        <div class="checkbox">
            <label for="consent">Je reconnais avoir lu et compris les conditions d’utilisations de Cloud Testing</label>
            <input type="checkbox" id="consent" name="consent" required>                
        </div>
        <button type="submit" id="send">Enregistrer</button>
  </form><br>
  
</div>
  `
  const form = document.querySelector("form");
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
            await notif("Le compte a bien été créé");
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
  popup.querySelector('#exit-popup').addEventListener('click', () => { popup.remove();});
  document.body.appendChild(popup);
})

function buildAllowedLists(formationIds = []){
  const skills = new Set();
  formationIds.forEach(fid => {
    const cfg = formationCatalog[fid];
    if(!cfg) return;
    Object.keys(cfg).forEach(skill=>skills.add(skill));
  });
  return {
    skills: [...skills].sort()
  }
}

async function initAdminAllowedFilters(){
  const res = await fetch('/api/admin-profile');
  const data = await res.json();
  if (!data.success) return;
  const formationIds = data.user.staff_formations || [];
  const allowed = buildAllowedLists(formationIds);
  populateDatalist(document.getElementById('skillList'), allowed.skills);
};
initAdminAllowedFilters().catch(console.error);

const tag = document.getElementById('add_tags');
const skills = document.getElementById('add_skills');
let currentTags = [];
let currentSkills = [];

function renderTagsAndSkills() {
    const tagList = document.getElementById('tags');
    const skillList = document.getElementById('skills');
    tagList.innerHTML = '';
    skillList.innerHTML = '';
    currentTags.forEach(t => {
        const span = document.createElement('span');
        span.textContent = t;
        let confirming = false;
        span.onmouseenter = () => { if (!confirming) span.style.textDecoration = 'line-through'; };
        span.onmouseleave = () => {
            span.style.textDecoration = 'none';
            if (confirming) {
                span.textContent = t;
                span.style.color = 'var(--secondary)';
                confirming = false;
            }
        };
        span.onclick = () => {
            if (!confirming) {
                span.textContent += ' ?';
                span.style.color = 'red';
                confirming = true;
            } else {
                currentTags = currentTags.filter(tag => tag !== t);
                renderTagsAndSkills();
                filterUsers();
            }
        };
        tagList.appendChild(span);
    });
    currentSkills.forEach(s => {
        const span = document.createElement('span');
        const type = formationCatalog[s] || 'unknown';
        const bgColor = typeColors[type];
        span.textContent = s;
        span.style.backgroundColor = bgColor;
        let confirming = false;
        span.onmouseenter = () => { if (!confirming) span.style.textDecoration = 'line-through'; };
        span.onmouseleave = () => {
            span.style.textDecoration = 'none';
            if (confirming) {
                span.textContent = s;
                span.style.color = 'var(--secondary)';
                confirming = false;
            }
        };
        span.onclick = () => {
            if (!confirming) {
                span.textContent += ' ?';
                span.style.color = 'red';
                confirming = true;
            } else {
                currentSkills = currentSkills.filter(tag => tag !== s);
                renderTagsAndSkills();
                filterUsers();
            }
        };
        skillList.appendChild(span);
    });
}
// When tag input loses focus or user presses Enter
tag.addEventListener('change', () => {
    const tagged = tag.value.trim();
    if (tagged && !currentTags.includes(tagged)) {
        currentTags.push(tagged);
        renderTagsAndSkills();
    }
    tag.value = '';
});
// When skill input loses focus or user presses Enter
skills.addEventListener('change', () => {
    const skill = skills.value.trim();
    if (skill && !currentSkills.includes(skill)) {
        currentSkills.push(skill);
        renderTagsAndSkills();
    }
    skills.value = '';
});


document.getElementById('reset').addEventListener('click', ()=>{
  document.getElementById('search-form').reset();
  renderUser(allUsers);
})