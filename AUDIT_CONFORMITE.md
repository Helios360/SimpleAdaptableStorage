# Audit MentorGoal / CloudStudent — Conformité Features

> **Cible auditée :** `SimpleAdaptableStorage` — application **CloudStudent v2**, SvelteKit (Svelte 5 runes) + Bun + PostgreSQL (Drizzle ORM) + better-auth, conteneurisée Docker.
> **Date :** 2026-06-02 · **Branche :** `develop-final`

---

## ⚠️ Constat préalable — divergence cahier des charges / implémentation

Le cahier des charges audité décrit le **mockup React initial** (`mentorgoal_v2.jsx`). L'application livrée a **délibérément divergé** vers un autre produit. Beaucoup d'items notés ❌ ne sont **pas des défauts** mais des **choix produit** :

| Spec attendue | Réalité implémentée |
|---|---|
| Intégration **Claude API** (tests générés, suggestions CV) | **Aucune IA branchée.** Clé `OPENAI_API_KEY` présente dans `.env` mais **jamais utilisée**. Tests = maquette statique. |
| Tables `sends`, `send_students`, `events` + envoi groupé / événements / reporting | **Inexistantes.** Pages CRE `envoi`, `tests`, `fiches` = maquettes UI (toasts simulés, données en dur). |
| CVs multi-versions **textuels** (name/tag/content/active) | CVs = **uploads de fichiers PDF** (name/path/size/mime), pas de tag/contenu/activation. |
| Routes REST `/api/cvs`, `/api/jobs`, `/api/applications`… | Architecture **form actions SvelteKit** + `+page.server.ts` (pas de couche REST `/api/*` métier). |
| Certification **Tosa** | **Supprimée** (migration `0003_icy_vengeance.sql`) — conforme à la demande. |
| 2 CRE / 2 écoles, 2 recruteurs / 2 entreprises | Seed = **1 CRE, 1 recruteur**, 5 candidats. |

➡️ **Le score de conformité ci-dessous est donc à lire comme un écart au mockup, pas comme une mesure de qualité du produit.**

---

## Résumé

- **Total features auditées :** ~146
- ✅ **Présentes :** 53
- ⚠️ **Partielles :** 29
- ❌ **Absentes :** 64
- **Score de conformité :** ~36 % (présentes strictes) · ~46 % (en pondérant les partielles à 0,5)

| Section | ✅ | ⚠️ | ❌ |
|---|---|---|---|
| 🐳 Infrastructure Docker | 6 | 0 | 4 |
| 🗄️ Schéma BDD | 2 | 4 | 4 |
| 🗄️ Migrations & seed | 3 | 1 | 0 |
| 🔐 Authentification | 8 | 0 | 0 |
| 👤 Candidat — Dashboard | 1 | 1 | 2 |
| 👤 Candidat — CVs | 3 | 1 | 7 |
| 👤 Candidat — Vidéo | 0 | 2 | 2 |
| 👤 Candidat — Tests IA | 2 | 3 | 6 |
| 👤 Candidat — Offres | 1 | 2 | 2 |
| 👤 Candidat — Candidatures | 2 | 1 | 1 |
| 👤 Candidat — Ressources | 0 | 0 | 3 |
| 🏫 CRE — Dashboard | 1 | 1 | 1 |
| 🏫 CRE — Étudiants | 1 | 3 | 0 |
| 🏫 CRE — CVthèque | 3 | 4 | 0 |
| 🏫 CRE — Tests IA | 0 | 2 | 4 |
| 🏫 CRE — Envoi groupé | 0 | 1 | 4 |
| 🏫 CRE — Fiches de poste | 0 | 1 | 5 |
| 🏫 CRE — Événements | 0 | 0 | 2 |
| 🏫 CRE — Reporting | 0 | 0 | 3 |
| 🔍 Recruteur — CVthèque | 3 | 1 | 1 |
| 🔍 Recruteur — Offres | 1 | 0 | 1 |
| 🔍 Recruteur — Profil | 0 | 0 | 1 |
| 🤖 Intégration IA | 0 | 0 | 9 |
| 🎨 UI / UX | 9 | 0 | 1 |
| ⚙️ Configuration projet | 7 | 1 | 1 |

---

## Détail par section

### 🐳 Infrastructure Docker

