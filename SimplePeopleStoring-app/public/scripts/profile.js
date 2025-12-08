const CV = document.getElementById('cv');
const AT = document.getElementById('at');
const PI = document.getElementById('pi');
const pimg = document.getElementById('PImg');
const pimgverso = document.getElementById('PImgVerso');
const tag = document.getElementById('add_tags');
const skills = document.getElementById('add_skills');
const urlParams = new URLSearchParams(window.location.search);
const urlTargetId = urlParams.get('id');
const frame = document.getElementById('cv-frame');
const logoutBtn = document.getElementById('logoutBtn');
const accountDelete = document.getElementById('deleteBtn');
const tagInput = document.getElementById('add_tags');
const skillInput = document.getElementById('add_skills');
document.getElementById('pis').style.display = "none";

let currentTags = [];
let currentSkills = [];
let targetId = null;
const adminView = !!urlTargetId;
const fetchUrl = adminView ? `/api/user-profile/${encodeURIComponent(urlTargetId)}` : '/api/profile';
if (!adminView) logoutBtn.style.display="none";

const fileUrl = kind => adminView ? `/api/admin/user/${encodeURIComponent(urlTargetId)}/files/${encodeURIComponent(kind)}` : `/api/me/files/${encodeURIComponent(kind)}`;

async function deleteSelf(){ await api('/api/delete', {method: 'DELETE'});}
async function deleteAsAdmin(userId){await api(`/api/admin/users/${encodeURIComponent(userId)}`,{ method: 'DELETE'});}

if(!adminView)document.getElementById('status-parent').style.display = "none";

