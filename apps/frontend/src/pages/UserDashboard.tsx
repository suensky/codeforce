import React from 'react';
import { useParams } from 'react-router-dom';

export default function UserDashboard() {
  const { id } = useParams();
  return (
    <div>
      <h2>User Dashboard {id}</h2>
    </div>
  );
}
