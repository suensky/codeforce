import React from 'react';
import { Outlet } from 'react-router-dom';
import Layout from '../components/Layout'; // Import the Layout component
import { useAppTheme } from '../providers/AppThemeProvider'; // Import the theme hook

export default function App() {
  const { mode, toggleTheme } = useAppTheme();

  return (
    <Layout currentThemeMode={mode} toggleTheme={toggleTheme}>
      <Outlet /> {/* Child routes will render here */}
    </Layout>
  );
}