| Feature | Statut | Fichier | Note |
|---|---|---|---|
| `docker-compose.yml` présent | ✅ | `docker-compose.yml` | — |
| Service `app` (SvelteKit/Bun) | ✅ | `docker-compose.yml:3` | `build: .` |
| Service `db` PostgreSQL + env | ❌ | `docker-compose.yml` | **Aucun service `db`.** Réseaux `external: true` (`dbnet`) → Postgres géré hors-compose. Choix infra délibéré, mais `.env.example` documente `POSTGRES_*` « used by docker-compose » → incohérence. |
| Volume persistant Postgres | ❌ | — | Pas de service db donc pas de volume |
| Healthcheck sur `db` | ❌ | — | Absent |
| `depends_on: service_healthy` | ❌ | — | Absent |
| Port mapping app `3000:3000` | ✅ | `docker-compose.yml:9` | — |
| `Dockerfile` runtime Bun | ✅ | `Dockerfile:1,10` | `oven/bun:1.3` multi-stage |
| `.env.example` présent | ✅ | `.env.example` | 23 variables |
| `.dockerignore` présent | ✅ | `.dockerignore` | — |

### 🗄️ Schéma BDD (`src/lib/server/db/schema.ts`)

| Feature | Statut | Note |
|---|---|---|
| Table `users` (role/name/school/company/email…) | ⚠️ | `user` OK, mais **pas de `password_hash`** (géré par `account.password` via better-auth), pas de `formation`/`has_video` sur user |
| Table `cvs` (name/tag/content/active) | ⚠️ | `cv` existe mais modèle **fichier** : `candidatId, name, path, size, mime`. Pas de `tag/content/active` |
| Table `jobs` (level/sector/desc/skills/cre_id/active) | ⚠️ | `offre` = `titre, entreprise, lieu, type, date` uniquement. Champs riches absents |
| Table `applications` (cv_id, cre_validated) | ⚠️ | `candidature` = `candidatId, offreId, statut`. Pas de `cv_id` ni `cre_validated` |
| Table `tests` (user_id/job_id/status/score…) | ❌ | `test` = banque de questions (`question, answer, type, difficulty`) + `test_attempt`. Modèle différent |
| Table `sends` | ❌ | Inexistante |
| Table `send_students` | ❌ | Inexistante |
| Table `events` | ❌ | Inexistante |
| FK `ON DELETE CASCADE` | ✅ | Présentes (`user`, `candidat`, `cv`, `candidature`, `retenu`…) |
| Index colonnes filtrées | ✅ | `candidat_city_idx`, `candidat_statut_idx`, `candidat_recherche_statut_idx`, `candidat_formation_idx`, `test_attempt_*` |

> Tables réellement présentes : `user, session, account, verification, formation, candidat, staff_formation, cv, offre, candidature, retenu, test, test_attempt`.

### 🗄️ Migrations & seed

| Feature | Statut | Fichier | Note |
|---|---|---|---|
| Dossier migrations (Drizzle) | ✅ | `src/lib/server/db/migrations/` | 4 migrations |
| Migration initiale (toutes tables) | ✅ | `0000_even_spacker_dave.sql` | + `0001` (cv files), `0002` (pitch_path), `0003` (drop tosa) |
| Script seed avec données démo | ⚠️ | `src/lib/server/db/seed.ts` | 5 candidats, **1 CRE** (≠2), **1 recruteur** (≠2), 7 formations, 3 offres, 2 candidatures. Pas de sends/events |
| Mots de passe démo hashés | ✅ | `seed.ts` | Via `auth.api.signUpEmail()` (better-auth) |

### 🔐 Authentification

| Feature | Statut | Fichier | Note |
|---|---|---|---|
| Login email + password | ✅ | `login/[role]/+page.server.ts:52`, better-auth `signInEmail` | — |
| Logout (invalide session) | ✅ | `logout/+page.server.ts` | `auth.api.signOut()` |
| `GET` user courant | ✅ | `hooks.server.ts:10`, `/api/auth/get-session` | `event.locals.user` |
| Middleware protection routes | ✅ | `hooks.server.ts` + `requireRole()` dans `+layout.server.ts` de chaque espace | |
| Redirection si non authentifié | ✅ | `guards.ts:14` | Redirige vers `/` (sélecteur de rôle), pas `/login` |
| Redirection selon rôle | ✅ | `login/[role]/+page.server.ts:75`, `+page.server.ts:4` | |
| Gestion erreurs 401 | ✅ | `login/[role]/+page.server.ts:70,73` | `fail(401, {error})` |
| Comptes démo documentés | ✅ | `login/[role]/+page.server.ts:8`, `README.md`, page d'accueil | mot de passe `demo` |

### 👤 Espace Candidat

