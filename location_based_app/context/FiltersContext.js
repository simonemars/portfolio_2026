import React, { createContext, useContext, useState, useCallback } from "react";

const FiltersContext = createContext();

export function FiltersProvider({ children }) {
  const [filters, setFilters] = useState({
    radiusKm: 5,
    interests: [],
    age: [18, 99]
  });

  const [locationState, setLocationState] = useState({
    permission: "unknown",
    inRangeSharing: false
  });

  const updateFilters = useCallback((updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      radiusKm: 5,
      interests: [],
      age: [18, 99]
    });
  }, []);

  const updateLocationState = useCallback((updates) => {
    setLocationState((prev) => ({ ...prev, ...updates }));
  }, []);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.radiusKm !== 5) count++;
    if (filters.interests.length > 0) count++;
    if (filters.age[0] !== 18 || filters.age[1] !== 99) count++;
    return count;
  }, [filters]);

  return (
    <FiltersContext.Provider
      value={{
        filters,
        locationState,
        updateFilters,
        resetFilters,
        updateLocationState,
        activeFilterCount: getActiveFilterCount()
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFilters must be used within FiltersProvider");
  }
  return context;
}




