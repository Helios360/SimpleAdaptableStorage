const nextPage = document.getElementById('next-page');
const previousPage = document.getElementById('previous-page');
const actualPage = document.getElementById('actual-page');

const allUsers = [];
async function renderPage(pageIndex){
    try{
        const data = await api('/api/admin-panel',{
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({page: pageIndex, pageSize: 10}),
        });
        if(!data.success) return;
        actualPage.innerText = data.pagination?.page ?? pageIndex;
        const users = Array.isArray(data.users) ? data.users : [];
        allUsers.length=0;
        allUsers.push(...data.users);
        renderUser(users);
    } catch (e) { console.error(e); }
}
renderPage(1);
nextPage.addEventListener('click', async () => {
    renderPage(parseInt(actualPage.innerText) + 1);
})
previousPage.addEventListener('click', async () => {
    renderPage(parseInt(actualPage.innerText) - 1);
})

async function renderUser (users) {
    const list = document.getElementById('list');
    list.innerHTML='';
    let scoreColor;
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
        <span class="resped"><p class="creationDate">${user.created_at.match(/^\d{4}-\d{2}-\d{2}/)}</p></span>
        </div>
        `;
    });
    document.querySelectorAll('.status-select').forEach(select => {
        select.addEventListener('change', async event => {
            const newStatus = event.target.value;
            const userId = event.target.getAttribute('data-user-id');
            try {
                const data = await api('/api/admin/update-status', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                        id: userId,
                        status: newStatus
                    })
                });
                if (!data.success) return;
                console.log(`Status updated for user ${userId}`);
                const userToUpdate = allUsers.find(user => user.id == userId);
                if (userToUpdate) userToUpdate.status = parseInt(newStatus, 10);
            } catch (e) { console.error(e); }
        });
    });
};

async function sortUsers(by, ascending = true) {
  const sorted = allUsers;
  sorted.sort((a, b) => {
    let valA = a[by];
    let valB = b[by];

    // Normalize for string or date
    if (by === 'created_at') {
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
function haversine(lat1, lon1, lat2, lon2){
    const toRad = (v) => (v*Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return 6371*c;
}
const geoCache = new Map();
async function calculateUsersInArea(city){
    const key = (city || '').trim().toLowerCase();
    if(!key) return null;
    if(geoCache.has(key)) return geoCache.get(key);
    const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(key)}&boost=population&fields=centre&limit=1`;
    try{
        const geoRes = await fetch(url);
        if (!geoRes.ok) throw new Error(`GeoAPI failed: ${geoRes.status}`);
        const data = await geoRes.json();

        if (!Array.isArray(data) || data.length === 0 || !data[0]?.centre?.coordinates) {
            geoCache.set(key, null);
            return null;
        }
        const [lon, lat] = data[0].centre.coordinates;
        const center = {lat: Number(lat), lon: Number(lon)};
        geoCache.set(key, center);
        return center;
    } catch(e) {
        notif(`Geocoding failed for city: ${city} (${e})`);
        geoCache.set(key, null);
        return null;
    }
}
function sortArrow(){
    const users = allUsers || [];
    renderUser(users);
    attachFormListeners();

    const SORT_HEADERS = [
      {wrapper: '#name-fname', key:'name'},
      {wrapper: '#score', key:'gen_score'},
      {wrapper: '#localisation', key:'city'},
      {wrapper: '#status', key:'status'},
      {wrapper: '#creation-date', key:'created_at'},
    ];
    const ALL_SVG_SELECTOR = SORT_HEADERS.map(h=>`${h.wrapper} svg`).join(', ');

    function resetOtherArrows(clickedSvg){
        document.querySelectorAll(ALL_SVG_SELECTOR).forEach(svg => {
            if(svg !== clickedSvg) {
                svg.classList.remove('rotated');
                svg.classList.add('unrotate');
            }
        });
    }
    function setArrowState(svg, asc){
        svg.classList.toggle('rotated', asc);
        svg.classList.toggle('unrotate', !asc);
    }
    function handleSortClick(wrapperSelector, sortKey, e){
        const wrapper = e.target.closest(wrapperSelector);
        if (!wrapper) return false;
        const svg = wrapper.querySelector('svg');
        if (!svg) return true;
        resetOtherArrows(svg);
        const nextAsc = !svg.classList.contains('rotated');
        setArrowState(svg, nextAsc);
        sortUsers(sortKey, nextAsc);
        return true;
    }
    document.addEventListener('click', (e) => {
        for (const {wrapper, key} of SORT_HEADERS) { if (handleSortClick(wrapper, key, e)) break; }
    });
}
sortArrow();
async function attachFormListeners() {
  const form = document.getElementById('search-form');
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
  popup.innerHTML=`
  <div class="admin-register">
  <button id="exit-popup">Retour</button><br><br>
  <form action="/submit-form-admin" data-ajax method="POST" enctype="multipart/form-data" class="form-admin" novalidate>
            <div class="register">
                <div>
                    <label for="formation_id">Formation *</label>
                    <select id="formation_id" name="formation_id" required>
                        <option value="1">BTS NDRC</option>
                        <option value="2">TP NTC</option>
                        <option value="3">Developpeur Web Full Stack</option>
                        <option value="4">Expert en systeme d'information</option>
                        <option value="5">BTS GPME</option>
                        <option value="6">CAP AEPE</option>
                        <option value="7">BTS opticien lunettier</option>
                    </select>
                </div>
                <div>
                    <label for="name">Nom *</label>
                    <input type="text" id="name" name="name" required>
                </div>
                <div>
                    <label for="first-name">Prénom *</label>
                    <input type="text" id="fname" name="fname" required>
                </div>
                <div>
                    <label for="email">Email *</label>
                    <input type="email" id="email" name="email" required>
                </div>
                <div>
                    <label for="tel">Téléphone *</label>
                    <input type="tel" id="tel" name="tel" required>
                </div>
                <div>
                    <label for="adresse">Adresse</label>
                    <input type="text" id="addr" name="addr">
                </div>
                <div>
                    <label for="postal">Code Postal</label>
                    <input type="text" id="postal" name="postal" pattern="[A-Za-z0-9\s\-]{3,10}">
                </div>
                <div>
                    <label for="city">Ville/Village *</label>
                    <input type="text" id="city" name="city" required>
                </div>
                <div>
                    <label for="birth">Date de naissance *</label>
                    <input type="date" id="birth" name="birth" required>
                </div>
            </div>
            <hr style="width:100%">
            <div class="register">
                <ul class="form2 inputs" >
                    <p>Documents :</p>
                    <li class="file-upload inputs">
                        <label class="inputs" for="cv" id="cvFileName">CV (.pdf) *</label><span id="cvCross" class="supprFile">X</span>
                        <input class="inputs" type="file" id="cv" name="cv" accept=".pdf" required>
                    </li>
                    <span class="checks">
                        <input type="checkbox" id="sejour" name="sejour">
                        <label for="sejour">L'étudiant a un titre de séjour plutot qu'une pièce d'identité</label>
                    </span>
                    <div id="titre-valide">
                        <label for="titre">Date d'invalidité du titre de séjour *</label>
                        <input type="date" id="titre-sejour" name="titre">
                    </div>
                    <li class="file-upload">
                        <label class="inputs" for="id_doc" id="piRectoFilename">Pièce d'identité (recto) .png/.jpg/.pdf *</label><span id="pirCross" class="supprFile">X</span>
                        <input class="inputs" type="file" id="id_doc" name="id_doc" accept=".png, .jpg" required>
                    </li>
                    <li class="file-upload">
                        <label class="inputs" for="id_doc_verso" id="piVersoFilename">Pièce d'identité (verso) .png/.jpg/.pdf *</label><span id="pivCross" class="supprFile">X</span>
                        <input class="inputs" type="file" id="id_doc_verso" name="id_doc_verso" accept=".png, .jpg" required>
                    </li>
                </ul>
                <div>
                    <span class="checks admin-checks">
                        <input type="checkbox" id="permis" name="permis">
                        <label for="permis">Permis B</label>
                    </span>
                    <span class="checks admin-checks">
                        <input type="checkbox" id="vehicule" name="vehicule">
                        <label for="vehicule">Véhiculé</label>
                    </span>
                    <span class="checks admin-checks">    
                        <input type="checkbox" id="mobile" name="mobile">
                        <label for="mobile">Mobile geographiquement</label>
                    </span>
                </div>
                <span id="password-message"></span>
                <button type="submit" id="send">Envoyer</button>
            </div>
        </form><br>
    </div>
    `
    document.body.appendChild(popup);
    const form = popup.querySelector("form");
    const telInput = document.getElementById('tel');
    const titreInput = document.getElementById('titre-sejour');

    const cvCross = document.getElementById('cvCross');
    const pirCross = document.getElementById('pirCross');
    const pivCross = document.getElementById('pivCross');
    const cvUpload = document.getElementById('cv');
    const pirUpload = document.getElementById('id_doc');
    const pivUpload = document.getElementById('id_doc_verso');
    const labelCV = document.getElementById('cvFileName');
    const labelPir = document.getElementById('piRectoFilename');
    const labelPiv = document.getElementById('piVersoFilename');

    telInput.addEventListener('input', () => {
        telInput.value = telInput.value.replace(/\s+/g, "");
    })

    const sejour = document.getElementById('sejour');
    document.getElementById('titre-valide').style.height='0px';
    document.getElementById('titre-valide').style.overflow='hidden';

    sejour.addEventListener('change', () => {
        if (!sejour.checked){
            document.getElementById('titre-valide').style.height='0px';
            toggle = 1;
            labelPir.innerText = "Pièce d'identité (recto) .png/.jpg/.pdf *";
            labelPiv.innerText = "Pièce d'identité (verso) .png/.jpg/.pdf *";
            titreInput.ariaDisabled;
        } else {
            document.getElementById('titre-valide').style.height='65px';
            toggle = 0;
            labelPir.innerText = "Titre de séjour (recto) .png/.jpg/.pdf *";
            labelPiv.innerText = "Titre de séjour (verso) .png/.jpg/.pdf *";
            titreInput.ariaRequired;
        }
    });

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
    /*
    function validatePostal(postal) {
        if (typeof postal !== 'string') return false;
        const normalize = postal.replace(/\s+/g, "");
        const regex = /^(0[1-9]|[1-8][0-9]|9[0-8])[0-9]{3}$/;
        return regex.test(normalize);
    }
    */
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
        // Date de naissance
        if (!validateBirth(document.getElementById("birth").value)) {
            valid = false;
            errors.push("Vous devez avoir au moins 18 ans.");
        }
        // Titre de Séjour
        if (sejour.checked && !titreInput.value){
            valid = false;
            errors.push("Date d'invalidité du titre de séjour obligatoire.");
        }
        // Fichiers
        if (!validateFile(cvUpload, ["pdf"], 2)) {
            valid = false;
            errors.push("CV invalide ou manquant (PDF uniquement, max 2 Mo).");
        }
        if (!validateFile(pirUpload, ["jpg", "png", "pdf"], 3)) {
            valid = false;
            errors.push("Pièce d'identité recto invalide ou manquante (JPG/PNG, max 3 Mo).");
        }
        if (!validateFile(pivUpload, ["jpg", "png", "pdf"], 3)) {
            valid = false;
            errors.push("Pièce d'identité verso invalide ou manquante (JPG/PNG, max 3 Mo).");
        }
        // Si erreur -> bloquer envoi
        if (!valid) {
            notifAlert("Infos manquantes :<br>- " + errors.join("<br>- "));
            return;
        }
        const fd = new FormData(form);
        const email = (fd.get('email') || '').toString().trim().toLowerCase();
        fd.set('email', email);
        try{
            await api(form.action, { method: 'POST', body: fd});
            notif("Le compte a bien été créé.");
        } catch (e) {
            if(e && e.status === 409){
                const emailInput = form.querySelector('#email');
                if (emailInput) {
                    emailInput.classList.add('is-invalid');
                    emailInput.focus();
                }
            } else notifAlert('Erreur serveur, réessayez.');
        }
    });

    cvUpload.addEventListener('change', () => { if (cvUpload.files.length > 0) labelCV.innerText = cvUpload.files[0].name; cvCross.style.display = 'block';})
    pirUpload.addEventListener('change', () => { if (pirUpload.files.length > 0) labelPir.innerText = pirUpload.files[0].name; pirCross.style.display = 'block';})
    pivUpload.addEventListener('change', () => { if (pivUpload.files.length > 0) labelPiv.innerText = pivUpload.files[0].name; pivCross.style.display = 'block';})
    cvCross.addEventListener('click', ()=>{
        labelCV.innerText = 'CV (.pdf)';
        cvUpload.value = '';
        cvCross.style.display = 'none';
    })
    pirCross.addEventListener('click', ()=>{
        labelPir.innerText = "Pièce d'identité (recto) (.png/.jpg/.pdf)";
        pirUpload.value = '';
        pirCross.style.display = 'none';
    })
    pivCross.addEventListener('click', ()=>{
        labelPiv.innerText = "Pièce d'identité (verso) (.png/.jpg/.pdf)";
        pivUpload.value = '';
        pivCross.style.display = 'none';
    })
    popup.querySelector('#exit-popup').addEventListener('click', () => { popup.remove();});
})

