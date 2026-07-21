import { describe, it, expect } from 'vitest';
import {
	computePlacementStatut,
	parseFormStr,
	parseFormBool,
	parseFormInt,
	normalizeContrat,
	normalizeStatutOpco,
	situationLabel,
	diplomeLabel,
	OPCO_LABELS,
	SITUATIONS,
	DIPLOMES,
	VALID_CONTRAT,
	VALID_STATUT_OPCO
} from './placementLogic';

describe('computePlacementStatut', () => {
	it('is complet when both fiches are submitted', () => {
		expect(computePlacementStatut(true, true)).toBe('complet');
	});
	it('is etudiant_ok when only the student fiche is submitted', () => {
		expect(computePlacementStatut(true, false)).toBe('etudiant_ok');
	});
	it('is entreprise_ok when only the company fiche is submitted', () => {
		expect(computePlacementStatut(false, true)).toBe('entreprise_ok');
	});
	it('falls back to liens_envoyes when neither is submitted', () => {
		expect(computePlacementStatut(false, false)).toBe('liens_envoyes');
	});
});

describe('parseFormStr', () => {
	it('trims and returns the string', () => {
		expect(parseFormStr('  hello  ')).toBe('hello');
	});
	it('returns null for empty / whitespace / nullish', () => {
		expect(parseFormStr('')).toBeNull();
		expect(parseFormStr('   ')).toBeNull();
		expect(parseFormStr(null)).toBeNull();
		expect(parseFormStr(undefined)).toBeNull();
	});
});

describe('parseFormBool', () => {
	it('accepts HTML checkbox + oui conventions (case-insensitive)', () => {
		for (const v of ['on', '1', 'true', 'oui', 'OUI', 'True']) {
			expect(parseFormBool(v)).toBe(true);
		}
	});
	it('is false for anything else', () => {
		for (const v of ['', 'off', '0', 'false', 'non', null, undefined]) {
			expect(parseFormBool(v)).toBe(false);
		}
	});
});

describe('parseFormInt', () => {
	it('parses integers', () => {
		expect(parseFormInt('42')).toBe(42);
		expect(parseFormInt('  7 ')).toBe(7);
	});
	it('returns null for empty or non-numeric', () => {
		expect(parseFormInt('')).toBeNull();
		expect(parseFormInt('abc')).toBeNull();
		expect(parseFormInt(null)).toBeNull();
	});
});

describe('normalizeContrat', () => {
	it('keeps valid contract codes', () => {
		expect(normalizeContrat('apprentissage')).toBe('apprentissage');
		expect(normalizeContrat('professionnalisation')).toBe('professionnalisation');
	});
	it('returns null for invalid / empty', () => {
		expect(normalizeContrat('cdi')).toBeNull();
		expect(normalizeContrat('')).toBeNull();
		expect(normalizeContrat(null)).toBeNull();
	});
	it('only allows the two documented contract types', () => {
		expect(VALID_CONTRAT.size).toBe(2);
	});
});

describe('normalizeStatutOpco', () => {
	it('keeps valid OPCO statuses', () => {
		for (const v of VALID_STATUT_OPCO) {
			expect(normalizeStatutOpco(v)).toBe(v);
		}
	});
	it('falls back to en_attente for invalid input', () => {
		expect(normalizeStatutOpco('bogus')).toBe('en_attente');
		expect(normalizeStatutOpco('')).toBe('en_attente');
		expect(normalizeStatutOpco(null)).toBe('en_attente');
	});
	it('has a label for every valid status', () => {
		for (const v of VALID_STATUT_OPCO) {
			expect(OPCO_LABELS[v]).toBeTruthy();
		}
	});
});

describe('situationLabel / diplomeLabel', () => {
	it('maps known codes to labels', () => {
		expect(situationLabel('1')).toBe('Scolaire');
		expect(situationLabel('10')).toBe('Salarié');
		expect(diplomeLabel('54')).toBe('BTS');
		expect(diplomeLabel('80')).toBe('Doctorat');
	});
	it('falls back to the raw code for unknown values', () => {
		expect(situationLabel('999')).toBe('999');
		expect(diplomeLabel('999')).toBe('999');
	});
	it('returns an em dash for nullish', () => {
		expect(situationLabel(null)).toBe('—');
		expect(diplomeLabel(undefined)).toBe('—');
	});
	it('label maps cover every referential entry', () => {
		for (const [code, label] of SITUATIONS) expect(situationLabel(code)).toBe(label);
		for (const [code, label] of DIPLOMES) expect(diplomeLabel(code)).toBe(label);
	});
	it('has no duplicate codes in the referentials', () => {
		expect(new Set(SITUATIONS.map(([c]) => c)).size).toBe(SITUATIONS.length);
		expect(new Set(DIPLOMES.map(([c]) => c)).size).toBe(DIPLOMES.length);
	});
});
