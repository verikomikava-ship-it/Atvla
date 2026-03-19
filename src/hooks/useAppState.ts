import { useState, useCallback } from 'react';
import { AppState } from '../types';
import { loadState, saveState } from '../utils/storage';

export const useAppState = () => {
  const [state, setState] = useState<AppState>(loadState);

  const updateState = useCallback((newState: AppState) => {
    setState(newState);
    saveState(newState);
  }, []);

  return { state, updateState };
};

export const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue: T | ((val: T) => T)) => {
      try {
        const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
        setValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {
        console.error('Failed to save to localStorage');
      }
    },
    [value, key]
  );

  return [value, setStoredValue] as const;
};
