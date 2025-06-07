import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../api/axiosInstance';
import { UserContributionMetrics } from '../types/metrics';
import KPICard from '../components/kpi/KPICard';

// Placeholder for MUI components
const TextField: React.FC<any> = ({ label, value, onChange, onBlur, ...props }) => (
  <div style={{ margin: '10px 0' }}>
    <label>{label}: </label>
    <input type="text" value={value} onChange={onChange} onBlur={onBlur} {...props} style={{ padding: '8px', marginRight: '10px' }}/>
  </div>
);
const Button: React.FC<any> = (props) => <button {...props} style={{ padding: '8px 15px', margin: '0 5px' }} />;
const Grid: React.FC<any> = ({ container, spacing, children, ...props }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', margin: `-${spacing*4}px` }} {...props}>{children}</div>
);
const GridItem: React.FC<any> = ({ xs, sm, md, children, ...props }) => ( // Renamed from Grid to avoid conflict
  <div style={{ padding: '8px', boxSizing: 'border-box', width: `${(12 / (xs || 12)) * 100}%` }} {...props}>{children}</div>
);
const Typography: React.FC<any> = ({ variant, component = 'div', gutterBottom, children, ...props }) => {
  if (variant === 'h4') return <h2 {...props}>{children}</h2>;
  if (variant === 'h5') return <h3 {...props}>{children}</h3>;
  if (variant === 'body1') return <p {...props}>{children}</p>;
  if (variant === 'caption') return <small style={{ color: 'red' }} {...props}>{children}</small>;
  return <div {...props}>{children}</div>;
};
const CircularProgress: React.FC<any> = () => <div>Loading...</div>;
const Alert: React.FC<any> = ({severity, children}) => <div style={{color: severity === 'error' ? 'red' : 'blue', border: '1px solid', padding: '10px', margin: '10px 0'}}>{children}</div>
// End of MUI Placeholders


const fetchUserContributions = async (userId: string, refresh: boolean = false): Promise<UserContributionMetrics> => {
  const params = refresh ? { refresh: 'true' } : {};
  const { data } = await axiosInstance.get(`/users/${userId}/contributions`, { params });
  return data;
};

