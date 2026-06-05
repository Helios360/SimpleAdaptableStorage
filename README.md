# CloudStudent

Plateforme de qualification et placement en alternance. Trois rôles — **Candidat**, **CRE / École**, **Recruteur** — chacun avec son tableau de bord et ses outils.

## Stack

- **SvelteKit** (Svelte 5 runes) + **Bun**
- **PostgreSQL** + **Drizzle ORM**
- **better-auth** (email/password)
- Pas de Tailwind ni d'UI lib : CSS scoped + design tokens en variables CSS

## Quickstart

Prérequis : Docker, Bun.

```bash
cp .env.example .env
# (édite BETTER_AUTH_SECRET pour de la prod)

docker compose up -d postgres
bun install
bun run db:migrate
bun run db:seed
bun run dev
```

L'app tourne sur [http://localhost:3000](http://localhost:3000).

Pour tout déployer derrière Docker :

```bash
docker compose up --build
```

## Comptes de démo

Mot de passe : `demo` pour tous.

| Rôle      | Email                      |
| --------- | -------------------------- |
| Candidat  | `lea@student.fr`           |
| Candidat  | `thomas@student.fr`        |
| Candidat  | `sara@student.fr`          |
| Candidat  | `hugo@student.fr`          |
| Candidat  | `ines@student.fr`          |
| CRE       | `elodie@cloudstudent.fr`   |
| Recruteur | `marie@orange.fr`          |

La landing page propose un bouton "pré-remplir les identifiants démo" pour chaque rôle.

## Structure

```
src/
├── app.css                  # design tokens + reset global
├── hooks.server.ts          # better-auth handler + session → locals
├── lib/
│   ├── components/          # Button, Card, Modal, Sidebar, ...
│   ├── data/                # nav items, templates de messages
│   ├── server/
│   │   ├── auth.ts          # better-auth (lazy init)
│   │   ├── db/
│   │   │   ├── schema.ts    # tables Drizzle
│   │   │   ├── migrate.ts   # bun-script de migration
│   │   │   └── seed.ts      # comptes + données démo
│   │   ├── guards.ts        # requireRole(), loadCandidatForUser()
│   │   └── queries.ts       # jointures partagées CRE/Recruteur
│   ├── stores/              # toast + viewport (Svelte 5 .svelte.ts)
│   ├── tokens.ts            # mirror JS des tokens CSS
│   └── utils.ts
└── routes/
    ├── +page.svelte         # landing (choix du rôle)
    ├── login/[role]/        # login (avec démo 1-clic)
    ├── logout/              # action POST signOut
    ├── candidat/            # dashboard, cvs, pitch, tests, offres & candidatures
    ├── cre/                 # dashboard, étudiants, cvthèque, tests, envoi, messages, fiches
    └── recruteur/           # cvthèque, retenus, offres
```

Chaque layout de rôle gate l'accès via `requireRole()` — un mauvais rôle est redirigé vers son propre dashboard.

## Scripts

```bash
bun run dev          # serveur dev Vite
bun run build        # build production (SvelteKit + adapter-node)
bun run start        # lance le build (node ./build)
bun run check        # svelte-check + typecheck
bun run db:generate  # génère une nouvelle migration depuis schema.ts
bun run db:migrate   # applique les migrations
bun run db:push      # push direct du schema (dev)
bun run db:seed      # seed des comptes et données démo (idempotent)
bun run db:studio    # Drizzle Studio (UI web)
```

## Variables d'environnement

Voir `.env.example`. Les clés importantes :

- `DATABASE_URL` — connexion Postgres (lue par l'app et par drizzle-kit)
- `BETTER_AUTH_SECRET` — secret pour signer les sessions (32+ caractères en prod)
- `BETTER_AUTH_URL` — base URL utilisée par better-auth pour les callbacks
- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` — utilisés par `docker-compose.yml`

## Notes techniques

- **Initialisation paresseuse** de la DB et de better-auth (Proxy dans `src/lib/server/db/index.ts` et `auth.ts`) pour que le build n'exige pas de `DATABASE_URL` / `BETTER_AUTH_SECRET`.
- **Mutations** : majoritairement via SvelteKit form actions (`?/add`, `?/setStatut`, ...). Les confirmations modales utilisent un `fetch + invalidateAll()` pour rester compatibles avec le composant `Confirm`.
- **Min password** abaissé à 4 caractères dans la config better-auth, uniquement pour que le mot de passe `demo` fonctionne.
- **Auto-login** activé sur la création de compte (`autoSignIn: true`).
- Le test IA candidat est volontairement un mock à 3 questions (comme dans le prototype d'origine). Seul le score final est persisté.