fetch(fetchUrl, { method: 'POST'})
.then(res => res.json())
.then(data => {
if (data.success) {
    const user = data.user || data.student;
    let hasAT = !!user.state_work_auth || user.state_work_auth !== "empty";
    targetId = user.id;

    if (adminView) { // Admin deletes an account
        accountDelete.textContent="Supprimer utilisateur";
        accountDelete.addEventListener('click', async ()=>{
            const choice = await alertChoice(`Supprimer définitivement ${user.name} ? Cette action est irréverssible.`);
            if (choice) {
                accountDelete.disabled = true;
                try{
                    await deleteAsAdmin(user.id);
                    notif(`Utilisateur ${user.name} supprimé définitivement.`);
                    window.location.href = '/admin-panel';
                } catch (e) { notif("Suppression impossible") ;
                } finally { accountDelete.disabled = false;} 
            }
        })
    } else { // User deletes his account
        accountDelete.addEventListener('click', async() => {
            const choice = await alertChoice(`Supprimer définitivement ${user.name} ? Cette action est irréverssible.`);
            if (choice) {
                accountDelete.disabled = true;
                try{
                    await deleteSelf();
                    notif(`Compte supprimé. À bientôt chez Cloud Campus`);
                    window.location.href = '/signin';
                } catch (e) { notif("Suppression impossible") ; console.error(e);
                } finally { accountDelete.disabled = false;} 
            }
        });
    }
    // Remplir les infos
    document.getElementById('name').value = user.name.toUpperCase();
    document.getElementById('fname').value = user.fname;
    document.getElementById('email').value = user.email;
    document.getElementById('tel').value = user.tel;
    if (adminView)document.getElementById('status').value = user.status;
    //const dateOnly = user.birth.split("T")[0].replace(/-/g, "/");
    const birthDate = new Date(user.birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {age--;}
    document.getElementById('birth').value = user.birth.split("T")[0];
    document.getElementById('age').textContent = age+ ' ans ';
    document.getElementById('city').value = user.city;
    document.getElementById('postal').value = user.postal;
    document.getElementById('addr').value = user.addr;
    document.getElementById('permis').checked = user.permis;
    document.getElementById('vehicule').checked = user.vehicule;
    document.getElementById('mobile').checked = user.mobile;

    document.getElementById('tel').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    })
    document.getElementById('postal').addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, '');
    })
    document.getElementById('saveBtn').addEventListener('click', () => {
        const data = {
            name: document.getElementById('name').value,
            fname: document.getElementById('fname').value,
            tel: document.getElementById('tel').value,
            birth: document.getElementById('birth').value,
            city: document.getElementById('city').value,
            postal: document.getElementById('postal').value,
            addr: document.getElementById('addr').value,
            permis: document.getElementById('permis').checked,
            vehicule: document.getElementById('vehicule').checked,
            mobile: document.getElementById('mobile').checked,
            skills: currentSkills,
        };
        if (!data.email || !data.email.includes('@')) notif('Email invalide. Sauvegarde annulé.');
        if (adminView){data.tags = currentTags; data.status=document.getElementById('status').value; }
        const endpoint = adminView ? '/api/admin/update-student' : '/api/update-tags';
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(res => res.json())
        .then(result => {
            if (!result.success) throw new Error(result.message);
            notif('Profil mis à jour avec succès');
            renderTagsAndSkills();
        })
        .catch(() => { notif('Échec de la mise à jour'); });
    });
    const pis = document.getElementById('pis');
    const cvAction = document.getElementById('cv-action');
    const atAction = document.getElementById('at-action');
    atAction.style.display = "none";
    frame.style.display = "block";
    frame.src = fileUrl('cv');
    CV.style.backgroundColor = "var(--secondary)";
    CV.style.color = "var(--primary)";
    AT.style.backgroundColor = "var(--primary)";
    AT.style.color = "var(--secondary)";
    PI.style.backgroundColor = "var(--primary)";
    PI.style.color = "var(--secondary)";

    CV.addEventListener('click', function (){ // charger le cv
        pis.style.display = "none";
        cvAction.style.display = "flex";
        atAction.style.display = "none";
        frame.style.display = "block";
        frame.src = fileUrl('cv');
        CV.style.backgroundColor = "var(--secondary)";
        CV.style.color = "var(--primary)";
        AT.style.backgroundColor = "var(--primary)";
        AT.style.color = "var(--secondary)";
        PI.style.backgroundColor = "var(--primary)";
        PI.style.color = "var(--secondary)";
    });
    if(hasAT) {
        AT.style.display="flex";
        AT.addEventListener('click', function (){ // charger l'attestation de travail
            pis.style.display = "none";
            cvAction.style.display = "none";
            atAction.style.display = "flex";
            frame.style.display = "block";
            if (!hasAT) {frame.src=''; notif('Aucune AT enregistée');} 
            else {frame.src = fileUrl('state_work_auth');}
            AT.style.backgroundColor = "var(--secondary)";
            AT.style.color = "var(--primary)";
            CV.style.backgroundColor = "var(--primary)";
            CV.style.color = "var(--secondary)";
            PI.style.backgroundColor = "var(--primary)";
            PI.style.color = "var(--secondary)";
        });
    } else { AT.style.display = 'none';}
    PI.addEventListener('click', function (){ // charger la pi
        frame.style.display = "none";
        pis.style.display = "block";
        cvAction.style.display = "none";
        atAction.style.display = "none";
        pimg.style.backgroundImage = "url('"+fileUrl('id_doc')+"')";
        pimgverso.style.backgroundImage = "url('"+fileUrl('id_doc_verso')+"')";
        CV.style.backgroundColor = "var(--primary)";
        CV.style.color = "var(--secondary)";
        AT.style.backgroundColor = "var(--primary)";
        AT.style.color = "var(--secondary)";
        PI.style.backgroundColor = "var(--secondary)";
        PI.style.color = "var(--primary)";
    });

    // No tags and reset button display for non admins
    currentSkills = Array.isArray(user.skills) ? user.skills : JSON.parse(user.skills || '[]');
    if (user.tags !== undefined) {
        currentTags = Array.isArray(user.tags) ? user.tags : JSON.parse(user.tags || '[]');
        document.getElementById('tagsWrapper').style.display = 'flex';
    } else {
        currentTags = [];
        document.getElementById('tagsWrapper').style.display = 'none';
        document.getElementById('resetBtn').style.display = 'none';
    }
    renderTagsAndSkills();

    // When tag input loses focus or user presses Enter
    tagInput.addEventListener('change', () => {
        const tag = tagInput.value.trim();
        if (tag && !currentTags.includes(tag)) {
            currentTags.push(tag);
            renderTagsAndSkills();
        }
        tagInput.value = '';
    });
    // When skill input loses focus or user presses Enter
    skillInput.addEventListener('change', () => {
        const skill = skillInput.value.trim();
        if (skill && !currentSkills.includes(skill)) {
            currentSkills.push(skill);
            renderTagsAndSkills();
        }
        skillInput.value = '';
    });
} else { notif('Non autorisé'); window.location.href = '/signin'; }
})
.catch(() => { notif("Erreur lors de la récupération du profil"); window.location.href = '/signin'; });

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
            }
        };
        tagList.appendChild(span);
    });
    currentSkills.forEach(s => {
        const span = document.createElement('span');
        const type = skillTypes[s] || 'unknown';
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
            }
        };
        skillList.appendChild(span);
    });
}

