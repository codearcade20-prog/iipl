# Project Presentation: Innovative Interiors Web Application

This document provides a simple overview of the technical aspects of the Innovative Interiors project.

## 🚀 Technologies Used
We have utilized a modern tech stack to ensure performance, scalability, and a great user experience.

- **Frontend Framework**: [React 19](https://react.dev/) - A powerful library for building user interfaces.
- **Build Tool**: [Vite](https://vitejs.dev/) - Ensuring fast development and optimized production builds.
- **Routing**: React Router DOM (v7) - Managing navigation between different pages.
- **Backend & Database**:
  - **Supabase**: Provides a real-time database and authentication.
  - **Firebase**: Additional backend services.
- **Utilities**:
  - **XLSX**: For handling Excel file operations.
  - **Lucide React**: For beautiful, consistent icons.

## 💻 Programming Languages
The following languages are the backbone of this project:

1.  **JavaScript (ES6+)**: The primary logic language for the application.
2.  **JSX (JavaScript XML)**: Used to write HTML-like structures within JavaScript files.
3.  **CSS3**: Standard styling language for the application's look and feel.
4.  **SQL**: Structured Query Language used for managing the Supabase database.

## 📂 Project Structure
The project is organized in a modular `react-app` directory structure to keep code clean and maintainable.

### Root Directory (`/react-app`)
- **public/**: Contains static assets that don't need processing (e.g., icons, manifest).
- **src/**: The source code folder where all development happens.

### Source Directory (`/react-app/src`)
- **components/**: Reusable UI building blocks (e.g., Navigation bars, Buttons, Modals).
- **pages/**: Full-page components corresponding to different routes (e.g., `AdminDashboard`, `InvoiceGenerator`, `ApprovedPayments`).
- **context/**: Manages global application state (like User Authentication) so data can be accessed anywhere.
- **lib/**: Contains configuration files for connecting to external services like Supabase.
- **assets/**: Stores images, fonts, and other media files.
- **.sql files**: Database scripts for setting up tables and policies in Supabase.

## ✨ Key Technical Features
- **Component-Based Architecture**: Code is split into small, reusable pieces.
- **Client-Side Routing**: Smooth page transitions without reloading the browser.
- **Real-time Data**: Integration with Supabase allows for live data updates.
