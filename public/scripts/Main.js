const button = document.getElementById('toggle-theme');
const root = document.documentElement;

function applyTheme(isDark) {
    if (isDark) {
        root.style.setProperty('--primary', '#141414');
        root.style.setProperty('--secondary', '#F1F4F4');
    } else {
        root.style.setProperty('--primary', '#F1F4F4');
        root.style.setProperty('--secondary', '#141414');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const isDark = localStorage.getItem('dark') === 'true';
    applyTheme(isDark);
});

button.addEventListener('click', () => {
    const isDark = localStorage.getItem('dark') === 'true';
    const newTheme = !isDark;
    localStorage.setItem('dark', newTheme.toString());
    applyTheme(newTheme);
});
