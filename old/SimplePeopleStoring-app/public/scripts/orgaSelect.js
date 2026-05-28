const skalys = document.getElementById('skalys');
const cc = document.getElementById('cc');

function selectOrga(logoPath) {
    localStorage.setItem('logo', logoPath);
    window.location.href = '/signin';
}

cc.addEventListener('click', () => selectOrga('/sources/LogoBleuOmbre-edited.png'));
skalys.addEventListener('click', () => selectOrga('/sources/LogoCBS_icone_FondBlanc.webp'));
