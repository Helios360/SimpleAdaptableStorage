const isDark = localStorage.getItem('dark') === 'true' || false;
document.documentElement.style.setProperty('--primary', isDark ? '#141414' : '#dff6f6');
document.documentElement.style.setProperty('--secondary', isDark ? '#dff6f6' : '#141414');