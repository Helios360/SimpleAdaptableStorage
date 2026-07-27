import { describe, it, expect } from 'vitest';
import {
	SMIC_MENSUEL_BRUT,
	trancheForAge,
	suggestSalaire,
	suggestionsParAnnee,
	grillePour,
	formatEuros
} from './salaire';

describe('trancheForAge', () => {
	it('classe l\'âge dans la bonne tranche (apprentissage)', () => {
		expect(trancheForAge(17)?.label).toBe('Moins de 18 ans');
		expect(trancheForAge(18)?.label).toBe('18 à 20 ans');
		expect(trancheForAge(20)?.label).toBe('18 à 20 ans');
		expect(trancheForAge(21)?.label).toBe('21 à 25 ans');
		expect(trancheForAge(25)?.label).toBe('21 à 25 ans');
		expect(trancheForAge(26)?.label).toBe('26 ans et plus');
		expect(trancheForAge(45)?.label).toBe('26 ans et plus');
	});

	it('utilise la grille professionnalisation quand demandé', () => {
		expect(trancheForAge(20, 'professionnalisation')?.label).toBe('Moins de 21 ans');
		expect(trancheForAge(20, 'professionnalisation')?.pct[0]).toBe(65);
	});

	it('renvoie null pour un âge inconnu ou aberrant', () => {
		expect(trancheForAge(null)).toBeNull();
		expect(trancheForAge(undefined)).toBeNull();
		expect(trancheForAge(-1)).toBeNull();
		expect(trancheForAge(200)).toBeNull();
		expect(trancheForAge(Number.NaN)).toBeNull();
	});
});

describe('suggestSalaire', () => {
	it('applique le % de la tranche et de l\'année au SMIC', () => {
		const s = suggestSalaire(19, 1);
		expect(s).toEqual({ annee: 1, pct: 43, montant: Math.round(SMIC_MENSUEL_BRUT * 0.43) });
		expect(suggestSalaire(19, 2)?.pct).toBe(51);
		expect(suggestSalaire(19, 3)?.pct).toBe(67);
	});

	it('verse le SMIC entier à partir de 26 ans', () => {
		expect(suggestSalaire(30, 1)?.pct).toBe(100);
		expect(suggestSalaire(30, 1)?.montant).toBe(Math.round(SMIC_MENSUEL_BRUT));
	});

	it('borne l\'année d\'exécution à [1, 3]', () => {
		expect(suggestSalaire(19, 0)?.annee).toBe(1);
		expect(suggestSalaire(19, 9)?.annee).toBe(3);
		expect(suggestSalaire(19, Number.NaN)?.annee).toBe(1);
	});

	it('renvoie null sans âge', () => {
		expect(suggestSalaire(null)).toBeNull();
	});

	it('ne fait pas varier le montant selon l\'année en professionnalisation', () => {
		const rows = [1, 2, 3].map((a) => suggestSalaire(22, a, 'professionnalisation')?.pct);
		expect(rows).toEqual([80, 80, 80]);
	});
});

describe('suggestionsParAnnee', () => {
	it('renvoie les trois années de la tranche', () => {
		const rows = suggestionsParAnnee(17);
		expect(rows.map((r) => r.annee)).toEqual([1, 2, 3]);
		expect(rows.map((r) => r.pct)).toEqual([27, 39, 55]);
	});
	it('renvoie un tableau vide sans âge', () => {
		expect(suggestionsParAnnee(null)).toEqual([]);
	});
});

describe('grillePour', () => {
	it('retombe sur l\'apprentissage par défaut', () => {
		expect(grillePour(null)).toBe(grillePour('apprentissage'));
		expect(grillePour('inconnu')).toBe(grillePour('apprentissage'));
	});
});

describe('formatEuros', () => {
	it('formate en euros à la française', () => {
		expect(formatEuros(1802).replace(/ | /g, ' ')).toBe('1 802 €');
	});
});
