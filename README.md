# 9JOBS – Career Management & Job Application Platform

**9JOBS** is a career management and job application tracking platform designed to help job seekers organize their career journey, manage job applications, prepare for interviews, and access professional career support.

The platform brings together a **Mobile Application, Admin Panel, Super Admin Management System, Backend APIs, and Google Sheets Integration** into one connected system.

The goal of 9JOBS is to simplify career management for clients while providing administrators with efficient tools for managing client information, job applications, and services.

---

## 🚀 Project Overview

9JOBS is built to support both job seekers and internal administration teams.

The platform consists of four main components:

### 1. Mobile Application

The client-facing Android application allows users to access career services from one place.

Key modules include:

- Secure registration and login
- Personalized job application tracking
- Job and application details
- AI Interview Preparation
- Resume and profile optimization
- Hiring Manager connections
- Career support messaging
- User profile management
- Password recovery

The mobile application is developed using **React Native and Expo**.

### 2. Admin Panel

The 9JOBS Admin Panel provides a centralized interface for managing client-related activities.

Main capabilities include:

- Client information management
- User account management
- Job opportunities
- Application tracking
- Client progress monitoring
- Hiring Manager management
- Interview Preparation management
- Client messaging
- Resume services
- Subscription information
- Administrative settings

The Admin Panel connects to the backend APIs to access authorized business data.

### 3. Super Admin Management System

The Super Admin system is designed to provide centralized control over internal administrators and client access permissions.

Its main functions include:

- Separate Super Admin login
- Separate Office Admin login
- Add and manage Office Admin accounts
- Activate, disable, and revoke Admin access
- Manage client account access
- Assign multiple clients to an Admin
- Configure client-specific permissions
- Restrict unauthorized actions
- Protect the Super Admin account
- Maintain administrative activity records

**Access Control:** Office Admins should access only the clients and operations authorized by the Super Admin.

Super Admin features are undergoing development and local security testing before production activation.

### 4. Backend & Data Integration

The backend connects the application's different components and manages data access, authentication, integrations, and administrative operations.

Backend responsibilities include:

- API request handling
- Authentication verification
- Client identification
- Unique Client ID mapping
- Client-specific data authorization
- Job record synchronization
- Admin permission enforcement
- Database operations
- Error handling and logging

---

## ✨ Key Features

### Secure Authentication

9JOBS uses Clerk-based authentication to manage user identity and sessions.

The system separates client access from internal administrative privileges.

### Unique Client Identification

Each client can be associated with a permanent, unique Client ID.

This helps:

- Distinguish clients with identical names
- Prevent incorrect account mapping
- Associate jobs with the correct client
- Support secure client-specific data access

### Job Application Tracking

Clients can access available job application information and track their career progress through the existing application interface.

### AI Interview Preparation

The platform includes an AI Interview Preparation module intended to support users preparing for interviews.

### Resume & Profile Optimization

9JOBS provides career support services focused on improving resumes, formatting, and professional profiles.

### Hiring Manager Connections

The platform includes Hiring Manager-related features to support professional networking and career opportunities.

### Messaging & Career Support

The application provides messaging features to support communication between clients and authorized administrative teams.

### Google Sheets Integration

The platform includes a Google Sheets integration for importing available candidate and job information into backend services.

The intended data flow is:

**Master Google Sheet → Duplicate Google Sheet → Backend Database → Admin Panel / Android App**

Google Sheets access should follow least-privilege principles.

Automatic synchronization and live data consistency are subject to ongoing testing and verification.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Admin Frontend | React, TypeScript |
| Mobile Application | React Native, Expo |
| Backend | Node.js, TypeScript |
| Authentication | Clerk |
| Database | PostgreSQL |
| External Data Integration | Google Sheets API |
| Source Control | Git & GitHub |
| Development Environment | VS Code |

Additional frameworks and dependencies are documented in each project's package configuration.

---

## 📁 Project Structure

```text
9jobs-App/
│
├── admin-next/
│   └── Admin Panel and Super Admin interface
│
├── backend/
│   └── Backend APIs, authentication,
│       database services and integrations
│
├── mobile/
│   └── React Native / Expo Android App
│
└── README.md
```

