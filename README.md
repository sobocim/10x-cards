# 10xCards

<div align="center">

![10xCards Logo](public/favicon.png)

**AI-Powered Flashcard Generation for Accelerated Learning**

[![Node Version](https://img.shields.io/badge/node-22.14.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Astro](https://img.shields.io/badge/Astro-5-orange)](https://astro.build/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

---

## Project Description

**10xCards** is a modern web application that enables automatic generation of flashcards using artificial intelligence. The goal of the project is to significantly speed up and simplify the process of creating study materials, allowing users to quickly transform any text they input (via copy-paste) into high-quality flashcards for effective learning.

With 10xCards, users can:
- 📝 Paste any text content and generate flashcards automatically
- 🤖 Leverage AI to create intelligent, well-structured study materials
- ⚡ Save time by eliminating manual flashcard creation
- 🎯 Focus on learning rather than content preparation

---

## Tech Stack

This project is built with cutting-edge web technologies to ensure optimal performance, developer experience, and maintainability:

### Core Framework
- **[Astro](https://astro.build/)** v5.13.7 - Modern web framework for building fast, content-focused applications with partial hydration

### Frontend
- **[React](https://react.dev/)** v19.1.1 - UI library for building interactive components
- **[TypeScript](https://www.typescriptlang.org/)** v5 - Type-safe JavaScript with enhanced developer experience

### Styling
- **[Tailwind CSS](https://tailwindcss.com/)** v4.1.13 - Utility-first CSS framework for rapid UI development
- **[Shadcn/ui](https://ui.shadcn.com/)** - Re-usable component library built with Radix UI and Tailwind CSS

### UI Components & Libraries
- **[Radix UI](https://www.radix-ui.com/)** - Unstyled, accessible component primitives
- **[Lucide React](https://lucide.dev/)** - Beautiful & consistent icon library
- **[class-variance-authority](https://cva.style/docs)** - For building type-safe component variants

### Development Tools
- **[ESLint](https://eslint.org/)** v9.23.0 - Code linting and quality assurance
- **[Prettier](https://prettier.io/)** - Code formatting for consistency
- **[Husky](https://typicode.github.io/husky/)** v9.1.7 - Git hooks for pre-commit quality checks
- **[lint-staged](https://github.com/okonet/lint-staged)** v15.5.0 - Run linters on staged files

---

## Getting Started Locally

Follow these steps to set up the project on your local machine:

### Prerequisites

Ensure you have the following installed:
- **Node.js** v22.14.0 (specified in `.nvmrc`)
- **npm** (comes with Node.js)

> **Tip**: We recommend using [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) to manage Node.js versions.

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/sobocim/10x-cards.git
cd 10x-cards
```

2. **Use the correct Node.js version:**

```bash
nvm use
```

This will automatically switch to Node.js v22.14.0 as specified in `.nvmrc`.

3. **Install dependencies:**

```bash
npm install
```

4. **Set up environment variables:**

```bash
cp .env.example .env
```

Edit the `.env` file and add your configuration values.

5. **Start the development server:**

```bash
npm run dev
```

The application will be available at `http://localhost:3000/`.

6. **Build for production:**

```bash
npm run build
```

7. **Preview the production build:**

```bash
npm run preview
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Starts the development server with hot module replacement |
| `npm run build` | Builds the application for production deployment |
| `npm run preview` | Previews the production build locally |
| `npm run astro` | Runs Astro CLI commands directly |
| `npm run lint` | Runs ESLint to check for code quality issues |
| `npm run lint:fix` | Automatically fixes ESLint issues where possible |
| `npm run format` | Formats code using Prettier |

---

## Project Scope

### Current Features

The project is structured to support the following key areas:

#### Core Functionality
- **AI-Powered Flashcard Generation**: Transform text input into structured flashcards using artificial intelligence
- **Copy-Paste Interface**: Simple text input mechanism for quick content processing

#### Technical Architecture

```
./src
├── layouts/                 # Astro layout templates
├── pages/                   # Astro pages and routes
│   └── api/                # API endpoints for backend logic
├── middleware/             
│   └── index.ts            # Astro middleware for request handling
├── db/                     # Supabase clients and database types
├── types.ts                # Shared types for backend and frontend (Entities, DTOs)
├── components/             # UI components
│   └── ui/                # Shadcn/ui component library
├── lib/                    # Services and helper utilities
├── assets/                 # Internal static assets
└── styles/                 # Global styles
```

### Development Practices

The project adheres to modern development best practices:

- **Clean Code Principles**: Early returns, guard clauses, and minimal nesting
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Type Safety**: Full TypeScript coverage for enhanced reliability
- **Code Quality**: ESLint and Prettier for consistent, high-quality code
- **Git Hooks**: Pre-commit checks with Husky and lint-staged
- **Accessibility**: Following WCAG guidelines for inclusive design

---

## Project Status

🚧 **In Active Development**

This project is currently in active development. Features and APIs may change as the project evolves.

### Roadmap

- [ ] Core flashcard generation functionality
- [ ] User authentication and profiles
- [ ] Flashcard deck management
- [ ] Study mode with spaced repetition
- [ ] Export/Import functionality
- [ ] Mobile responsive design
- [ ] Dark mode support

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 10xCards

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**Built with ❤️ by the 10xCards Team**

[Report Bug](https://github.com/sobocim/10x-cards/issues) · [Request Feature](https://github.com/sobocim/10x-cards/issues)

</div>
