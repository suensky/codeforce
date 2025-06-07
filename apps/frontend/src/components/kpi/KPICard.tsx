import React from 'react';

// Placeholder for MUI components
const Card: React.FC<any> = ({ children, ...props }) => (
  <div style={{ border: '1px solid #ddd', padding: '16px', margin: '8px', borderRadius: '4px', minWidth: '150px', textAlign: 'center' }} {...props}>
    {children}
  </div>
);
const CardContent: React.FC<any> = ({ children, ...props }) => <div {...props}>{children}</div>;
const Typography: React.FC<any> = ({ variant, component = 'div', gutterBottom, children, ...props }) => {
  if (variant === 'h5') return <h3 {...props}>{children}</h3>;
  if (variant === 'body2') return <p style={{ color: 'gray' }} {...props}>{children}</p>;
  if (variant === 'caption') return <small style={{ color: 'red' }} {...props}>{children}</small>;
  return <div {...props}>{children}</div>;
};
const Skeleton: React.FC<any> = (props) => <div style={{ background: '#eee', height: '20px', margin: '4px 0' }} {...props}>&nbsp;</div>;
// End of MUI Placeholders

interface KPICardProps {
  title: string;
  value: string | number | undefined; // Value can be undefined initially
  isLoading: boolean;
  error?: string | Error | null;
  // linkTo?: string; // For future use
}

const KPICard: React.FC<KPICardProps> = ({ title, value, isLoading, error }) => {
  return (
    <Card sx={{ m: 1, minWidth: 180 }}> {/* sx prop is MUI specific, will be ignored by placeholder */}
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        {isLoading ? (
          <Skeleton variant="text" height={30} />
        ) : error ? (
          <Typography variant="caption" color="error">
            Error
            {/* {typeof error === 'string' ? error : (error as Error).message || 'Failed to load'} */}
          </Typography>
        ) : (
          <Typography variant="h5" component="div">
            {value ?? 'N/A'}
          </Typography>
        )}
      </CardContent>
      {/* {linkTo && <CardActions><Button size="small" component={Link} to={linkTo}>View Details</Button></CardActions>} */}
    </Card>
  );
};

export default KPICard;
