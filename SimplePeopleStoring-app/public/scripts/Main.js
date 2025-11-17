const button = document.getElementById('toggle-theme');
const root = document.documentElement;

function applyTheme(isDark) {
    if (isDark) {
        root.style.setProperty('--primary', '#141414');
        root.style.setProperty('--secondary', '#F1F4F4');
        root.style.setProperty('--tertiary', '#46c2c2ff');

    } else {
        root.style.setProperty('--primary', '#F1F4F4');
        root.style.setProperty('--secondary', '#141414');
        root.style.setProperty('--tertiary', '#1c1c68');
    }
}
window.addEventListener('DOMContentLoaded', () => { applyTheme(localStorage.getItem('dark') === 'true'); });

button.addEventListener('click', () => {
    const isDark = localStorage.getItem('dark') === 'true' || false;
    const newTheme = !isDark;
    localStorage.setItem('dark', newTheme.toString());
    applyTheme(newTheme);
});

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
        notifAlert(msg);
        throw err;
    }
}