import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './pages/App';
import UserDashboard from './pages/UserDashboard';
import ProjectDashboard from './pages/ProjectDashboard';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/user/:id" element={<UserDashboard />} />
        <Route path="/project/:id" element={<ProjectDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
