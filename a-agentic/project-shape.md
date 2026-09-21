# Project Shape & Architecture Boundaries

> **Description:** System architecture map, interaction flows across modules, external integrations (RabbitMQ, AssemblyAI, Gemini, SePay), and strict source code modification boundaries for the Interactive Video E-Learning System.

---

## 1. System Architecture Diagram (Mermaid)

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Next.js 16 App Router)"]
        WebPortal["Web Portal (Public Site & Auth)"]
        CourseView["Course & Lesson Catalog"]
        PlayerView["Interactive Video Player & In-video Quiz"]
        MarkmapViewer["AImindmap Viewer (Markmap)"]
        PaymentCheckout["SePay VietQR Checkout Modal"]
    end

    subgraph ApiGateway ["API Layer (NestJS 11 + Modular Architecture)"]
        AuthModule["Auth & Session Module"]
        CourseModule["Course & Lesson Module"]
        VideoModule["Video Processing Module"]
        PaymentModule["Payment & Webhook Module"]
    end

    subgraph QueueLayer ["Async Messaging & Worker Layer"]
        RabbitMQ["RabbitMQ Message Broker (Exchange: video.events)"]
        VideoWorker["Video & AI Pipeline Consumers"]
    end

    subgraph ExternalServices ["External Services & AI"]
        AssemblyAI["AssemblyAI (Speech-to-Text with Timestamps)"]
        GeminiAPI["Google Gemini API (Mindmap & Quiz Generator)"]
        SePayGateway["SePay Payment Gateway (VietQR Webhook)"]
    end

    subgraph DataPersistence ["Persistence & Storage Layer"]
        Mongo[(MongoDB - Courses, Lessons, Quizzes, Orders, Users)]
        Redis[(Redis - Caching, Session & Token Store)]
        Storage[(MinIO / S3 / Cloud Storage - Videos & Media)]
    end

    %% Client to API
    ClientLayer -->|REST API / JSON| ApiGateway

    %% API to Persistence
    ApiGateway -->|Domain Repositories| Mongo
    ApiGateway -->|Session & Cache| Redis

    %% Video Async Processing
    CourseModule -->|Upload Video| Storage
    CourseModule -->|Publish video.process event| RabbitMQ
    RabbitMQ -->|Consume Task| VideoWorker

    %% Worker to AI APIs
    VideoWorker -->|1. Transcribe Audio| AssemblyAI
    VideoWorker -->|2. Generate Mindmap & In-video Quiz| GeminiAPI
    VideoWorker -->|3. Persist AI Results & Mark READY| Mongo

    %% Payment Webhook
    SePayGateway -->|POST /api/v1/payments/webhook| PaymentModule
    PaymentModule -->|Transactional Activation (Enrollment)| Mongo
```

---

## 2. Directory Structure & Roles

| Directory Path | Role & Responsibilities | Technologies |
| :--- | :--- | :--- |
| `backend/` | REST API, RabbitMQ Producer/Consumer, AI Orchestration, Mongoose Repositories | NestJS 11, TypeScript, MongoDB, RabbitMQ, Redis |
| `frontend/` | UI/UX, Video Player with pause quizzes, Markmap visualization, VietQR checkout | Next.js 16 (App Router), React 19, Tailwind CSS, Markmap |
| `share-lib/` | Shared Contracts (DTOs, Enums: Role, OrderStatus, VideoStatus, Interfaces) | TypeScript (Compiled to `dist/`) |
| `a-agentic/` | AI Deep Context (Master Brief, Architecture, Feature Specs & Dev History) | Markdown |
| `docs/` | Comprehensive project roadmap, getting started guides, module plans | Markdown |

---

## 3. Code Modification Boundaries

### 🟢 SAFE EDIT ZONES (Standard AI Modification Scope)

- `backend/src/modules/**`:
  - `course/`: Controllers, Services, Domain Repositories, Schemas (`Course`, `Chapter`, `Lesson`).
  - `video-pipeline/`: RabbitMQ Producers, Consumers, AssemblyAI client, Gemini AI client.
  - `payment/`: SePay Webhook Controller, Services, Order/Transaction Repositories.
  - `auth/`, `user/`, `session/`: Existing authenticated identity modules.
  - `tests/**`: Unit test files (`*.spec.ts`) per module following the AAA Pattern.
- `frontend/src/features/**`:
  - `course/`: Course catalog, lesson management, chapter lists.
  - `player/`: Interactive video player, in-video quiz dialogs.
  - `mindmap/`: Markmap viewer component, zoom/pan controls.
  - `payment/`: Checkout dialog, QR code display, polling order status.
- `share-lib/src/**`: DTOs, Enums (`VideoStatus`, `OrderStatus`, `RoleEnum`), and shared models.
- `a-agentic/features/**`: `rules-and-flows.md`, `tech-spec.md`, `dev-history.md`.

### 🔴 STRICTLY RESTRICTED ZONES (Require Explicit Confirmation)

1. **Build & Generated Outputs (NEVER EDIT MANUALLY)**:
   - `dist/`, `build/`, `node_modules/`, `.next/`
2. **Lockfiles & Project Configs**:
   - `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`.
3. **Environment & Secrets**:
   - `.env`, `.env.production` (AssemblyAI API key, Gemini API key, SePay token/secret must never be committed).