**Dashboard** (`candidat/+page.*`)
| Feature | Statut | Note |
|---|---|---|
| Stats (candidatures/entretiens/score/tests attente) | ⚠️ | Affiche score IA, nb CVs, statut dossier. **Pas** de compteur candidatures/entretiens |
| Alerte tests en attente + lien | ✅ | `+page.svelte:68-81` + badge layout |
| Liste résultats tests récents | ❌ | Absent (un seul score global) |
| Liste prochains événements | ❌ | Absent |

**CVs** (`candidat/files/+page.*`)
| Feature | Statut | Note |
|---|---|---|
| Lister les CVs de l'utilisateur | ⚠️ | Via `load`, pas `GET /api/cvs` |
| Créer un CV | ✅ | action `cvAdd` (upload PDF) |
| Éditer un CV | ❌ | Pas d'édition |
| Supprimer un CV | ✅ | action `cvRemove` |
| Activer un CV (un seul actif) | ❌ | Concept `active` inexistant |
| UI grille + form + confirm suppression | ✅ | `files/+page.svelte` |
| Tags Alternance/Stage/CDI… | ❌ | Absent |
| Indicateur visuel "Actif" | ❌ | Absent |
| Suggestions IA Claude | ❌ | Absent |
| Affichage impact (fort/moyen) | ❌ | Absent |
| Fallback API | ❌ | Absent |

**Vidéo de présentation** (`candidat/files`)
| Feature | Statut | Note |
|---|---|---|
| Mise à jour vidéo (`has_video`) | ⚠️ | action `pitchUpload` → `pitchPath` + flag `pitch` (pas `has_video`) |
| UI enregistrer / importer / aperçu | ⚠️ | Import + aperçu OK ; **pas d'enregistrement webcam** |
| Badge "Visible par CRE et recruteurs" | ❌ | Non affiché explicitement |
| 5 conseils de tournage | ❌ | Une seule phrase ("60–90 s") |

**Tests IA** (`candidat/tests/+page.*`)
| Feature | Statut | Note |
|---|---|---|
| Lister tests utilisateur | ❌ | Pas de liste pending/done ; un seul score sur `candidat` |
| Soumettre réponses + score | ⚠️ | action `submit` enregistre un score 0-100 |
| Génération questions Claude API | ❌ | **3 questions React en dur** (`tests/+page.svelte:24`) |
| Questions à 4 options | ✅ | `tests/+page.svelte:24-36` |
| Compteur progression X/5 | ✅ | Affiche X/3 |
| Calcul du score | ⚠️ | **Score aléatoire** `Math.random()*20+72` (`tests/+page.svelte:52`) |
| Message différencié (≥80/≥60/<60) | ⚠️ | `scoreColor()` colorise, message peu différencié |
| Bouton "Abandonner" | ❌ | Absent |
| Loader génération IA | ❌ | Absent |
| Fallback questions statiques | ❌ | (tout est statique, pas un vrai fallback) |

**Offres** (`candidat/offres/+page.*`)
| Feature | Statut | Note |
|---|---|---|
| Lister offres actives | ⚠️ | Charge toutes les `offre` (pas de colonne `active`) |
| Recherche + filtre type | ⚠️ | Recherche titre/entreprise/lieu OK (débounce). Filtre type partiel |
| Postuler anti-doublon (409) | ✅ | action `apply` (`offres/+page.server.ts:41`) |
| Sélection auto CV actif | ❌ | Pas de lien CV ↔ candidature |
| Modale détail offre | ❌ | Absent |

**Candidatures** (`candidat/offres` onglet)
| Feature | Statut | Note |
|---|---|---|
| Liste avec JOIN jobs | ✅ | `offres/+page.server.ts` |
| Changement statut inline | ❌ | Lecture seule côté candidat |
| Statuts complets (6) | ⚠️ | Seulement `envoyee/entretien/refusee` |
| Badge coloré | ✅ | `candidatureLabel()` |

**Ressources & coaching** — ❌ Route inexistante (`candidat/ressources` absent).

### 🏫 Espace CRE

**Dashboard** (`cre/+page.*`)
| Feature | Statut | Note |
|---|---|---|
| Stats (étudiants/à valider/envois) | ⚠️ | À valider/validés/refusés/tests OK + BarChart. **Envois absents** |
| Liste étudiants récents + score | ✅ | `+page.svelte:52-71` |
| Suivi des envois | ❌ | Absent |

