const CV = document.getElementById('cv');
const PI = document.getElementById('pi');
const tag = document.getElementById('add_tags');
const skills = document.getElementById('add_skills');
const cv_frame = document.getElementById('cv_frame');
const urlParams = new URLSearchParams(window.location.search);
const targetEmail = urlParams.get('email'); // email from ?email=...
const token = localStorage.getItem('token');

document.getElementById('pis').style.display = "none";

let currentTags = [];
let currentSkills = [];
const test = document.getElementById('test');
const accountDelete = document.getElementById('deleteBtn');
test.addEventListener('click',()=>{ window.location.href= "/test";})

const fetchUrl = targetEmail ? `/api/admin/student/${encodeURIComponent(targetEmail)}` : '/api/profile';
if (fetchUrl!= '/api/profile') test.style.display="none";

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
fetch(fetchUrl, { credentials: 'include'})
.then(res => res.json())
.then(data => {
if (data.success) {
    const user = data.user || data.student;
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
    document.getElementById('status').value = user.status;
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
            tags: currentTags,
            skills: currentSkills,
            status: document.getElementById('status').value
        };
        const endpoint = targetEmail ? '/api/admin/update-student' : '/api/update-tags';
        fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(res => res.json())
        .then(result => {
            if (!result.success) throw new Error(result.message);
            notif('Profil mis à jour avec succès');
            renderTagsAndSkills();
        })
        .catch(err => { notif('Échec de la mise à jour' + err); });
    });

    const cvUrl = `${user.cv}`;
        fetch(cvUrl, { method: 'GET', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })
        .then(response => { if (!response.ok) throw new Error("Accès refusé au CV"); return response.blob(); })
        .then(blob => { const url = URL.createObjectURL(blob); document.getElementById('cv-frame').src = url; })
        .catch(() => { notif("Impossible de charger le CV."); });
        CV.style.backgroundColor = "var(--secondary)";
        CV.style.color = "var(--primary)";
        PI.style.backgroundColor = "var(--primary)";
        PI.style.color = "var(--secondary)";

    CV.addEventListener('click', function (){ // charger le cv
        document.getElementById('pis').style.display = "none";
        document.getElementById('cv-frame').style.display = "block";
        const cvUrl = `${user.cv}`;
        fetch(cvUrl, { method: 'GET', credentials: include })
        .then(response => { if (!response.ok) throw new Error("Accès refusé au CV"); return response.blob(); })
        .then(blob => { const url = URL.createObjectURL(blob); document.getElementById('cv-frame').src = url;})
        .catch(() => { notif("Impossible de charger le CV.");});
        CV.style.backgroundColor = "var(--secondary)";
        CV.style.color = "var(--primary)";
        PI.style.backgroundColor = "var(--primary)";
        PI.style.color = "var(--secondary)";
    });
    PI.addEventListener('click', function (){ // charger la pi
        document.getElementById('cv-frame').style.display = "none";
        document.getElementById('pis').style.display = "block";
        const rectoUrl = `${user.id_doc}`;
        const versoUrl = `${user.id_doc_verso}`;
        const headers = { method: 'GET', headers: {'Authorization': 'Bearer ' + localStorage.getItem('token')}};
        // Charger le recto
        fetch(rectoUrl, headers)
        .then(response => { if (!response.ok) throw new Error("Accès refusé au recto de la PI"); return response.blob(); })
        .then(blob => { const url = URL.createObjectURL(blob); document.getElementById('PImg').src = url; })
        .catch(() => { notif("Impossible de charger le recto de la PI."); });
        // Charger le verso
        fetch(versoUrl, headers)
        .then(response => { if (!response.ok) throw new Error("Accès refusé au verso de la PI"); return response.blob(); })
        .then(blob => { const url = URL.createObjectURL(blob); document.getElementById('PImgVerso').src = url; })
        .catch(() => { notif("Impossible de charger le verso de la PI."); });

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