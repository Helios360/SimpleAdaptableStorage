const CV = document.getElementById('cv');
const PI = document.getElementById('pi');
const pimg = document.getElementById('PImg');
const pimgverso = document.getElementById('PImgVerso');
const tag = document.getElementById('add_tags');
const skills = document.getElementById('add_skills');
const cv_frame = document.getElementById('cv_frame');
const urlParams = new URLSearchParams(window.location.search);
const targetEmail = urlParams.get('email'); // email from ?email=...
const cvFrame = document.getElementById('cv-frame');

document.getElementById('pis').style.display = "none";

let currentTags = [];
let currentSkills = [];
const test = document.getElementById('test');
const accountDelete = document.getElementById('deleteBtn');
test.addEventListener('click',()=>{ window.location.href= "/test";})

const fetchUrl = targetEmail ? `/api/admin/student/${encodeURIComponent(targetEmail)}` : '/api/profile';
if (fetchUrl!= '/api/profile') test.style.display="none";
let targetId = null;
const adminView = !!targetEmail;
const fileUrl = kind => adminView ? `/api/admin/user/${encodeURIComponent(targetId)}/files/${encodeURIComponent(kind)}` : `/api/me/files/${encodeURIComponent(kind)}`;
async function deleteSelf(){
    const res = await fetch('/api/delete', { method: 'DELETE', credentials: 'include'});
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Echec suppression');
}
async function deleteAsAdmin(userId){
    const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`,{ method: 'DELETE', credentials : 'include' });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || 'Echec suppression');
}
async function api(url, opts = {}){ // Better, will update to this soon
    const res = await fetch(url, {credentials: 'include', ...opts});
    if (res.status === 401 || res.status === 403){
        notif('Session expirée, Veuillez vous reconnecter...');
        window.location.href = '/signin';
        throw new Error('Unauthorized');
    } return res;
}
if(!adminView)document.getElementById('status').disabled = true;
fetch(fetchUrl, { method: 'POST',  credentials: 'include'})
.then(res => res.json())
.then(data => {
if (data.success) {
    const user = data.user || data.student;
    targetId = user.id;
    if (targetEmail) { // Admin deletes an account
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
    } else { // User delete his account
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

    document.getElementById('saveBtn').addEventListener('click', () => {
        const emailInput = document.getElementById('email').value.trim();
        if (!emailInput || !emailInput.includes('@')) { notif('Email invalide. Sauvegarde annulé.'); return; }
        const data = {
            name: document.getElementById('name').value,
            fname: document.getElementById('fname').value,
            email: document.getElementById('email').value,
            tel: document.getElementById('tel').value,
            birth: document.getElementById('birth').value,
            addr: document.getElementById('addr').value,
            city: document.getElementById('city').value,
            postal: document.getElementById('postal').value,
            skills: currentSkills,
        };
        if (adminView){data.tags = currentTags; data.status=document.getElementById('status').value; }
        const endpoint = targetEmail ? '/api/admin/update-student' : '/api/update-tags';
        fetch(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
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
    cvFrame.style.display = "block";
    cvFrame.src = fileUrl('cv');
    CV.style.backgroundColor = "var(--secondary)";
    CV.style.color = "var(--primary)";
    PI.style.backgroundColor = "var(--primary)";
    PI.style.color = "var(--secondary)";

    CV.addEventListener('click', function (){ // charger le cv
        pis.style.display = "none";
        cvAction.style.display = "flex";
        cvFrame.style.display = "block";
        cvFrame.src = fileUrl('cv');
        CV.style.backgroundColor = "var(--secondary)";
        CV.style.color = "var(--primary)";
        PI.style.backgroundColor = "var(--primary)";
        PI.style.color = "var(--secondary)";
    });
    PI.addEventListener('click', function (){ // charger la pi
        cvFrame.style.display = "none";
        pis.style.display = "block";
        cvAction.style.display = "none";
        pimg.style.backgroundImage = "url('"+fileUrl('id_doc')+"')";
        pimgverso.style.backgroundImage = "url('"+fileUrl('id_doc_verso')+"')";
        CV.style.backgroundColor = "var(--primary)";
        CV.style.color = "var(--secondary)";
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
    
    const tagInput = document.getElementById('add_tags');
    const skillInput = document.getElementById('add_skills');

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
const del = document.getElementById('delete');
const delV = document.getElementById('delete-v');
const delCV = document.getElementById('delete-cv');

del.addEventListener('click', () => {action('del'); pimg.style.backgroundImage=''});
delV.addEventListener('click', () => {action('delV'); pimgverso.style.backgroundImage=''});
delCV.addEventListener('click', () => {action('delCV'); cvFrame.src=''});

function action(name) {
    fetch('/api/files',{
        method: 'POST',
        credentials: 'include',
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

async function uploadKind(kind, file){
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/upload/${encodeURIComponent(kind)}`,{ method : 'POST', credentials: 'include', body: fd });
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
    } finally {
        e.target.value ='';
    }
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
    } finally {
        e.target.value ='';
    }
})
fileUploadCV.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    try{
        await uploadKind('cv', file);
        cvFrame.src = `${fileUrl('cv')}`;
        notif("CV mis à jour ...");
    } catch (e) {
        console.error(e);
        notif("Erreur pendant l'upload");
    } finally {
        e.target.value ='';
    }
})

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