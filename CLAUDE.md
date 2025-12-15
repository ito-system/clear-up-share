# CLAUDE.md

必ず日本語で回答してください。
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClearUp is a web application with a monorepo structure containing:

- **frontend/**: React 19 + TypeScript + Vite application
- **backend/**: Go 1.25 API server using Gin framework with GORM/SQLite

## Commands

### Frontend (run from `frontend/` directory)

```bash
npm run dev      # Start development server with HMR
npm run build    # TypeScript compile + Vite build
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

### Backend (run from `backend/` directory)

```bash
go run .         # Run the server
go build         # Build the binary
go test ./...    # Run all tests
```

## Architecture

### Frontend Stack

- **React 19** with TypeScript
- **Vite 7** for bundling and dev server
- **Zustand** for state management
- **React Router v7** for routing
- **Axios** for HTTP requests

### Backend Stack

- **Gin** web framework
- **GORM** ORM with SQLite driver
- **godotenv** for environment configuration
