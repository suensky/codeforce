import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/App'; // This App component now serves as the Layout wrapper
import HomePage from './pages/HomePage'; // Import the new HomePage component
import UserDashboard from './pages/UserDashboard';
import ProjectDashboard from './pages/ProjectDashboard';
import QueryProvider from './providers/QueryProvider';
import { AppThemeProvider } from './providers/AppThemeProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <QueryProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />}> {/* App is the layout component */}
              <Route index element={<HomePage />} /> {/* Default child route */}
              <Route path="user/:id" element={<UserDashboard />} />
              <Route path="project/:id" element={<ProjectDashboard />} />
            </Route>
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>,
);
