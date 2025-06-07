import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore'; // To show conditional messages or links

export default function HomePage() {
  const { gitlabPat } = useAuthStore();

  return (
    <div>
      {!gitlabPat && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid orange', borderRadius: '5px' }}>
          <p>
            A GitLab Personal Access Token (PAT) is required to fetch data.
            Please use the button in the header to set your token.
          </p>
        </div>
      )}

      <nav style={{ marginTop: '20px' }}>
        <p>Navigation:</p>
        <ul>
          <li>
            <Link to="/user/YOUR_GITLAB_USER_ID">My User Dashboard</Link>
            <span style={{ fontSize: '0.8em' }}> (Replace YOUR_GITLAB_USER_ID)</span>
          </li>
          <li>
            <Link to="/project/YOUR_PROJECT_ID">Sample Project Dashboard</Link>
            <span style={{ fontSize: '0.8em' }}> (Replace YOUR_PROJECT_ID)</span>
          </li>
        </ul>
      </nav>

      <div style={{ marginTop: '30px' }}>
        <p>Welcome to Codeforce Metrics. Use the navigation links above to view dashboards.</p>
        {gitlabPat ? (
          <p>Your GitLab PAT is set. You should be able to fetch data.</p>
        ) : (
          <p>Ensure your PAT is set to access GitLab data.</p>
        )}
      </div>
    </div>
  );
}
