# sas-app

SvelteKit rewrite of the old `SimplePeopleStoring-app`.

## Dev database (MySQL)

A basic MySQL container is provided:

```sh
docker compose -f compose.yaml up -d
```

The schema/seeds are loaded from `../db/init`.

## Environment variables

The app expects:

- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`
- `JWT_SECRET`

If you use `compose.yaml`, a typical local setup is:

- `MYSQL_HOST=127.0.0.1`
- `MYSQL_USER=root`
- `MYSQL_PASSWORD=mysecretpassword`
- `MYSQL_DATABASE=main`

`drizzle-kit` uses `DATABASE_URL` (example: `mysql://root:mysecretpassword@127.0.0.1:3307/main`).

## Developing

```sh
npm install
npm run dev
```
