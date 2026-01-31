async function loadComponents(id, file){
    const res = await fetch('/components/' + file);
    document.getElementById(id).innerHTML = await res.text();
}

const root = document.documentElement;

function applyTheme(isDark) {
    if (isDark) {
        root.style.setProperty('--primary', '#141414');
        root.style.setProperty('--secondary', '#dff6f6');
        root.style.setProperty('--tertiary', '#46c2c2ff');

    } else {
        root.style.setProperty('--primary', '#dff6f6');
        root.style.setProperty('--secondary', '#141414');
        root.style.setProperty('--tertiary', '#1c1c68');
    }
}

function constructTheme() { 
    const button = document.getElementById('toggle-theme'); 
    if (!button) return; 
    applyTheme(localStorage.getItem('dark') === 'true'); 
    button.addEventListener('click', () => { 
        const isDark = localStorage.getItem('dark') === 'true' || false; 
        const newTheme = !isDark; localStorage.setItem('dark', newTheme.toString()); 
        applyTheme(newTheme); 
    }); 
}
(async function init(){ 
    await loadComponents('footer', "footer.html");
    await loadComponents('header', "header.html");
    constructTheme();
})();
function notif(message){
    const popup = document.createElement('div');
    popup.className="popup";
    const popupContent = document.createElement('div');
    popupContent.className="popup-content";
    popupContent.textContent=message;
    popup.appendChild(popupContent);
    document.body.appendChild(popup);
    setTimeout(()=>{ popup.remove(); }, 3000);
}
function notifAlert(message){
    const popup = document.createElement('div');
    popup.className = 'notif-alert';
    popup.id = 'alertnotif';
    popup.innerHTML=`
    <div>
        <h1 style="font-size:1.5rem;">${message}</h1>
        <button id="suivant">Suivant...</button>
    </div>
    `
    popup.querySelector('#suivant').addEventListener('click', () => { popup.remove();});
    document.body.appendChild(popup);
}
function alertChoice(message){
    return new Promise ((resolve) => {
        const popup = document.createElement('div');
        popup.className = 'notif-alert';
        popup.id = 'alertnotif';
        popup.innerHTML=`
        <div>
            <h1 style="font-size:1.5rem;">${message}</h1>
            <span>
                <button id="yes">Je confirme</button>
                <button id="no">Annuler et retour en arrière</button>
            </span>
        </div>
        `
        popup.querySelector('#no').addEventListener('click', () => { popup.remove(); resolve(false);});
        popup.querySelector('#yes').addEventListener('click', async () => { 
            popup.remove(); 
            resolve(true);
            await wait(3000);
            //window.location.href="/signin";
        });
        document.body.appendChild(popup);
    }) 
}
function wait(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

async function parseOrThrow(res){
    const ct = res.headers.get('content-type') || '';
    const isJSON = ct.includes('application/json');
    let body;
    try {body = isJSON? await res.json() : await res.text(); } catch {body=null;}
    if(!res.ok){
        const msgFromJSON = isJSON && (body?.message || body?.error);
        const msgFromHTML = !isJSON && typeof body === 'string' ? stripHTML(body).slice(0,300) : null;
        const err = new Error(msgFromJSON || msgFromHTML || 'Une erreur est survenue . . .');
        err.status = res.status;
        err.body = body;
        throw err;
    }
    return body;
}

function stripHTML(html){
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || '';
}

async function api(url, opts = {}){
    try{
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json', ...(opts.headers || {})}, ...opts
        });
        return await parseOrThrow(res);
    } catch(err){
        let msg = err.message || 'Erreur réseau . . .';
        if (err.status === 409) msg = 'Cet email est déja enregistré . . .';
        else if (err.status === 500) msg = 'Erreur serveur. Réessayez plus tard . . .';
        else msg = "Erreur inconnue . . .";
        notifAlert(msg);
        throw err;
    }
}

function populateDatalist(datalistEl, values){
  datalistEl.innerHTML = '';
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    datalistEl.appendChild(opt);
  });
}
function getSkillsFromFormationId(formationId){
    const cfg = formationCatalog?.[formationId];
    if(!cfg) return [];
    return Object.keys(cfg).sort();
}



