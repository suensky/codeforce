import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/App';
import UserDashboard from './pages/UserDashboard';
import ProjectDashboard from './pages/ProjectDashboard';
import QueryProvider from './providers/QueryProvider';
import { AppThemeProvider } from './providers/AppThemeProvider'; // Import AppThemeProvider

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppThemeProvider> {/* Wrap with AppThemeProvider */}
      <QueryProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
          <Route path="/user/:id" element={<UserDashboard />} />
          <Route path="/project/:id" element={<ProjectDashboard />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>,
);
