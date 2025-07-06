# NxtProf: AI-Powered Professional Development Platform

NxtProf is a modern, full-stack web application designed to streamline team coordination, enhance professional development, and provide deep, AI-driven insights into employee feedback. The platform features distinct roles for Team Members and Admins, a secure authentication system, real-time attendance and streak tracking, a comprehensive onboarding kit, and an advanced AI dashboard for analyzing performance.

This project is built entirely on Google's Firebase platform, offering a robust, scalable, and secure architecture.

## Core Features

### For Team Members

- **Personalized Dashboard**: A central hub displaying consecutive attendance streaks for both standups and learning hours, alerts for scheduled events, and quick access to all features.
- **AI-Powered Feedback Insights**: View personalized, AI-generated summaries of your performance feedback, including positive highlights and actionable areas for improvement.
- **Session Participation**: Easily view schedules and status for daily standups and dedicated learning hours.
- **Comprehensive Onboarding**: A guided onboarding experience including a training video, a checklist of essential resources, and a knowledge assessment to ensure readiness.
- **Profile Management**: Update your display name and profile picture through a dedicated profile editor.

### For Admins

- **Central Admin Dashboard**: An at-a-glance summary of the day's standups and learning hours, including real-time attendance counts and total employee metrics.
- **Secure Role-Based Access**: The admin system is protected by Firebase Custom Claims. Only authorized users can access admin functionality.
- **Employee Lifecycle Management**:
  - **View & Search**: See a full list of registered employees with real-time search by name, email, or Employee ID.
  - **Inline Editing**: Seamlessly update any employee's name, email, Employee ID, or assigned Feedback Sheet URL.
  - **Secure Role Management**: Promote users to Admins or demote them via protected Cloud Functions.
  - **Delete Employee**: Securely delete employee records from Firestore with a confirmation dialog.
- **Session Management**:
  - Schedule daily standups and learning hours.
  - Initiate and monitor real-time attendance tracking sessions for both standups and learning hours.
  - Manually edit attendance records for any employee during a live session.
- **Advanced AI Feedback Analysis**: For any employee, view a detailed dashboard that:
  - Fetches and analyzes data from the employee's private Google Sheet using the **Gemini 1.5 Flash** AI model.
  - Displays structured insights, including positive feedback quotes and actionable improvement suggestions.
  - Visualizes quantitative data with bar charts for single-period summaries and line charts for trends over time.
  - Allows advanced data filtering by day, month, custom date range, or full history.
- **Google Sheets Integration**: Sync all attendance data to a master Google Sheet with the click of a button for record-keeping.

## Technology Stack

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State Management**: React Context API & TanStack Query
- **Charting**: Chart.js & react-chartjs-2
- **Date Handling**: date-fns

### Backend & Infrastructure

- **Platform**: Google Firebase
- **Authentication**: Firebase Authentication (Email/Password, Google Sign-In, Custom Claims)
- **Database**: Firestore (NoSQL)
- **File Storage**: Firebase Storage
- **Serverless Logic**: Firebase Cloud Functions (v2) in TypeScript
- **AI Model**: Google's Gemini 1.5 Flash API
- **External Integration**: Google Sheets API via a dedicated Service Account

## Architecture and Data Flow

### 1. User Onboarding & Authentication

1.  **Authentication (`/auth`)**: Users sign up or log in. On first signup, a corresponding `employees/{uid}` document is created in Firestore with `hasCompletedSetup: false`.
2.  **Redirection**: After login, a central logic check determines the user's destination:
    - **Admins** are sent to `/admin`.
    - **New Users** (`hasCompletedSetup: false`) are redirected to `/setup`.
    - **Existing Users** are sent to the main dashboard (`/`).
3.  **Profile Setup (`/setup`)**: New users must provide their Employee ID and a valid Google Sheet URL. This updates their Firestore document, setting `hasCompletedSetup: true`.
4.  **Onboarding Kit (`/onboardingKit`)**: Users are guided through a multi-step process involving watching a training video, reviewing a checklist of essential resources, and passing a knowledge assessment before they can fully access the platform.

### 2. AI Feedback Dashboard Flow

1.  **Frontend Request**: An admin views an employee's detail page, triggering a call to the `getFeedbackSummary` Cloud Function with the employee's UID and selected date filters.
2.  **Cloud Function Processing**:
    - **Authorization**: The function first verifies the caller has an `isAdmin` custom claim.
    - **Data Fetching**: It retrieves the employee's `feedbackSheetUrl` from Firestore.
    - **Google Sheets API**: Using a secure Service Account, the function pulls all data from the specified Google Sheet.
    - **AI Analysis**: The textual feedback is sent to the Gemini 1.5 Flash API with a structured prompt. The AI analyzes sentiment, identifies themes, and provides summaries.
    - **Aggregation**: The function processes quantitative ratings, preparing data structures for the frontend charts.
3.  **Frontend Rendering**: The React component receives a single JSON payload containing AI summaries and chart data, then renders the summary cards and visualizations.

### 3. Standup & Learning Hour Flow

1.  **Scheduling**: An admin navigates to the Standups or Learning Hours page and schedules a new session for the current day, setting a specific time.
2.  **Session State**: The session is stored as a document in the `standups` or `learning_hours` collection in Firestore with a status of `scheduled`.
3.  **Activation**: When the admin starts the session, the document's status is updated to `active`, and a `startedAt` timestamp is recorded.
4.  **Real-time Attendance**: The admin dashboard displays all employees. The admin can mark each employee as `Present`, `Absent`, `Missed`, or `Not Available` (with a reason).
5.  **Ending the Session**: The admin stops the session, which updates the status to `ended` and records an `endedAt` timestamp. All temporary attendance data is committed to the `attendance` or `learning_hours_attendance` collection.
6.  **Summary View**: All users can then view the final attendance summary for the completed session.

## Local Development

**Contact NIAT Instructor Team**
