<p align="center">
  <img src="assets/logo.svg" alt="NITH-Results Logo" width="540">
</p>

# nith-results-website

Modernized student result portal and academic performance explorer for National Institute of Technology Hamirpur (NITH).

## Architecture

* **Frontend**: React and TypeScript application featuring responsive grade cards, SGPA/CGPA calculations, and batch-wise search filters.
* **Backend Pipeline**: Express and Node.js parser transforming raw institutional portal responses into structured JSON payloads.
* **Deployment**: Configured for Vercel serverless functions with optimized edge routing (`vercel.json`).

## Project Layout

* `frontend/`: Single-page application interface and component state.
* `backend/`: Server application and API controllers.
* `api/`: Serverless endpoint handlers for edge deployment.
* `test/`: Verification and parser test suites.

## Prerequisites

* Node.js 18+
* npm or pnpm

## Setup and Development

### Install Dependencies

```bash
cd frontend && npm install
cd ../backend && npm install
```

### Run Locally

Run the backend server:

```bash
cd backend
npm run dev
```

In a separate terminal, start the Vite development server:

```bash
cd frontend
npm run dev
```

### Build

```bash
cd frontend
npm run build
```

## License

GPL-3.0-or-later. See LICENSE for details.
