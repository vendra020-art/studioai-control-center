# StudioAI Control Center

StudioAI is a portfolio-grade enterprise AI operations workspace for employees, platform administrators, and operations analysts. It combines analytics, chat, model governance, trace investigation, and configuration-driven theming in one responsive experience.

## Included in this MVP

- Executive operations dashboard with cost, latency, quality, usage, health, and trace data
- AI chat workspace with attachments, source metadata, feedback, and streaming simulation
- Model catalog with health, capability, usage, and configuration workflows
- Trace explorer with filtering, status, evaluation data, and an execution timeline
- Configuration center with color mode, branding, feature flags, and JSON preview
- Responsive navigation and layouts for desktop, tablet, and mobile
- Accessibility foundations: skip navigation, focus indicators, live response regions, semantic structure, and reduced-motion support

## Run locally

```powershell
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Production check

```powershell
pnpm build
```

## Architecture

The first release intentionally uses realistic local data and UI simulations so the design-system, responsive, accessibility, and enterprise workflow evidence can be evaluated without cloud credentials. The next implementation stage can add FastAPI endpoints, TanStack Query, Mock Service Worker, Storybook, automated accessibility tests, and an AWS deployment.