function buildAllowedLists(formationIds = []){
  const skills = new Set();
  formationIds.forEach(fid => {
    const cfg = formationCatalog[fid];
    if(!cfg) return;
    Object.keys(cfg).forEach(skill=>skills.add(skill));
  });
  return { skills: [...skills].sort() };
};

async function initAdminAllowedFilters(){
    try {
        const data = await api('/api/admin-profile');
        if (!data.success) return;
        const formationIds = data.user.staff_formations || [];
        const allowed = buildAllowedLists(formationIds);
        populateDatalist(document.getElementById('skillList'), allowed.skills);
    } catch (e) { console.error(e); }
};
initAdminAllowedFilters();

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
        const div = document.createElement('div');
        div.textContent = t;
        let confirming = false;
        div.onmouseenter = () => { if (!confirming) div.style.textDecoration = 'line-through'; };
        div.onmouseleave = () => {
            div.style.textDecoration = 'none';
            if (confirming) {
                div.textContent = t;
                div.style.color = 'var(--secondary)';
                confirming = false;
            }
        };
        div.onclick = () => {
            if (!confirming) {
                div.textContent += ' ?';
                div.style.color = 'red';
                confirming = true;
            } else {
                currentTags = currentTags.filter(tag => tag !== t);
                renderTagsAndSkills();
            }
        };
        tagList.appendChild(div);
    });
    currentSkills.forEach(s => {
        const div = document.createElement('div');
        const type = formationCatalog[s] || 'unknown';
        const bgColor = typeColors[type];
        div.textContent = s;
        div.style.backgroundColor = bgColor;
        let confirming = false;
        div.onmouseenter = () => { if (!confirming) div.style.textDecoration = 'line-through'; };
        div.onmouseleave = () => {
            div.style.textDecoration = 'none';
            if (confirming) {
                div.textContent = s;
                div.style.color = 'var(--secondary)';
                confirming = false;
            }
        };
        div.onclick = () => {
            if (!confirming) {
                div.textContent += ' ?';
                div.style.color = 'red';
                confirming = true;
            } else {
                currentSkills = currentSkills.filter(tag => tag !== s);
                renderTagsAndSkills();
            }
        };
        skillList.appendChild(div);
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
  currentTags = [];
  currentSkills = [];
  renderTagsAndSkills();
  renderUser(allUsers);
});
let lastSearchedPayload = null;
let controller = null;
function debounce(fn, delay = 400){
    let t;

}
document.getElementById('search-form').addEventListener('change', debouncedSearch);
async function buildPayload(pageIndex){
    const payload = {
        q: document.getElementById('nomPrenom').value.trim(),
        status: document.getElementById('searchStatus').value || "",
        city: document.getElementById('place').value.trim(),
        postal: document.getElementById('postal').value.trim(),
        age: document.getElementById('age').value
            ? Number(document.getElementById('age').value) : null,
        trancheAge: document.getElementById('trancheAge').value || "",
        permis: document.getElementById('permis').checked,
        vehicule: document.getElementById('vehicule').checked,
        mobile: document.getElementById('mobile').checked,

        tags: getSelectedTags(),
        skills: getSelectedSkills(),
        page: 1,
        pageSize: 10,
    };
    try{
        const results = await api('/api/admin-panel', {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(payload),
        });

    } catch (err) {
        console.error(err);
    }

}