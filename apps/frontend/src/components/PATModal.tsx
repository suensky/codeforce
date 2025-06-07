import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

// Placeholder for MUI components - these would be imported from @mui/material
const Dialog: React.FC<any> = ({ open, onClose, children }) => open ? <div className="MUIDialog-Placeholder">{children}</div> : null;
const DialogTitle: React.FC<any> = ({ children }) => <h4>{children}</h4>;
const DialogContent: React.FC<any> = ({ children }) => <div>{children}</div>;
const DialogContentText: React.FC<any> = ({ children }) => <p>{children}</p>;
const TextField: React.FC<any> = (props) => <input type="password" {...props} style={{ width: '90%', padding: '10px', margin: '10px 0' }}/>;
const DialogActions: React.FC<any> = ({ children }) => <div>{children}</div>;
const Button: React.FC<any> = (props) => <button {...props} style={{ padding: '10px', margin: '5px' }} />;
// End of MUI Placeholders

interface PATModalProps {
  open: boolean;
  onClose: () => void;
}

const PATModal: React.FC<PATModalProps> = ({ open, onClose }) => {
  const { gitlabPat, setGitlabPat, clearGitlabPat } = useAuthStore();
  const [currentPatInput, setCurrentPatInput] = useState<string>(gitlabPat || '');

  const handleSave = () => {
    setGitlabPat(currentPatInput);
    onClose();
  };

  const handleClear = () => {
    clearGitlabPat();
    setCurrentPatInput(''); // Clear input field as well
    // onClose(); // Optional: keep modal open or close after clear
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPatInput(event.target.value);
  };

  // Update input if PAT changes in store (e.g. cleared elsewhere)
  React.useEffect(() => {
    setCurrentPatInput(gitlabPat || '');
  }, [gitlabPat]);

  return (
    <Dialog open={open} onClose={onClose} aria-labelledby="pat-dialog-title">
      <DialogTitle id="pat-dialog-title">GitLab Personal Access Token (PAT)</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter your GitLab Personal Access Token. This token will be stored in your
          browser's local storage and only sent to your local backend proxy for GitLab API requests.
          Ensure it has the necessary scopes (e.g., `api`, `read_user`, `read_repository`).
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="pat"
          label="GitLab PAT"
          type="password"
          fullWidth
          variant="standard"
          value={currentPatInput}
          onChange={handleInputChange}
          placeholder="Enter your PAT here"
        />
        <DialogContentText style={{ fontSize: '0.8em', marginTop: '10px' }}>
          Security Note: The PAT is stored in your browser's local storage.
          It is sent from your browser to a backend proxy (part of this application)
          which then uses it to communicate with GitLab. Never expose your PAT directly to untrusted sites.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClear} color="warning">
          Clear Stored PAT
        </Button>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} color="primary">
          Save PAT
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PATModal;
