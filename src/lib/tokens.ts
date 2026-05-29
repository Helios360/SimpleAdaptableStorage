/**
 * Mirrors the CSS variables in app.css for the rare cases (charts, conditional
 * inline colors) where we need the value in script.
 */
export const C = {
	navy: '#0B1628',
	navyMid: '#162444',
	blue: '#1A56DB',
	blueDim: '#1346BF',
	blueLight: '#DBEAFE',
	blueSoft: '#EFF6FB',
	accent: '#06B6D4',
	accentLight: '#ECFEFF',
	green: '#10B981',
	greenLight: '#D1FAE5',
	orange: '#F59E0B',
	orangeLight: '#FEF3C7',
	red: '#EF4444',
	redLight: '#FEE2E2',
	purple: '#8B5CF6',
	purpleLight: '#EDE9FE',
	bg: '#F1F5FB',
	card: '#FFFFFF',
	text: '#0F172A',
	sub: '#334155',
	muted: '#64748B',
	border: '#E2E8F0',
	borderMid: '#CBD5E1'
} as const;