**Étudiants** (`cre/etudiants/*`) — **point fort de l'app**
| Feature | Statut | Note |
|---|---|---|
| Liste étudiants de l'école (JOIN) | ✅ | `searchCandidats()` + `staffFormation` |
| Enrichissement (CVs/apps/score) | ⚠️ | Score affiché ; recherche très riche (filtres âge/géoloc/tags/skills/mobilité), mais pas de comptes CVs/candidatures par ligne |
| Valider/Refuser dossier | ⚠️ | actions `setStatut` ; **ne bloque pas** si aucun test, et ne met **pas** à jour la candidature → `envoyée`/`refusé` |
| UI badges + boutons + message erreur | ⚠️ | Boutons conditionnels OK, pas de message bloquant "aucun test" |

**CVthèque** (`cre/cvtheque/*`)
| Feature | Statut | Note |
|---|---|---|
| Filtres dynamiques serveur | ⚠️ | Charge `listCandidats()`, filtrage client (recherche seulement) |
| Filtres recherche/score/formation | ⚠️ | Recherche nom/formation uniquement |
| Sélection multiple + tout sélectionner | ✅ | `Set<number>` |
| Compteur étudiants filtrés | ✅ | — |
| Badges (CVs/score/vidéo) | ⚠️ | Score + 🎥 ; pas de badge nb CVs |
| Modale profil + liste CVs | ✅ | `CandidatDetail` |
| Bouton envoi groupé ≥1 + lien présélectionné | ⚠️ | Bouton → toast simulé, pas de lien `/cre/envoi` avec état |

**Tests IA** (`cre/tests/+page.svelte`) — maquette UI sans backend
| Feature | Statut | Note |
|---|---|---|
| `POST /api/tests/assign` anti-doublon | ❌ | Absent |
| `GET /api/tests?school` | ❌ | Absent |
| Prévisualisation Claude API | ❌ | 3 questions fictives, toast simulé |
| UI sélection poste/types/étudiants/preview/assign | ⚠️ | Poste + types + preview en mock ; **pas** de sélection étudiants, **pas** d'assignation réelle |
| Loader génération | ⚠️ | `setTimeout(900ms)` simulé |
| Liste tests assignés | ❌ | Absent |

**Envoi groupé** (`cre/envoi/+page.svelte`) — maquette UI
| Feature | Statut | Note |
|---|---|---|
| `POST /api/sends` + `send_students` | ❌ | Absent |
| `GET /api/sends?school` | ❌ | Données en dur |
| `POST .../open` incrément | ❌ | Absent |
| Validation serveur | ❌ | Absent |
| UI formulaire/liste/simulation/relancer | ⚠️ | Liste en dur + toasts simulés, **pas de formulaire** |