const formationCatalog = {
  1: {
    // BTS NDRC
    'Prospection commerciale - acquis': 'skill',
    "Prospection commerciale - en cours d'acquisition": 'skill',

    'Techniques de vente de base - acquis': 'skill',
    "Techniques de vente de base - en cours d'acquisition": 'skill',

    'Relation client / accueil et conseil - acquis': 'skill',
    "Relation client / accueil et conseil - en cours d'acquisition": 'skill',

    'Communication orale et écrite - acquis': 'skill',
    "Communication orale et écrite - en cours d'acquisition": 'skill',

    'Outils numériques / bureautique (Word, Excel, PowerPoint) - acquis': 'skill',
    "Outils numériques / bureautique (Word, Excel, PowerPoint) - en cours d'acquisition": 'skill',

    'Réseaux sociaux / marketing digital - acquis': 'skill',
    "Réseaux sociaux / marketing digital - en cours d'acquisition": 'skill',

    'Création de supports simples avec Canva - acquis': 'skill',
    "Création de supports simples avec Canva - en cours d'acquisition": 'skill',

    'Organisation et gestion du temps - acquis': 'skill',
    "Organisation et gestion du temps - en cours d'acquisition": 'skill',

    'Travail en équipe / collaboration - acquis': 'skill',
    "Travail en équipe / collaboration - en cours d'acquisition": 'skill',

    'Adaptabilité et curiosité - acquis': 'skill',
    "Adaptabilité et curiosité - en cours d'acquisition": 'skill',
  },
  2: {
    // TP NTC
    'Prospection commerciale - acquis': 'skill',
    "Prospection commerciale - en cours d'acquisition": 'skill',

    'Techniques de vente et négociation de base - acquis': 'skill',
    "Techniques de vente et négociation de base - en cours d'acquisition": 'skill',

    'Relation client / conseil et écoute active - acquis': 'skill',
    "Relation client / conseil et écoute active - en cours d'acquisition": 'skill',

    'Communication orale et écrite - acquis': 'skill',
    "Communication orale et écrite - en cours d'acquisition": 'skill',

    'Outils numériques / bureautique (Word, Excel, PowerPoint) - acquis': 'skill',
    "Outils numériques / bureautique (Word, Excel, PowerPoint) - en cours d'acquisition": 'skill',

    'Réseaux sociaux / marketing digital - acquis': 'skill',
    "Réseaux sociaux / marketing digital - en cours d'acquisition": 'skill',

    'Présentation de produits / supports techniques simples - acquis': 'skill',
    "Présentation de produits / supports techniques simples - en cours d'acquisition": 'skill',

    'Organisation et gestion du temps - acquis': 'skill',
    "Organisation et gestion du temps - en cours d'acquisition": 'skill',

    'Travail en équipe / collaboration - acquis': 'skill',
    "Travail en équipe / collaboration - en cours d'acquisition": 'skill',

    'Adaptabilité et curiosité - acquis': 'skill',
    "Adaptabilité et curiosité - en cours d'acquisition": 'skill',
  },
  
  3: {
    // Dev Web Fullstack 
    /* =======================
      Languages
    ======================= */
    'C - acquis': 'language',
    "C - en cours d'acquisition": 'language',

    'C++ - acquis': 'language',
    "C++ - en cours d'acquisition": 'language',

    'Java - acquis': 'language',
    "Java - en cours d'acquisition": 'language',

    'JavaScript - acquis': 'language',
    "JavaScript - en cours d'acquisition": 'language',

    'TypeScript - acquis': 'language',
    "TypeScript - en cours d'acquisition": 'language',

    'Python - acquis': 'language',
    "Python - en cours d'acquisition": 'language',

    'Ruby - acquis': 'language',
    "Ruby - en cours d'acquisition": 'language',

    'Go - acquis': 'language',
    "Go - en cours d'acquisition": 'language',

    'Rust - acquis': 'language',
    "Rust - en cours d'acquisition": 'language',

    'PHP - acquis': 'language',
    "PHP - en cours d'acquisition": 'language',

    'Swift - acquis': 'language',
    "Swift - en cours d'acquisition": 'language',

    'Kotlin - acquis': 'language',
    "Kotlin - en cours d'acquisition": 'language',

    'Scala - acquis': 'language',
    "Scala - en cours d'acquisition": 'language',

    'Dart - acquis': 'language',
    "Dart - en cours d'acquisition": 'language',

    'R - acquis': 'language',
    "R - en cours d'acquisition": 'language',

    'Bash - acquis': 'language',
    "Bash - en cours d'acquisition": 'language',

    'Perl - acquis': 'language',
    "Perl - en cours d'acquisition": 'language',

    /* =======================
      Frontend
    ======================= */
    'HTML - acquis': 'frontend',
    "HTML - en cours d'acquisition": 'frontend',

    'CSS - acquis': 'frontend',
    "CSS - en cours d'acquisition": 'frontend',

    'React - acquis': 'frontend',
    "React - en cours d'acquisition": 'frontend',

    'Vue.js - acquis': 'frontend',
    "Vue.js - en cours d'acquisition": 'frontend',

    'Angular - acquis': 'frontend',
    "Angular - en cours d'acquisition": 'frontend',

    'Svelte - acquis': 'frontend',
    "Svelte - en cours d'acquisition": 'frontend',

    'Next.js - acquis': 'frontend',
    "Next.js - en cours d'acquisition": 'frontend',

    'Gatsby - acquis': 'frontend',
    "Gatsby - en cours d'acquisition": 'frontend',

    'Tailwind CSS - acquis': 'frontend',
    "Tailwind CSS - en cours d'acquisition": 'frontend',

    'Bootstrap - acquis': 'frontend',
    "Bootstrap - en cours d'acquisition": 'frontend',

    'jQuery - acquis': 'frontend',
    "jQuery - en cours d'acquisition": 'frontend',

    /* =======================
      Backend
    ======================= */
    'Node.js - acquis': 'backend',
    "Node.js - en cours d'acquisition": 'backend',

    'Express.js - acquis': 'backend',
    "Express.js - en cours d'acquisition": 'backend',

    'Django - acquis': 'backend',
    "Django - en cours d'acquisition": 'backend',

    'Flask - acquis': 'backend',
    "Flask - en cours d'acquisition": 'backend',

    'Ruby on Rails - acquis': 'backend',
    "Ruby on Rails - en cours d'acquisition": 'backend',

    'Spring Boot - acquis': 'backend',
    "Spring Boot - en cours d'acquisition": 'backend',

    'Laravel - acquis': 'backend',
    "Laravel - en cours d'acquisition": 'backend',

    'ASP.NET - acquis': 'backend',
    "ASP.NET - en cours d'acquisition": 'backend',

    'FastAPI - acquis': 'backend',
    "FastAPI - en cours d'acquisition": 'backend',

    'NestJS - acquis': 'backend',
    "NestJS - en cours d'acquisition": 'backend',

    /* =======================
      Databases
    ======================= */
    'PostgreSQL - acquis': 'database',
    "PostgreSQL - en cours d'acquisition": 'database',

    'MySQL - acquis': 'database',
    "MySQL - en cours d'acquisition": 'database',

    'SQLite - acquis': 'database',
    "SQLite - en cours d'acquisition": 'database',

    'MongoDB - acquis': 'database',
    "MongoDB - en cours d'acquisition": 'database',

    'Redis - acquis': 'database',
    "Redis - en cours d'acquisition": 'database',

    'Firebase - acquis': 'database',
    "Firebase - en cours d'acquisition": 'database',

    /* =======================
      DevOps / Tools
    ======================= */
    'Docker - acquis': 'devops',
    "Docker - en cours d'acquisition": 'devops',

    'Kubernetes - acquis': 'devops',
    "Kubernetes - en cours d'acquisition": 'devops',

    'Git - acquis': 'devops',
    "Git - en cours d'acquisition": 'devops',

    'CI/CD - acquis': 'devops',
    "CI/CD - en cours d'acquisition": 'devops',

    'Linux - acquis': 'devops',
    "Linux - en cours d'acquisition": 'devops',

    'AWS - acquis': 'devops',
    "AWS - en cours d'acquisition": 'devops',

    'Azure - acquis': 'devops',
    "Azure - en cours d'acquisition": 'devops',

    'GCP - acquis': 'devops',
    "GCP - en cours d'acquisition": 'devops',

    /* =======================
      Testing
    ======================= */
    'Jest - acquis': 'testing',
    "Jest - en cours d'acquisition": 'testing',

    'Cypress - acquis': 'testing',
    "Cypress - en cours d'acquisition": 'testing',

    'Selenium - acquis': 'testing',
    "Selenium - en cours d'acquisition": 'testing',

    'PyTest - acquis': 'testing',
    "PyTest - en cours d'acquisition": 'testing',

    /* =======================
      Mobile
    ======================= */
    'React Native - acquis': 'mobile',
    "React Native - en cours d'acquisition": 'mobile',

    'Flutter - acquis': 'mobile',
    "Flutter - en cours d'acquisition": 'mobile',

    'SwiftUI - acquis': 'mobile',
    "SwiftUI - en cours d'acquisition": 'mobile',

    'GraphQL - acquis': 'other',
    "GraphQL - en cours d'acquisition": 'other',

    'REST API - acquis': 'other',
    "REST API - en cours d'acquisition": 'other',

    'Webpack - acquis': 'other',
    "Webpack - en cours d'acquisition": 'other',

    'Vite - acquis': 'other',
    "Vite - en cours d'acquisition": 'other',
  },
  5: {
    //BTS GPME
    'Gestion administrative et suivi de dossiers - acquis': 'skill',
    "Gestion administrative et suivi de dossiers - en cours d'acquisition": 'skill',

    'Relation client / accueil et conseil - acquis': 'skill',
    "Relation client / accueil et conseil - en cours d'acquisition": 'skill',

    'Communication orale et écrite - acquis': 'skill',
    "Communication orale et écrite - en cours d'acquisition": 'skill',

    'Organisation et gestion du temps - acquis': 'skill',
    "Organisation et gestion du temps - en cours d'acquisition": 'skill',

    'Outils numériques / bureautique (Word, Excel, PowerPoint) - acquis': 'skill',
    "Outils numériques / bureautique (Word, Excel, PowerPoint) - en cours d'acquisition": 'skill',

    'Comptabilité et suivi de facturation de base - acquis': 'skill',
    "Comptabilité et suivi de facturation de base - en cours d'acquisition": 'skill',

    'Travail en équipe / collaboration - acquis': 'skill',
    "Travail en équipe / collaboration - en cours d'acquisition": 'skill',

    'Prise de notes et rédaction de comptes rendus - acquis': 'skill',
    "Prise de notes et rédaction de comptes rendus - en cours d'acquisition": 'skill',

    'Adaptabilité et curiosité - acquis': 'skill',
    "Adaptabilité et curiosité - en cours d'acquisition": 'skill',

    'Réseaux sociaux / communication digitale - acquis': 'skill',
    "Réseaux sociaux / communication digitale - en cours d'acquisition": 'skill',
  },
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