export default function UserDashboard() {
  const { id: routeUserId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentId, setCurrentId] = useState<string>(routeUserId || '');

  useEffect(() => {
    // Sync currentId state if routeUserId changes
    if (routeUserId && routeUserId !== currentId) {
      setCurrentId(routeUserId);
    }
  }, [routeUserId, currentId]);

  const {
    data: metrics,
    isLoading,
    error,
    refetch, // To manually refetch
    isFetching, // Different from isLoading, true during background refetches
  } = useQuery<UserContributionMetrics, Error>(
    ['userContributions', currentId], // Query key includes the currentId from local state
    () => fetchUserContributions(currentId, false),
    {
      enabled: !!currentId, // Only run query if currentId is available
      // staleTime: 1000 * 60 * 1, // 1 minute, example
    }
  );

  const handleIdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentId(event.target.value);
  };

  const handleIdSubmit = () => {
    if (currentId && currentId !== routeUserId) {
      navigate(`/user/${currentId}`);
      // queryClient.invalidateQueries(['userContributions', currentId]); // Optional: invalidate immediately
    }
  };

  const handleRefresh = (forceBackendRefresh: boolean = false) => {
    if (forceBackendRefresh) {
      // This will add ?refresh=true to the backend call via axiosInstance interceptor logic (if any)
      // or we modify fetchUserContributions to pass a refresh flag
      queryClient.invalidateQueries(['userContributions', currentId]);
      // Alternatively, to specifically trigger the refresh logic in fetchUserContributions if it was designed for it:
      // refetch({ queryKey: ['userContributions', currentId, { refresh: true }] }); // This is not standard, custom queryFn needed
      // Forcing a true refresh often means invalidating and letting react-query refetch.
      // The backend then needs to bypass its cache.
      // Simplest: invalidate, and if backend has its own cache TTL, that will eventually pass.
      // If explicit refresh param is needed by backend for cache busting:
      // The queryFn needs to accept it. We can trigger a refetch of a query with different parameters if queryKey changes.
      // Or, more simply, use queryClient.fetchQuery to fetch with refresh=true, then invalidate.
      // For now, simple refetch() or invalidateQueries() is fine.
      // Forcing backend cache bypass usually involves specific header or query param our axiosInstance might not add by default.
      // Let's assume our backend's cache + react-query's refetch is smart enough, or we add a 'refresh' button that does more.
      // The `fetchUserContributions` is modified to accept a refresh param.
      // We can call `queryClient.fetchQuery` to force this.
       queryClient.fetchQuery(['userContributions', currentId], () => fetchUserContributions(currentId, true));

    } else {
      refetch(); // Standard refetch, will use cached data if not stale
    }
  };


  if (!routeUserId) {
    // This case should ideally be handled by routing (e.g. redirect or a different component)
    return <Typography variant="h5">Please enter a User ID.</Typography>;
  }

  // Initial loading state for the first fetch when routeUserId is set
  if (isLoading && !metrics && currentId === routeUserId) {
     return (
      <div>
        <Typography variant="h4" gutterBottom>User Dashboard</Typography>
        <TextField
          label="GitLab User ID"
          value={currentId}
          onChange={handleIdChange}
          onBlur={handleIdSubmit} // Or use a button
          placeholder="Enter User ID and press Enter or click away"
        />
        <Button onClick={handleIdSubmit}>Go</Button>
        <CircularProgress />
      </div>
    );
  }


  return (
    <div>
      <Typography variant="h4" component="h1" gutterBottom>
        User Dashboard: {currentId}
      </Typography>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <TextField
          label="GitLab User ID"
          value={currentId}
          onChange={handleIdChange}
          // onBlur={handleIdSubmit} // Submit on blur might be too aggressive
          placeholder="Enter User ID"
        />
        <Button onClick={handleIdSubmit} variant="contained" sx={{ mr: 1 }}>
          Load User
        </Button>
        <Button onClick={() => handleRefresh(false)} variant="outlined" disabled={isFetching}>
          {isFetching && !isLoading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
         <Button onClick={() => handleRefresh(true)} variant="outlined" color="secondary" disabled={isFetching} title="Force refresh from GitLab, bypassing local and backend cache">
          {isFetching && !isLoading ? 'Force Refreshing...' : 'Force Refresh'}
        </Button>
      </div>

      {error && (
        <Alert severity="error">
          Failed to load user contributions: {error.message}
        </Alert>
      )}

      <Grid container spacing={2}>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Commits" value={metrics?.commits} isLoading={isLoading || isFetching} /></GridItem>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Merge Requests Opened" value={metrics?.mergeRequestsOpened} isLoading={isLoading || isFetching} /></GridItem>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Merge Requests Merged" value={metrics?.mergeRequestsMerged} isLoading={isLoading || isFetching} /></GridItem>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Code Reviews" value={metrics?.codeReviews} isLoading={isLoading || isFetching} /></GridItem>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Issues Opened" value={metrics?.issuesOpened} isLoading={isLoading || isFetching} /></GridItem>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Issues Closed" value={metrics?.issuesClosed} isLoading={isLoading || isFetching} /></GridItem>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Lines Added" value={metrics?.linesAdded} isLoading={isLoading || isFetching} /></GridItem>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Lines Deleted" value={metrics?.linesDeleted} isLoading={isLoading || isFetching} /></GridItem>
        <GridItem xs={12} sm={6} md={4} lg={3}><KPICard title="Lines Net" value={metrics?.linesNet} isLoading={isLoading || isFetching} /></GridItem>
      </Grid>

      {/* TODO: Display contributedProjects list/table */}
    </div>
  );
}
