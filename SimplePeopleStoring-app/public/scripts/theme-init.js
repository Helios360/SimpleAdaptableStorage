const isDark = localStorage.getItem('dark') === 'true';
document.documentElement.style.setProperty('--primary', isDark ? '#141414' : '#F1F4F4');
document.documentElement.style.setProperty('--secondary', isDark ? '#F1F4F4' : '#141414');