import { createContext, useContext } from 'react';
import errorTrackerStore from './errorTrackerStore.js';

const ErrorTrackerContext = createContext(null);

export function ErrorTrackerProvider({ children }) {
  return (
    <ErrorTrackerContext.Provider value={errorTrackerStore}>
      {children}
    </ErrorTrackerContext.Provider>
  );
}

export function useErrorTracker() {
  const context = useContext(ErrorTrackerContext);
  if (!context) {
    throw new Error('useErrorTracker must be used within ErrorTrackerProvider');
  }
  return context;
}