**Fiches de poste** (`cre/fiches/*`) — minimal
| Feature | Statut | Note |
|---|---|---|
| `POST /api/jobs` (school + cre_id) | ❌ | Bouton → toast "à venir" |
| `PUT` update | ❌ | Absent |
| Toggle `active` | ❌ | Absent (offre n'a pas de `active`) |
| `POST .../propose` | ❌ | Toast simulé |
| Compétences → array | ❌ | Absent |
| UI liste/form/toggle/modale | ⚠️ | Liste des offres OK, reste en mock |

**Événements** — ❌ Route `cre/events` inexistante.
**Reporting** — ❌ Route `cre/reporting` inexistante (BarChart existe mais sur le dashboard).

### 🔍 Espace Recruteur

**CVthèque** (`recruteur/+page.*`)
| Feature | Statut | Note |
|---|---|---|
| Tous candidats (toutes écoles) | ✅ | `listValidatedCandidats()` |
| Filtres recherche/score | ❌ | Aucun filtre |
| Retenir candidat (sélection) | ✅ | action `toggle` → table `retenu` (persistée) |
| Compteur retenus header | ✅ | `+layout.svelte:18`, `retenuIds.length` |
| Badges (CVs/score/vidéo) | ⚠️ | Score + 🎥 ; pas de nb CVs |
| Modale profil complet | ✅ | `CandidatDetail` |

**Mes offres** (`recruteur/offres/*`)
| Feature | Statut | Note |
|---|---|---|
| Offres filtrées par entreprise | ❌ | `db.select().from(offre)` sans `where` sur l'entreprise du recruteur |
| Carte CTA publier | ✅ | toast "à venir" |

**Profil entreprise** — ❌ Route `recruteur/profil` inexistante.

### 🤖 Intégration IA (Claude API)

| Feature | Statut | Note |
|---|---|---|
| Clé en env, jamais exposée client | ❌ | `OPENAI_API_KEY` dans `.env` (pas `ANTHROPIC`), **non utilisée** |
| Appels IA uniquement `+server.ts` | ❌ | Aucun appel IA |
| `POST /api/ai/generate-test` | ❌ | Absent |
| `POST /api/ai/cv-suggestions` | ❌ | Absent |
| Modèle `claude-sonnet-4`, `max_tokens:1500` | ❌ | Absent |
| try/catch + fallback | ❌ | Absent |
| Strip ```` ```json ```` | ❌ | Absent |
| Prompt génération tests | ❌ | Absent |
| Prompt suggestions CV | ❌ | Absent |

### 🎨 UI / UX

| Feature | Statut | Fichier | Note |
|---|---|---|---|
| Layout sidebar + slot | ✅ | `AppShell.svelte`, `Sidebar.svelte` | — |
| Highlight route active | ✅ | `Sidebar.svelte:29` | `$page.url.pathname` |
| Couleurs par rôle | ✅ | `Sidebar.svelte:23`, `app.css` | bleu/cyan/violet |
| Toast store 3.5s + ok/err/warn | ✅ | `toast.svelte.ts:11`, `Toasts.svelte` | success/error/info |
| Modal backdrop + Escape | ✅ | `Modal.svelte:14-19` | — |
| Composant `Loader` | ❌ | — | **Absent** (pas de `Loader.svelte`) |
| Composant `Empty` | ✅ | `Empty.svelte` | — |
| Validation client | ✅ | forms login/register | required + email |
| `use:enhance` sur forms | ✅ | login, register, Sidebar | — |
| Boutons disabled pendant submit | ✅ | `Button.svelte`, `login/+page.svelte:95` | — |
| Polices Syne + DM Sans | ✅ | `app.html:10`, `app.css:27` | Google Fonts |
| Scrollbar custom | ✅ | `app.css:108` | — |

### ⚙️ Configuration projet

| Feature | Statut | Note |
|---|---|---|
| `package.json` + Bun | ✅ | `bun.lock` présent |
| `bun.lockb` | ✅ | `bun.lock` (nouveau format texte) |
| `bunfig.toml` | ❌ | Absent (optionnel) |
| `bun run dev` | ✅ | `vite dev` |
| `bun run build` | ✅ | `vite build` |
| `bun run migrate` | ✅ | `db:migrate` |
| `bun run seed` | ✅ | `db:seed` |
| Env `DATABASE_URL/AUTH_SECRET/NODE_ENV` | ⚠️ | OK sauf `ANTHROPIC_API_KEY` (clé OpenAI présente à la place) |
| `README.md` instructions + démos | ✅ | quickstart + 7 comptes |

---

## Corrections recommandées (par priorité)

Les corrections sont classées par effort/risque. **Les "Lot C" reconstruisent des features produit absentes** — à n'appliquer que si le périmètre produit le réclame réellement.

### Lot A — Sûres, alignées, faible risque
1. **`Loader.svelte` manquant** — créer le composant pour cohérence UI.
2. **Incohérence `docker-compose` ↔ `.env.example`** — soit ajouter un service `db` Postgres (volume + healthcheck + `depends_on`), soit retirer les `POSTGRES_*` "used by docker-compose" du `.env.example` pour refléter l'infra externe réelle.
3. **Dashboard candidat** — ajouter compteurs candidatures / entretiens (données déjà disponibles via `candidature`).

### Lot B — Compléments alignés, effort moyen
4. **Validation dossier CRE** (`setStatut`) — bloquer si aucun `score`/test et propager le statut sur `candidature` (→ `envoyee`/`refusee`).
5. **CVthèque (CRE + recruteur)** — déporter les filtres score/formation côté serveur (`searchCandidats` existe déjà), brancher l'envoi groupé sur un état réel.
6. **Offres recruteur** — filtrer par entreprise du recruteur connecté.

### Lot C — Reconstruction de features produit absentes (à valider)
7. Intégration IA (tests générés + suggestions CV) — **avec OpenAI** (clé déjà configurée) ou Anthropic selon décision.
8. Tables + pages `sends`/`send_students`/`events`, reporting, fiches de poste CRUD.
9. CVs multi-versions avec tags/activation (refonte du modèle fichier actuel).

> ⚠️ Le Lot C modifie le périmètre produit (schéma BDD, nouvelles tables, intégration externe payante). Il n'a **pas** été appliqué automatiquement — voir la question posée en fin d'audit.
