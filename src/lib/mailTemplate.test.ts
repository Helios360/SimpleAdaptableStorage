import { describe, it, expect } from 'vitest';
import {
	escapeHtml,
	renderMailTemplate,
	templateToHtml,
	renderMailBody,
	splitFullName,
	MAIL_VARIABLE_KEYS
} from './mailTemplate';

describe('renderMailTemplate', () => {
	it('substitue les variables connues', () => {
		expect(renderMailTemplate('Bonjour {{prenom}} {{nom}}', { prenom: 'Ada', nom: 'Lovelace' })).toBe(
			'Bonjour Ada Lovelace'
		);
	});
	it('tolère les espaces dans les accolades', () => {
		expect(renderMailTemplate('{{ prenom }}', { prenom: 'Ada' })).toBe('Ada');
	});
	it('laisse intacte une variable inconnue', () => {
		expect(renderMailTemplate('{{inconnue}}', {})).toBe('{{inconnue}}');
	});
	it('vide une variable connue sans valeur', () => {
		expect(renderMailTemplate('[{{entreprise}}]', { entreprise: null })).toBe('[]');
	});
	it('rend les variables de lien en ancre cliquable', () => {
		expect(renderMailTemplate('{{lien}}', { lien: 'https://x.fr/f/abc' })).toBe(
			'<a href="https://x.fr/f/abc">https://x.fr/f/abc</a>'
		);
	});
	it('échappe le HTML des valeurs substituées', () => {
		expect(renderMailTemplate('{{nom}}', { nom: '<script>x</script>' })).toBe(
			'&lt;script&gt;x&lt;/script&gt;'
		);
	});
});

describe('templateToHtml', () => {
	it('transforme les paragraphes et les sauts de ligne', () => {
		expect(templateToHtml('Bonjour,\nAda\n\nÀ bientôt')).toBe('<p>Bonjour,<br>Ada</p>\n<p>À bientôt</p>');
	});
	it('laisse intact un modèle déjà balisé', () => {
		expect(templateToHtml('<p>Déjà en HTML</p>')).toBe('<p>Déjà en HTML</p>');
	});
});

describe('renderMailBody', () => {
	it('met en forme puis substitue', () => {
		const body = renderMailBody('Bonjour {{prenom}},\n\nVoici votre lien : {{lien}}', {
			prenom: 'Ada',
			lien: 'https://x.fr/f/abc'
		});
		expect(body).toBe(
			'<p>Bonjour Ada,</p>\n<p>Voici votre lien : <a href="https://x.fr/f/abc">https://x.fr/f/abc</a></p>'
		);
	});
	it('ne réinterprète pas le balisage venu des valeurs', () => {
		expect(renderMailBody('{{nom}}', { nom: '<b>x</b>' })).toBe('<p>&lt;b&gt;x&lt;/b&gt;</p>');
	});
});

describe('splitFullName', () => {
	it('sépare prénom et nom', () => {
		expect(splitFullName('Ada Lovelace')).toEqual({ prenom: 'Ada', nom: 'Lovelace' });
	});
	it('rattache un nom composé au nom', () => {
		expect(splitFullName('  Jean  Pierre de La Tour ')).toEqual({
			prenom: 'Jean',
			nom: 'Pierre de La Tour'
		});
	});
	it('accepte un prénom seul', () => {
		expect(splitFullName('Ada')).toEqual({ prenom: 'Ada', nom: '' });
	});
	it('tolère une valeur absente', () => {
		expect(splitFullName(null)).toEqual({ prenom: '', nom: '' });
		expect(splitFullName('   ')).toEqual({ prenom: '', nom: '' });
	});
});

describe('variables CRE', () => {
	it('substitue le prénom et le nom du CRE', () => {
		expect(
			renderMailTemplate('{{prenom_cre}} {{nom_cre}}', { prenom_cre: 'Ada', nom_cre: 'Lovelace' })
		).toBe('Ada Lovelace');
	});
	it('vide les variables CRE quand la passation n’a plus de commercial', () => {
		expect(renderMailTemplate('[{{prenom_cre}}]', { prenom_cre: '' })).toBe('[]');
	});
});

describe('escapeHtml / MAIL_VARIABLE_KEYS', () => {
	it('échappe les caractères sensibles', () => {
		expect(escapeHtml('a & b < c > "d"')).toBe('a &amp; b &lt; c &gt; &quot;d&quot;');
	});
	it('expose les clés documentées', () => {
		expect(MAIL_VARIABLE_KEYS.has('lien')).toBe(true);
		expect(MAIL_VARIABLE_KEYS.has('nimportequoi')).toBe(false);
	});
});
