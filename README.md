# NITH Results Website

![Project Status](https://img.shields.io/badge/status-active-success)
![License](https://img.shields.io/badge/license-MIT-blue)
![Deployment](https://img.shields.io/badge/deployment-Vercel-black?logo=vercel)

A modern, user-friendly web interface for searching and viewing academic results for students of **National Institute of Technology, Hamirpur (NITH)**.

**Live Demo:** [WEBSITE](https://result-nith-black.vercel.app/)

## 📖 Table of Contents
- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## 🧐 About the Project

The **NITH Results Website** simplifies the process of checking academic results. Instead of navigating through complex legacy portals, students can quickly search for their results using their Roll Number. The application is designed to be fast, responsive, and easy to use on both desktop and mobile devices.

## ✨ Features

- **Instant Search:** Quickly retrieve results by entering a valid Roll Number.
- **Responsive Design:** Optimized for mobile phones, tablets, and desktops.
- **Clean UI/UX:** A minimal and distraction-free interface.
- **Result Breakdown:** Displays detailed semester-wise grades, SGPA, and CGPA (if applicable).
- **Fast Performance:** Deployed on Vercel for rapid load times.

## 🛠 Tech Stack

The project is built using modern web technologies:

- **Frontend:** HTML , Javascript (Assumed based on Vercel deployment)
- **Backend** Flask
- **Styling:** CSS / Tailwind CSS
- **Deployment:** [Vercel](https://vercel.com/)
- **Version Control:** Git & GitHub

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine for development and testing purposes.

### Prerequisites

Make sure you have the following installed:
* **pip3** (v14 or higher)
* **python3**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Nirusaki-Malaal/nith-results-website.git
   cd nith-results-website
   pip3 install -r requirements.txt
   cp .env.example .env
   # then set your real MongoDB URI and allowed origin(s) in .env
   python3 app.py
   ```

### Required Environment Variables

- `MONGODB_URI`: MongoDB connection string. Do not hardcode this in source files.
- `MONGODB_DB_NAME`: Database name. Defaults to `results`.
- `MONGODB_COLLECTION`: Collection name. Defaults to `all`.
- `ALLOWED_ORIGINS`: Comma-separated list of trusted frontend origins allowed to call the API cross-origin. Leave unset to allow same-origin requests only.

## 🔐 Security Notes

- The API now serves paginated summaries instead of exposing the full result dump in one request.
- Student detail records are fetched on demand and the public response omits extra personal fields such as father's name.
- Rate limiting, CSP, clickjacking protection, no-store API caching, and stricter CORS controls are enabled in the Flask app.
- If a MongoDB URI was ever committed previously, rotate that credential in MongoDB Atlas and replace it with a new secret.


## 📱 Flutter Client (new)

A new Flutter app is now available in `nith_results_flutter/` and can use the same Flask backend student endpoints (`/api/students`) or the compatibility alias (`/documents`).
See `nith_results_flutter/README.md` for setup and run instructions.
