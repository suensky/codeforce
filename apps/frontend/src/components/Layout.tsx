import React, { useState } from 'react';
import { Outlet } from 'react-router-dom'; // Assuming nested routes will be used
import PATModal from './PATModal'; // Assuming PATModal is in the same directory or correct path
import { useAuthStore } from '../stores/authStore';

// Placeholder for MUI components - these would be imported from @mui/material and @mui/icons-material
const AppBar: React.FC<any> = ({ children, ...props }) => <header {...props}>{children}</header>;
const Toolbar: React.FC<any> = ({ children, ...props }) => <div {...props}>{children}</div>;
const Typography: React.FC<any> = ({ children, ...props }) => <h1 {...props}>{children}</h1>;
const IconButton: React.FC<any> = ({ children, ...props }) => <button {...props}>{children}</button>;
const Box: React.FC<any> = ({ children, ...props }) => <div {...props}>{children}</div>;
const Container: React.FC<any> = ({ children, ...props }) => <main {...props}>{children}</main>;
const Button: React.FC<any> = (props) => <button {...props} style={{ padding: '8px 15px', margin: '0 5px' }} />;

// Placeholder for Icons
const Brightness4Icon = () => <span>🌙</span>;
const Brightness7Icon = () => <span>☀️</span>;
// End of MUI Placeholders

// Props for Layout, including theme toggling function from context
interface LayoutProps {
  toggleTheme: () => void;
  currentThemeMode: 'light' | 'dark';
}

const Layout: React.FC<LayoutProps> = ({ children, toggleTheme, currentThemeMode }) => {
  const { gitlabPat } = useAuthStore();
  const [isPatModalOpen, setIsPatModalOpen] = useState(false);

  const handleOpenPatModal = () => setIsPatModalOpen(true);
  const handleClosePatModal = () => setIsPatModalOpen(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" component="header">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            GitLab Metrics Dashboards
          </Typography>
          <IconButton onClick={toggleTheme} color="inherit">
            {currentThemeMode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
          {gitlabPat ? (
            <Button color="inherit" onClick={handleOpenPatModal}>Manage PAT</Button>
          ) : (
            <Button color="inherit" onClick={handleOpenPatModal}>Set PAT</Button>
          )}
        </Toolbar>
      </AppBar>
      <PATModal open={isPatModalOpen} onClose={handleClosePatModal} />
      <Container component="main" sx={{ flexGrow: 1, p: 3 }}>
        {/* If using react-router v6 nested routes, <Outlet /> renders child routes here */}
        {/* If not, children prop will render the direct page component */}
        {children || <Outlet />}
      </Container>
    </Box>
  );
};

export default Layout;