const imgBtns = document.querySelectorAll('.img-btn');
const imgBtnsV = document.querySelectorAll('.img-btn-v');
pimg.addEventListener('mouseover', ()=>{
    imgBtns.forEach(btn =>{
        btn.style.display="flex";
    })
})
pimg.addEventListener('mouseout', ()=>{
    imgBtns.forEach(btn =>{
        btn.style.display="none";
    })
})
pimgverso.addEventListener('mouseover', ()=>{
    imgBtnsV.forEach(btn =>{
        btn.style.display="flex";
    })
})
pimgverso.addEventListener('mouseout', ()=>{
    imgBtnsV.forEach(btn =>{
        btn.style.display="none";
    })
})

const change = document.getElementById('change');
const changeV = document.getElementById('change-v');
const changeCV = document.getElementById('change-cv');
const changeAT = document.getElementById('change-at');
const del = document.getElementById('delete');
const delV = document.getElementById('delete-v');
const delCV = document.getElementById('delete-cv');
const delAT = document.getElementById('delete-at');

del.addEventListener('click', () => {action('del'); pimg.style.backgroundImage='';});
delV.addEventListener('click', () => {action('delV'); pimgverso.style.backgroundImage='';});
delCV.addEventListener('click', () => {action('delCV'); frame.src='';});
delAT.addEventListener('click', () => {action('delAT'); hasAT=false; frame.src='';});

function action(name) {
    fetch('/api/files',{
        method: 'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action: name })
    })
    .then(r=>r.json())
    .then(console.log)
    .catch(console.error)
}

const fileUpload = document.getElementById('file-change'); 
const fileUploadV = document.getElementById('file-change-v'); 
const fileUploadCV = document.getElementById('file-change-cv');
const fileUploadAT = document.getElementById('file-change-at');

