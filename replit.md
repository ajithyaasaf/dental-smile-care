# Dental Clinic Management System (DCMS)

## Overview

A comprehensive dental clinic management application designed to handle 40+ patients daily with a modern React-based frontend and Express.js backend. The system manages patient records, appointments, prescriptions, and medical encounters with secure authentication and automated notification capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and theme variables
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configured with Neon Database serverless)
- **Schema Validation**: Zod schemas shared between frontend and backend
- **Storage Interface**: Abstract storage layer supporting multiple database implementations

### Authentication & Authorization
- **Primary Auth**: Firebase Authentication with JWT tokens
- **Session Management**: Express sessions with PostgreSQL store
- **Role-based Access**: User roles (admin, doctor, staff) with role claims
- **Security**: Firebase security rules and middleware-based route protection

### Data Architecture
The system uses a relational database design with the following core entities:
- **Users**: Staff members with role-based permissions
- **Patients**: Complete patient profiles with medical history
- **Appointments**: Scheduled visits with status tracking
- **Encounters**: Detailed consultation records
- **Prescriptions**: Medication prescriptions with delivery tracking
- **Audit Logs**: Immutable activity trail for compliance

### Development Environment
- **Monorepo Structure**: Shared TypeScript schemas between client and server
- **Development Server**: Vite with HMR and Express integration
- **Build Process**: Separate builds for client (Vite) and server (esbuild)
- **Code Organization**: Feature-based component structure with shared utilities

## External Dependencies

### Core Infrastructure
- **Database**: Neon Database (PostgreSQL serverless)
- **Authentication**: Firebase Authentication
- **File Storage**: Firebase Storage for document management
- **Email Service**: SendGrid for prescription delivery notifications

### Frontend Libraries
- **UI Framework**: React with Radix UI component primitives
- **Styling**: Tailwind CSS with custom design system
- **Form Handling**: React Hook Form with Hookform Resolvers
- **Data Fetching**: TanStack React Query
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React icon library

### Backend Services
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Validation**: Zod for runtime type checking
- **Session Store**: connect-pg-simple for PostgreSQL session storage
- **Development Tools**: tsx for TypeScript execution

### Deployment & Monitoring
- **Frontend Hosting**: Vercel (planned)
- **Backend Hosting**: Render/Railway (planned)
- **Performance Monitoring**: Firebase Performance
- **Error Tracking**: Sentry integration planned
- **Notifications**: WhatsApp integration via wa.me URL scheme