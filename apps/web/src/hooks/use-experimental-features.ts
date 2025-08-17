'use client';

import { useState, useEffect } from 'react';

const EXPERIMENTAL_FEATURES_KEY = 'ledgermind_experimental_features';

export function useExperimentalFeatures() {
  const [experimentalEnabled, setExperimentalEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXPERIMENTAL_FEATURES_KEY);
      if (stored !== null) {
        setExperimentalEnabled(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading experimental features setting:', error);
    }
  }, []);

  const toggleExperimental = () => {
    const newValue = !experimentalEnabled;
    setExperimentalEnabled(newValue);
    try {
      localStorage.setItem(EXPERIMENTAL_FEATURES_KEY, JSON.stringify(newValue));
    } catch (error) {
      console.error('Error saving experimental features setting:', error);
    }
  };

  return {
    experimentalEnabled,
    toggleExperimental,
  };
}