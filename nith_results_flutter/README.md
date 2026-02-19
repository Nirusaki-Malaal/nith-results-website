# NITH Results Flutter App

A responsive Flutter client that mirrors the UI intent of the existing NITH results website and consumes the **same Flask backend** (`/documents`).

## Features

- Material 3 styling inspired by the website's visual language.
- Responsive grid layout for mobile, tablet, and desktop.
- Search by name/roll number.
- Branch filter chips.
- Bottom-sheet details with semester/subject level data.
- Pull-to-refresh support.

## Backend compatibility

This app expects the existing Flask backend from this repository to run and expose:

- `GET /documents`

Default backend URL is:

- `http://localhost:8001`

You can override with Dart define:

```bash
flutter run --dart-define=API_BASE_URL=http://<your-ip>:8001
```

## Run

```bash
cd nith_results_flutter
flutter pub get
flutter run
```

## Optional: move to a separate repository

If you want this Flutter app in a separate GitHub repository:

```bash
cd nith_results_flutter
git init
git add .
git commit -m "Initial Flutter app for NITH results"
git remote add origin <new-repo-url>
git push -u origin main
```