Each component has its own configuration and development workflow.

---

## 🔄 System Architecture

The application follows a backend-controlled data access model.

### Client Data Flow

1. Candidate and job information is maintained in the source data system.
2. Available records are synchronized to the designated Duplicate Google Sheet.
3. Backend services read permitted data through Google Sheets integration.
4. Records are associated with the correct client identity.
5. The Admin Panel accesses authorized information through backend APIs.
6. The Android App displays client-specific data based on the authenticated account.

### Admin Access Flow

1. An authorized administrator signs in.
2. The backend verifies the authenticated identity.
3. The backend checks the administrator's assigned role and permissions.
4. The administrator can access only authorized clients and operations.
5. Sensitive permission changes are restricted to the Super Admin.

---

## 🔐 Security & Data Protection

Security is an important part of the 9JOBS platform.

The implementation is designed around these principles:

- Verified user authentication
- Role-based access control
- Client-specific data isolation
- Protected Super Admin privileges
- Secure API authorization
- Restricted Google Sheets access
- Secure credential management
- Administrative access auditing
- Database integrity protection
- Controlled development and deployment

### Sensitive Information

The repository must not contain:

- Passwords
- Clerk Secret Keys
- Google service-account private keys
- Database connection passwords
- Authentication tokens
- Personal client records
- Private environment configuration files

Secrets must be stored securely outside version control.

---

## ⚙️ Local Development Setup

### Prerequisites

Install the required development tools:

- Node.js
- npm
- Git
- VS Code or a compatible editor
- Android Studio and an Android Emulator for mobile testing

### Step 1 — Clone the Repository

```bash
git clone <your-repository-url>
cd 9jobs-App
```

Replace the placeholder with the repository's actual URL.

### Step 2 — Install Dependencies

Install the dependencies separately for the Backend, Admin Panel, and Mobile App.

```bash
cd backend
npm install
```

```bash
cd admin-next
npm install
```

```bash
cd mobile
npm install
```

### Step 3 — Configure Environment Variables

Configure the required development environment variables for each service.

These may include:

- Clerk authentication configuration
- Database connection settings
- Backend API configuration
- Google Sheets API credentials
- Local development settings

**Never commit actual secrets or private environment files to GitHub.**

### Step 4 — Start the Backend

Start the backend using the appropriate development command defined in `backend/package.json`.

### Step 5 — Start the Admin Panel

Start the frontend using the development script defined in `admin-next/package.json`.

### Step 6 — Start the Mobile App

Start Expo using the available development scripts in `mobile/package.json`, then launch the application in the Android Emulator.

Exact startup commands and environment requirements should be verified against the current project configuration.

---

## 🧪 Testing & Quality Assurance

The project uses local development and testing workflows to verify functionality before release.

Testing areas include:

- User registration and login
- Authentication and session handling
- Super Admin access protection
- Office Admin permissions
- Client data isolation
- Backend API security
- Database operations
- Android application behavior
- UI consistency
- Job data synchronization
- Backup and recovery procedures

Automated tests and local integration testing are used to identify errors before production deployment.

---

## 📌 Current Development Status

**Project Status: Active Development & Testing**

Current development work focuses on:

- Super Admin and Office Admin management
- Secure client-wise permissions
- Automated job data synchronization
- Client identity mapping
- Admin Panel improvements
- Android application UI/UX improvements
- AI Interview Preparation enhancements
- Security testing
- Performance optimization
- End-to-end system integration

**Note:** Some features are still being tested locally and may not yet be enabled in the production environment.

---

## 🎯 Project Goals

The main goals of 9JOBS are to:

1. Simplify job application management.
2. Improve client career tracking.
3. Centralize career-related services.
4. Support multiple clients securely.
5. Automate repetitive administrative tasks.
6. Improve data accuracy and synchronization.
7. Provide scalable Admin access management.
8. Deliver a smooth and professional mobile experience.

---

## 👨‍💻 Development & Maintenance

**Developed and maintained by:** 9JOBS Development Team

**Organization:** 9 JOBS PTY. LTD.

**Project:** 9JOBS Career Management Platform

**Status:** Under Active Development

---
