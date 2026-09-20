# MediConnect System

## Repository Layout

- `server.js` is the Express API entrypoint.
- `routes/` contains API route modules; `controllers/` contains request handlers.
- `db/connection.js` owns the database connection.
- `mediconnect-frontend/` is the Next.js frontend.

## Development

- Backend: run `node server.js` from the repository root. The default API port is `5000`.
- Frontend: run `npm run dev` from `mediconnect-frontend/`. The default web port is `3000`.
- Frontend checks: run `npm run lint` and `npm run build` from `mediconnect-frontend/`.
- The backend has no configured automated test suite; the root `npm test` script is a placeholder that exits with an error.

## API Contract

- API endpoints are mounted under `/api/*` in `server.js`.
- The backend currently allows browser requests from `http://localhost:3000`.
- Environment configuration is loaded through `dotenv`; do not commit secrets or local environment files.

## Frontend Rules

- The frontend uses the Next.js App Router, React, TypeScript, and Tailwind CSS.
- Before changing frontend code, read `mediconnect-frontend/AGENTS.md` and the relevant installed Next.js documentation under `mediconnect-frontend/node_modules/next/dist/docs/`.
- Follow existing route and component patterns; keep frontend changes scoped to the affected app route or shared component.

## Change Hygiene

- Preserve existing user changes in the working tree.
- Prefer focused edits and validate touched frontend code with lint or build when available.
- Do not commit changes unless explicitly requested.
