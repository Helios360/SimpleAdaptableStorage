import { describe, it, expect } from 'vitest';
import {
	schoolType,
	checklistItemsForSchool,
	checklistProgress,
	sanitizeChecklist,
	CHECKLIST_ITEMS
} from './checklist';

describe('schoolType', () => {
	it('déduit skalys / cloud campus du libellé, insensible à la casse', () => {
		expect(schoolType('Skalys Lyon')).toBe('skalys');
		expect(schoolType('SKALYS')).toBe('skalys');
		expect(schoolType('Cloud Campus Paris')).toBe('cloud_campus');
		expect(schoolType('cloudcampus')).toBe('cloud_campus');
	});
	it('retombe sur autre pour un libellé inconnu / vide', () => {
		expect(schoolType('IPSSI Paris')).toBe('autre');
		expect(schoolType('')).toBe('autre');
		expect(schoolType(null)).toBe('autre');
		expect(schoolType(undefined)).toBe('autre');
	});
});

describe('checklistItemsForSchool', () => {
	it('autre = tronc commun seul (ni Discord ni e-learning)', () => {
		const keys = checklistItemsForSchool('autre').map((i) => i.key);
		expect(keys).not.toContain('discord');
		expect(keys).not.toContain('eLearning');
		expect(keys).toContain('formulaireEtudiant');
		expect(keys).toContain('ypareoNeo');
	});
	it('cloud_campus ajoute Discord (pas e-learning)', () => {
		const keys = checklistItemsForSchool('cloud_campus').map((i) => i.key);
		expect(keys).toContain('discord');
		expect(keys).not.toContain('eLearning');
	});
	it('skalys ajoute la plateforme e-learning (pas Discord)', () => {
		const keys = checklistItemsForSchool('skalys').map((i) => i.key);
		expect(keys).toContain('eLearning');
		expect(keys).not.toContain('discord');
	});
});

describe('sanitizeChecklist', () => {
	it('ne garde que les clés connues, coercées en booléens', () => {
		const out = sanitizeChecklist({
			formulaireEtudiant: true,
			ypareoNeo: 1,
			inconnu: true
		});
		expect(out).toEqual({ formulaireEtudiant: true, ypareoNeo: true });
	});
	it('gère les entrées non-objet', () => {
		expect(sanitizeChecklist(null)).toEqual({});
		expect(sanitizeChecklist('oops')).toEqual({});
		expect(sanitizeChecklist(undefined)).toEqual({});
	});
});

describe('checklistProgress', () => {
	it('compte les items cochés sur le total du type école', () => {
		const total = checklistItemsForSchool('cloud_campus').length;
		const p = checklistProgress('cloud_campus', { formulaireEtudiant: true, discord: true });
		expect(p).toEqual({ done: 2, total });
	});
	it('ignore les clés hors périmètre du type école', () => {
		// eLearning n'est pas dans la liste cloud_campus → non compté
		const p = checklistProgress('cloud_campus', { eLearning: true });
		expect(p.done).toBe(0);
	});
});

describe('CHECKLIST_ITEMS', () => {
	it('a des clés uniques', () => {
		const keys = CHECKLIST_ITEMS.map((i) => i.key);
		expect(new Set(keys).size).toBe(keys.length);
	});
});
