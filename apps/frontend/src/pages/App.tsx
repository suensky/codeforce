import React from 'react';
import { Link } from 'react-router-dom';

export default function App() {
  return (
    <div>
      <h1>Codeforce Metrics</h1>
      <p>
        <Link to="/user/1">Sample User Dashboard</Link>
      </p>
    </div>
  );
}
