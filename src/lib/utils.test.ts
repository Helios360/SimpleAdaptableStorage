import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	initials,
	scoreColor,
	statutLabel,
	rechercheStatutLabel,
	candidatureLabel,
	debounce,
	ageFromBirth
} from './utils';
import { C } from './tokens';

describe('initials', () => {
	it('uppercases the first letter of each word', () => {
		expect(initials('Léa Martin')).toBe('LM');
	});

	it('handles multi-word names', () => {
		expect(initials('Jean-Paul de la Vega')).toBe('JDLV');
	});

	it('ignores empty segments from double spaces', () => {
		expect(initials('Anna   Sun')).toBe('AS');
	});

	it('returns an empty string for an empty input', () => {
		expect(initials('')).toBe('');
	});
});

describe('scoreColor', () => {
	it('returns the muted colour for null/undefined', () => {
		expect(scoreColor(null)).toBe(C.muted);
		expect(scoreColor(undefined)).toBe(C.muted);
	});

	it('returns green at and above 75', () => {
		expect(scoreColor(75)).toBe(C.green);
		expect(scoreColor(99)).toBe(C.green);
	});

	it('returns orange between 60 and 74', () => {
		expect(scoreColor(60)).toBe(C.orange);
		expect(scoreColor(74)).toBe(C.orange);
	});

	it('returns red below 60', () => {
		expect(scoreColor(0)).toBe(C.red);
		expect(scoreColor(59)).toBe(C.red);
	});
});

describe('statutLabel', () => {
	it('translates known codes', () => {
		expect(statutLabel('en_attente')).toBe('En attente');
		expect(statutLabel('valide')).toBe('Validé');
		expect(statutLabel('refuse')).toBe('Refusé');
	});

	it('falls back to the raw value for unknown codes', () => {
		expect(statutLabel('inconnu')).toBe('inconnu');
	});
});

describe('rechercheStatutLabel', () => {
	it('translates known codes', () => {
		expect(rechercheStatutLabel('active')).toBe('Recherche active');
		expect(rechercheStatutLabel('recherche')).toBe('En recherche');
		expect(rechercheStatutLabel('entreprise')).toBe('En entreprise');
		expect(rechercheStatutLabel('archive')).toBe('Archivé');
	});

	it('falls back to the raw value', () => {
		expect(rechercheStatutLabel('xxx')).toBe('xxx');
	});
});

describe('candidatureLabel', () => {
	it('translates known codes', () => {
		expect(candidatureLabel('envoyee')).toBe('Envoyée');
		expect(candidatureLabel('entretien')).toBe('Entretien');
		expect(candidatureLabel('refusee')).toBe('Refusée');
	});
});

describe('debounce', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('calls the function only once after rapid invocations', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);
		debounced();
		debounced();
		debounced();
		expect(fn).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('passes the latest arguments through', () => {
		const fn = vi.fn();
		const debounced = debounce(fn as unknown as (a: number) => void, 50);
		(debounced as unknown as (a: number) => void)(1);
		(debounced as unknown as (a: number) => void)(2);
		vi.advanceTimersByTime(50);
		expect(fn).toHaveBeenCalledWith(2);
	});
});

describe('ageFromBirth', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
	});
	afterEach(() => vi.useRealTimers());

	it('returns null for null/undefined/empty input', () => {
		expect(ageFromBirth(null)).toBeNull();
		expect(ageFromBirth(undefined)).toBeNull();
		expect(ageFromBirth('')).toBeNull();
	});

	it('returns null for unparsable strings', () => {
		expect(ageFromBirth('not-a-date')).toBeNull();
	});

	it('computes age when the birthday has already passed this year', () => {
		expect(ageFromBirth('2000-01-01')).toBe(25);
	});

	it('does not count the year when the birthday has not yet occurred', () => {
		expect(ageFromBirth('2000-12-31')).toBe(24);
	});

	it('handles the exact-birthday case', () => {
		expect(ageFromBirth('2000-06-15')).toBe(25);
	});
});
