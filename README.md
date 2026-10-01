# Dataset Request Desk — Web

Next.js frontend for the Dataset Request Desk.

The API, database, seed users, tests and the `docker-compose.yml` that runs the whole system live in
**[dataset-request-desk-api](https://github.com/Nkusibeni23/dataset-request-desk-api)**. Start there:
its README covers one-command startup and the seed login credentials.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.

## Run locally

Requirements: Node.js 24+ and the API running on http://localhost:8000
(see the API repository).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Base URL of the API. Inlined into the browser bundle at **build** time. |

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build (`output: "standalone"`, used by the Dockerfile) |
| `npm run lint` | ESLint |

## Docker

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 -t dataset-request-desk-web .
docker run -p 3000:3000 dataset-request-desk-web
```
