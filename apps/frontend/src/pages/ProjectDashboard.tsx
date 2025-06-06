import React from 'react';
import { useParams } from 'react-router-dom';

export default function ProjectDashboard() {
  const { id } = useParams();
  return (
    <div>
      <h2>Project Dashboard {id}</h2>
    </div>
  );
}
