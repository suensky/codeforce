import create from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  gitlabPat: string | null;
  setGitlabPat: (token: string | null) => void;
  clearGitlabPat: () => void;
}

const PAT_STORAGE_KEY = 'gitlab_pat';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      gitlabPat: null, // Initial state, will be overridden by localStorage if present
      setGitlabPat: (token) => {
        set({ gitlabPat: token });
      },
      clearGitlabPat: () => {
        set({ gitlabPat: null });
      },
    }),
    {
      name: PAT_STORAGE_KEY, // Name of the item in localStorage
      storage: createJSONStorage(() => localStorage), // Use localStorage
      onRehydrateStorage: (state) => {
        // This function is called when Zustand finishes rehydrating from storage.
        // We can log or perform actions after rehydration if needed.
        // console.log('AuthStore rehydrated from localStorage', state);
        return (hydratedState, error) => {
          if (error) {
            console.error('Error rehydrating AuthStore:', error);
          }
          if (hydratedState) {
             // console.log('AuthStore successfully rehydrated:', hydratedState);
          }
        };
      },
      // Partialize: only persist gitlabPat, not the functions
      partialize: (state) => ({ gitlabPat: state.gitlabPat }),
    }
  )
);

// Optional: Initialize from localStorage immediately if not handled by `persist` middleware's onRehydrateStorage
// This is often handled automatically by persist, but can be done manually if needed for first render.
// const initialPat = localStorage.getItem(PAT_STORAGE_KEY);
// if (initialPat) {
//   try {
//     const storedState = JSON.parse(initialPat);
//     if (storedState && storedState.state && storedState.state.gitlabPat) {
//        useAuthStore.setState({ gitlabPat: storedState.state.gitlabPat });
//     }
//   } catch (e) {
//     console.error("Failed to parse PAT from localStorage", e);
//   }
// }

export default useAuthStore;
