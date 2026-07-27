import { describe, it, expect } from 'vitest';
import {
	RELANCE_DELAY_MS,
	RELANCE_MAX,
	nextRelanceAt,
	isRelanceDue,
	keepLatestPerAudience,
	type RelanceState
} from './relanceLogic';

const T0 = new Date('2026-01-01T09:00:00Z');
const plus = (ms: number) => new Date(T0.getTime() + ms);
const H = 60 * 60 * 1000;

function state(over: Partial<RelanceState> = {}): RelanceState {
	return {
		createdAt: T0,
		submittedAt: null,
		expiresAt: plus(7 * 24 * H),
		lastRelanceAt: null,
		relanceCount: 0,
		...over
	};
}

describe('nextRelanceAt', () => {
	it('place la première relance 72 h après l\'envoi du lien', () => {
		expect(nextRelanceAt(state())).toEqual(plus(RELANCE_DELAY_MS));
	});
	it('repart de la dernière relance ensuite', () => {
		const t = state({ lastRelanceAt: plus(72 * H), relanceCount: 1 });
		expect(nextRelanceAt(t)).toEqual(plus(144 * H));
	});
	it('s\'arrête quand la fiche est reçue', () => {
		expect(nextRelanceAt(state({ submittedAt: plus(H) }))).toBeNull();
	});
	it('s\'arrête au quota de relances', () => {
		expect(nextRelanceAt(state({ relanceCount: RELANCE_MAX }))).toBeNull();
	});
});

describe('isRelanceDue', () => {
	it('ne relance pas avant 72 h', () => {
		expect(isRelanceDue(state(), plus(71 * H))).toBe(false);
		expect(isRelanceDue(state(), plus(72 * H))).toBe(true);
		expect(isRelanceDue(state(), plus(80 * H))).toBe(true);
	});
	it('ne relance pas une fiche déjà envoyée', () => {
		expect(isRelanceDue(state({ submittedAt: plus(2 * H) }), plus(96 * H))).toBe(false);
	});
	it('ne relance pas un lien expiré', () => {
		const t = state({ expiresAt: plus(48 * H) });
		expect(isRelanceDue(t, plus(96 * H))).toBe(false);
	});
	it('espace deux relances de 72 h', () => {
		const t = state({ lastRelanceAt: plus(72 * H), relanceCount: 1 });
		expect(isRelanceDue(t, plus(100 * H))).toBe(false);
		expect(isRelanceDue(t, plus(144 * H))).toBe(true);
	});
	it('cesse après RELANCE_MAX relances', () => {
		const t = state({ lastRelanceAt: plus(144 * H), relanceCount: RELANCE_MAX });
		expect(isRelanceDue(t, plus(160 * H))).toBe(false);
	});
});

describe('keepLatestPerAudience', () => {
	it('ne garde que le token le plus récent par placement et audience', () => {
		const rows = [
			{ token: 'a', placementId: 1, audience: 'entreprise', createdAt: T0 },
			{ token: 'b', placementId: 1, audience: 'entreprise', createdAt: plus(H) },
			{ token: 'c', placementId: 1, audience: 'etudiant', createdAt: T0 },
			{ token: 'd', placementId: 2, audience: 'entreprise', createdAt: T0 }
		];
		const kept = keepLatestPerAudience(rows).map((r) => r.token).sort();
		expect(kept).toEqual(['b', 'c', 'd']);
	});
	it('accepte une liste vide', () => {
		expect(keepLatestPerAudience([])).toEqual([]);
	});
});