change.addEventListener('click', (e) => {
    e.preventDefault();
    fileUpload.click();
});
changeV.addEventListener('click', (e) => {
    e.preventDefault();
    fileUploadV.click();
});
changeCV.addEventListener('click', (e) => {
    e.preventDefault();
    fileUploadCV.click();
});
changeAT.addEventListener('click', (e) => {
    e.preventDefault();
    fileUploadAT.click();
});
async function uploadKind(kind, file){
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/upload/${encodeURIComponent(kind)}`,{ method : 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed');
    return data;
}
function previewFile(el, file){
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror =()=> reject(new Error('Preview Failed'));
        reader.onload =()=> {
            const dataUrl = String(reader.result);
            el.style.backgroundImage = `url("${dataUrl}")`;
            resolve(dataUrl);
        };
        reader.readAsDataURL(file);
    });
}
fileUpload.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    try{
        previewFile(pimg, file);
        const { url } = await uploadKind('id_doc', file);
        if (url) pimg.style.backgroundImage = `url("${url}")`;
        notif("Piece d'identité recto mise à jour ...");
    } catch (e) {
        console.error(e);
        notif("Erreur pendant l'upload");
    } finally { e.target.value =''; }
})
fileUploadV.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    try{
        previewFile(pimgverso, file);
        const { url } = await uploadKind('id_doc_verso', file);
        if (url) pimgverso.style.backgroundImage = `url("${url}")`;
        notif("Piece d'identité verso mise à jour ...");
    } catch (e) {
        console.error(e);
        notif("Erreur pendant l'upload");
    } finally { e.target.value =''; }
})
fileUploadCV.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    try{
        await uploadKind('cv', file);
        frame.src = `${fileUrl('cv')}`;
        notif("CV mis à jour ...");
    } catch (e) {
        console.error(e);
        notif("Erreur pendant l'upload");
    } finally { e.target.value =''; }
})
fileUploadAT.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    try{
        await uploadKind('state_work_auth', file);
        hasAT=true;
        frame.src = `${fileUrl('state_work_auth')}`;
        notif("AT mis à jour ...");
    } catch (e) {
        console.error(e);
        notif("Erreur pendant l'upload");
    } finally { e.target.value =''; }
})

let isDirty = false;
let pendingHref = false;
const infoList = document.querySelector('.info-list');
if (infoList) {
    infoList.addEventListener('input', onDirty, true);
    infoList.addEventListener('change', onDirty, true);
}
function onDirty(e) {
    const t = e.target;
    if(t.matches('input:not([readonly]), select, textarea')) isDirty = true;
}
document.getElementById('saveBtn')?.addEventListener('click', ()=>{ isDirty = false;});
window.addEventListener('beforeunload', (event) => {
    if(isDirty){
        event.preventDefault();
        event.returnValue ='';
    }
});
if(adminView){
    logoutBtn.addEventListener('click', ()=>{
        fetch('/logout', {
            method: 'POST',
            credentials: 'include'
        })
        .then(r => r.json())
        .then(() => {
            window.location.href='/signin';
        })
    })
}
const skillTypes = {
  // Languages
  'C': 'language',
  'C++': 'language',
  'Java': 'language',
  'JavaScript': 'language',
  'TypeScript': 'language',
  'Python': 'language',
  'Ruby': 'language',
  'Go': 'language',
  'Rust': 'language',
  'PHP': 'language',
  'Swift': 'language',
  'Kotlin': 'language',
  'Scala': 'language',
  'Dart': 'language',
  'R': 'language',
  'Bash': 'language',
  'Perl': 'language',

  // Frontend
  'HTML': 'frontend',
  'CSS': 'frontend',
  'React': 'frontend',
  'Vue.js': 'frontend',
  'Angular': 'frontend',
  'Svelte': 'frontend',
  'Next.js': 'frontend',
  'Gatsby': 'frontend',
  'Tailwind CSS': 'frontend',
  'Bootstrap': 'frontend',
  'jQuery': 'frontend',

  // Backend
  'Node.js': 'backend',
  'Express.js': 'backend',
  'Django': 'backend',
  'Flask': 'backend',
  'Ruby on Rails': 'backend',
  'Spring Boot': 'backend',
  'Laravel': 'backend',
  'ASP.NET': 'backend',
  'Koa.js': 'backend',
  'FastAPI': 'backend',
  'NestJS': 'backend',

  // Databases
  'PostgreSQL': 'database',
  'MySQL': 'database',
  'SQLite': 'database',
  'MongoDB': 'database',
  'Redis': 'database',
  'Firebase': 'database',
  'Cassandra': 'database',
  'MariaDB': 'database',
  'OracleDB': 'database',
  'DynamoDB': 'database',

  // DevOps / Tools
  'Docker': 'devops',
  'Kubernetes': 'devops',
  'Git': 'devops',
  'GitHub Actions': 'devops',
  'Jenkins': 'devops',
  'Terraform': 'devops',
  'Ansible': 'devops',
  'Nginx': 'devops',
  'Apache': 'devops',
  'AWS': 'devops',
  'Azure': 'devops',
  'GCP': 'devops',
  'Linux': 'devops',
  'CI/CD': 'devops',

  // Testing
  'Jest': 'testing',
  'Mocha': 'testing',
  'Chai': 'testing',
  'JUnit': 'testing',
  'Cypress': 'testing',
  'Selenium': 'testing',
  'PyTest': 'testing',
  'RSpec': 'testing',

  // Mobile
  'React Native': 'mobile',
  'Flutter': 'mobile',
  'SwiftUI': 'mobile',
  'Xamarin': 'mobile',

  // Other
  'GraphQL': 'other',
  'REST API': 'other',
  'Webpack': 'other',
  'Vite': 'other',
  'ESLint': 'other',
  'Prettier': 'other',
  'Storybook': 'other'
};

const typeColors = {
  language: '#43a4b1ff',
  frontend: '#66bd6dff',
  backend: '#f07ee8ff',
  database: '#ee6060ff',
  devops: '#f3b63aff',
  testing: '#9d8dfcff',
  mobile: '#50c5b7ff',
  other: '#b0bec5ff',
  unknown: 'transparent'
};