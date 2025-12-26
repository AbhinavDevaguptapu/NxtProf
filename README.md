# NxtProf: AI-Powered Professional Development Platform

NxtProf is a modern, full-stack web application designed to streamline team coordination, enhance professional development, and provide deep, AI-driven insights into employee feedback. The platform features distinct roles for Team Members and Admins, a secure authentication system, real-time attendance and streak tracking, a comprehensive onboarding kit, and an advanced AI dashboard for analyzing performance.

This project is built entirely on Google's Firebase platform, offering a robust, scalable, and secure architecture.

## Core Features

### For Team Members

- **Personalized Dashboard**: A central hub displaying consecutive attendance streaks for both standups and learning hours, alerts for scheduled events, and quick access to all features.
- **Comprehensive Peer Feedback**:
  - **Request Feedback**: Formally request constructive feedback from any colleague.
  - **Give Feedback**: Proactively give structured, anonymous feedback to any team member on their work efficiency and collaboration.
  - **View Received Feedback**: See all feedback you've received in a unified, 100% anonymous view.
- **AI-Powered Feedback Insights**: View personalized, AI-generated summaries of your performance feedback, including positive highlights and actionable areas for improvement.
- **Session Participation**: Easily view schedules and status for daily standups and dedicated learning hours.
- **Comprehensive Onboarding**: A guided onboarding experience including a training video, a checklist of essential resources, and a knowledge assessment to ensure readiness.
- **Profile Management**: Update your display name and profile picture through a dedicated profile editor.

### For Admins

- **Central Admin Dashboard**: An at-a-glance summary of the day's standups and learning hours, including real-time attendance counts and total employee metrics.
- **Full Feedback Transparency**:
  - **Real-time Audit Trail**: View a complete, non-anonymous log of all peer feedback given and requested across the organization.
  - **Employee Filtering**: Easily filter the entire feedback history to see all interactions involving a specific employee.
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

## Tech Stack

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router v6 & State-based navigation
- **UI Components**: shadcn/ui (powered by Radix UI, Embla Carousel, Input OTP)
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State Management**: React Context API & TanStack Query
- **Charting**: Chart.js, react-chartjs-2, and Recharts
- **Date Handling**: date-fns
- **Theming**: Next.js Themes

### Backend & Infrastructure

- **Platform**: Google Firebase
- **Authentication**: Firebase Authentication (Email/Password, Google Sign-In, Custom Claims)
- **Database**: Firestore (NoSQL) with Security Rules
- **File Storage**: Firebase Storage
- **Serverless Logic**: Firebase Cloud Functions (v2) in TypeScript
- **AI Model**: Google's Gemini 2.5 Flash Lite API
- **External Integration**: Google Sheets API via a dedicated Service Account

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need to have `npm` or `yarn` installed on your machine.

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/niatInstructor/NxtProf.git
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```

### Running the Application

To run the app in the development mode, use:
```sh
npm run dev
```
Open [http://localhost:8080](http://localhost:8080) to view it in the browser.

The page will reload if you make edits. You will also see any lint errors in the console.

## Available Scripts

In the project directory, you can run:

- `npm run dev`: Runs the app in the development mode.
- `npm run build`: Builds the app for production to the `dist` folder.
- `npm run lint`: Lints the project files using ESLint.
- `npm run preview`: Serves the production build locally for preview.

## Project Structure

```
├── functions         # Firebase Cloud Functions
├── public            # Public assets
├── src
│   ├── components    # Shared UI components
│   ├── context       # React Context providers
│   ├── features      # Feature-based modules
│   ├── hooks         # Custom React hooks
│   ├── integrations  # Third-party integrations (e.g., Firebase)
│   ├── layout        # Application shell and layout components
│   └── lib           # Utility functions
├── vite.config.ts    # Vite configuration
└── ...
```

## Architecture and Data Flow

### 1. User Onboarding & Authentication

1.  **Authentication (`/auth`)**: Users sign up or log in. On first signup, a corresponding `employees/{uid}` document is created in Firestore with `hasCompletedSetup: false`.
2.  **Redirection**: After login, a central logic check determines the user's destination:
    - **Admins** are sent to `/admin`.
    - **New Users** (`hasCompletedSetup: false`) are redirected to `/setup`.
    - **Existing Users** are sent to the main dashboard (`/`).
3.  **Profile Setup (`/setup`)**: New users must provide their Employee ID and a valid Google Sheet URL. This updates their Firestore document, setting `hasCompletedSetup: true`.
4.  **Onboarding Kit (`/onboardingKit`)**: Users are guided through a multi-step process involving watching a training video, reviewing a checklist of essential resources, and passing a knowledge assessment before they can fully access the platform.

### 2. Peer Feedback Flow

1.  **Requesting/Giving**: A user can either request feedback from a target user (creating a `peerFeedbackRequests` document) or give feedback directly (creating a `givenPeerFeedback` document with `type: 'direct'`).
2.  **Responding to a Request**: When a user responds to a request, a new `givenPeerFeedback` document is created with `type: 'requested'`, and the original request is marked as complete. This unifies all feedback into a single collection.
3.  **User Anonymity (Cloud Function)**: When a user views their received feedback, they call the `getMyReceivedFeedback` Cloud Function. This function acts as a secure intermediary, fetching all relevant documents from `givenPeerFeedback` but **stripping out the `giverId`** before sending the data to the client. This enforces 100% anonymity.
4.  **Admin View (Real-time)**: The admin dashboard uses a direct, real-time Firestore listener (`onSnapshot`) on the `givenPeerFeedback` collection. Firestore Security Rules ensure only users with an `isAdmin` claim can create this listener, giving them full, transparent access to the data.

### 3. AI Feedback Dashboard Flow

1.  **Frontend Request**: An admin views an employee's detail page, triggering a call to the `getFeedbackSummary` Cloud Function with the employee's UID and selected date filters.
2.  **Cloud Function Processing**:
    - **Authorization**: The function first verifies the caller has an `isAdmin` custom claim.
    - **Data Fetching**: It retrieves the employee's `feedbackSheetUrl` from Firestore.
    - **Google Sheets API**: Using a secure Service Account, the function pulls all data from the specified Google Sheet.
    - **AI Analysis**: The textual feedback is sent to the Gemini 1.5 Flash API with a structured prompt. The AI analyzes sentiment, identifies themes, and provides summaries.
    - **Aggregation**: The function processes quantitative ratings, preparing data structures for the frontend charts.
3.  **Frontend Rendering**: The React component receives a single JSON payload containing AI summaries and chart data, then renders the summary cards and visualizations.

### 4. Standup & Learning Hour Flow

1.  **Scheduling**: An admin navigates to the Standups or Learning Hours page and schedules a new session for the current day, setting a specific time.
2.  **Session State**: The session is stored as a document in the `standups` or `learning_hours` collection in Firestore with a status of `scheduled`.
3.  **Activation**: When the admin starts the session, the document's status is updated to `active`, and a `startedAt` timestamp is recorded.
4.  **Real-time Attendance**: The admin dashboard displays all employees. The admin can mark each employee as `Present`, `Absent`, `Missed`, or `Not Available` (with a reason).
5.  **Ending the Session**: The admin stops the session, which updates the status to `ended` and records an `endedAt` timestamp. All temporary attendance data is committed to the `attendance` or `learning_hours_attendance` collection.
6.  **Summary View**: All users can then view the final attendance summary for the completed session.

## Local Development

**Contact NIAT Instructor Team**
