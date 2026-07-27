import { describe, it, expect } from 'vitest';
import {
	cleanStr,
	parsePromoYear,
	parseOptionalId,
	validateFormation,
	validatePromo,
	validateSchool
} from './paramsLogic';

describe('cleanStr', () => {
	it('trims and returns the value', () => {
		expect(cleanStr('  hello  ')).toBe('hello');
	});
	it('returns null for empty / whitespace / non-string', () => {
		expect(cleanStr('   ')).toBeNull();
		expect(cleanStr('')).toBeNull();
		expect(cleanStr(null)).toBeNull();
		expect(cleanStr(42)).toBeNull();
	});
});

describe('parsePromoYear', () => {
	it('accepts a valid 4-digit year', () => {
		expect(parsePromoYear('2025')).toBe(2025);
		expect(parsePromoYear(2000)).toBe(2000);
		expect(parsePromoYear(2100)).toBe(2100);
	});
	it('returns null for empty / absent', () => {
		expect(parsePromoYear('')).toBeNull();
		expect(parsePromoYear(null)).toBeNull();
		expect(parsePromoYear(undefined)).toBeNull();
	});
	it('returns null out of range or non-integer', () => {
		expect(parsePromoYear('1999')).toBeNull();
		expect(parsePromoYear('2101')).toBeNull();
		expect(parsePromoYear('20.5')).toBeNull();
		expect(parsePromoYear('abc')).toBeNull();
	});
});

describe('parseOptionalId', () => {
	it('parses positive integer ids', () => {
		expect(parseOptionalId('3')).toBe(3);
	});
	it('returns null for empty / null sentinel / invalid', () => {
		expect(parseOptionalId('')).toBeNull();
		expect(parseOptionalId('null')).toBeNull();
		expect(parseOptionalId('0')).toBeNull();
		expect(parseOptionalId('-2')).toBeNull();
		expect(parseOptionalId('x')).toBeNull();
	});
});

describe('validateFormation', () => {
	it('accepts a valid code + name + optional school', () => {
		const r = validateFormation('  BTS SIO ', ' Services informatiques ', '2');
		expect(r).toEqual({
			ok: true,
			value: { code: 'BTS SIO', name: 'Services informatiques', schoolId: 2 }
		});
	});
	it('defaults schoolId to null when absent', () => {
		const r = validateFormation('CODE', 'Nom', '');
		expect(r).toEqual({ ok: true, value: { code: 'CODE', name: 'Nom', schoolId: null } });
	});
	it('rejects a missing code', () => {
		expect(validateFormation('', 'Nom', '')).toEqual({ ok: false, error: expect.any(String) });
	});
	it('rejects a missing name', () => {
		expect(validateFormation('CODE', '  ', '')).toEqual({ ok: false, error: expect.any(String) });
	});
	it('rejects an overly long code', () => {
		expect(validateFormation('X'.repeat(40), 'Nom', '').ok).toBe(false);
	});
});

describe('validatePromo', () => {
	it('accepts label with optional year + formation + school', () => {
		const r = validatePromo(' Promo A ', '2025', '2025-09-15', '4', '1');
		expect(r).toEqual({
			ok: true,
			value: {
				label: 'Promo A',
				year: 2025,
				dateRentree: '2025-09-15',
				formationId: 4,
				schoolId: 1
			}
		});
	});
	it('accepts label + rentrée alone (rest optional)', () => {
		const r = validatePromo('Promo B', '', '2025-09-01', '', '');
		expect(r).toEqual({
			ok: true,
			value: {
				label: 'Promo B',
				year: null,
				dateRentree: '2025-09-01',
				formationId: null,
				schoolId: null
			}
		});
	});
	it('rejects a missing label', () => {
		expect(validatePromo('   ', '2025', '2025-09-01', '', '').ok).toBe(false);
	});
	it('rejects an invalid year', () => {
		expect(validatePromo('Promo C', '1000', '2025-09-01', '', '').ok).toBe(false);
	});
	it('rejects a missing rentrée date', () => {
		expect(validatePromo('Promo D', '2025', '', '', '').ok).toBe(false);
	});
	it('rejects a malformed or non-existent rentrée date', () => {
		expect(validatePromo('Promo E', '2025', '15/09/2025', '', '').ok).toBe(false);
		expect(validatePromo('Promo F', '2025', '2025-02-31', '', '').ok).toBe(false);
	});
});

describe('validateSchool', () => {
	it('accepts and trims a valid name', () => {
		expect(validateSchool('  Cloud Campus ')).toEqual({
			ok: true,
			value: { name: 'Cloud Campus', mailTemplate: null, mailTemplateEntreprise: null }
		});
	});
	it('rejects an empty name', () => {
		expect(validateSchool('   ').ok).toBe(false);
	});
	it('rejects an overly long name', () => {
		expect(validateSchool('X'.repeat(90)).ok).toBe(false);
	});
	it('accepts a mail template carrying the {{lien}} variable', () => {
		const res = validateSchool('Skalys', 'Bonjour {{prenom}}, voici {{ lien }}');
		expect(res.ok && res.value.mailTemplate).toBe('Bonjour {{prenom}}, voici {{ lien }}');
	});
	it('rejects a mail template without the form link', () => {
		expect(validateSchool('Skalys', 'Bonjour {{prenom}}').ok).toBe(false);
	});
	it('accepts an entreprise template carrying the {{lien}} variable', () => {
		const res = validateSchool('Skalys', null, 'Bonjour {{contact_prenom}} : {{lien}}');
		expect(res.ok && res.value.mailTemplateEntreprise).toBe('Bonjour {{contact_prenom}} : {{lien}}');
	});
	it('rejects an entreprise template without the form link', () => {
		expect(validateSchool('Skalys', null, 'Bonjour {{contact_prenom}}').ok).toBe(false);
	});
});
