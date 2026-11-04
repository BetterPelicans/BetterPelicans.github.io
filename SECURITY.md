# Security Policy

## Scope

This repository contains a static public website, documentation, and selected
SVG assets. The threat model is modest, but we take it seriously:

- SVGs are data and are validated before publication (no scripts, event
  handlers, external fetches, or embedded rasters).
- No credentials, API keys, or personal information are ever committed here.
- The private laboratory repository is the only place raw model output and
  internal records live.

## Reporting a vulnerability

Do **not** open a public issue for security problems. Report privately by
email (see the project site for the current contact address). Include:

- repository and file/commit if known;
- a description of the issue and why it matters;
- a minimal reproduction if possible.

We will acknowledge reports and coordinate a fix before public disclosure.

## Supported versions

Only the current `main` branch is supported.

## Secret handling

- `.env` files and credentials are forbidden in this repository (see
  `.gitignore`).
- Secret scanning is enabled on the repository; push protection blocks known
  secret patterns.
- A secret scan runs before every public deployment.
