import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { getNearbyPeople } from "../services/location";

const FiltersContext = createContext();

const DEFAULT_FILTERS = { radiusKm: 5, age: [18, 99] };

export function FiltersProvider({ children }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [locationState, setLocationState] = useState({
    permission: "unknown",
    inRangeSharing: false,
  });

  const [nearbyPeople, setNearbyPeople] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const fetchIdRef = useRef(0);

  const updateFilters = useCallback((updates) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const updateLocationState = useCallback((updates) => {
    setLocationState((prev) => ({ ...prev, ...updates }));
  }, []);

  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.radiusKm !== DEFAULT_FILTERS.radiusKm) count++;
    if (filters.age[0] !== DEFAULT_FILTERS.age[0] || filters.age[1] !== DEFAULT_FILTERS.age[1]) count++;
    return count;
  }, [filters]);

  const fetchNearby = useCallback(async () => {
    if (locationState.permission !== "granted" || !locationState.inRangeSharing) {
      setNearbyPeople([]);
      return;
    }

    const id = ++fetchIdRef.current;
    setNearbyLoading(true);
    try {
      const data = await getNearbyPeople(filters.radiusKm, filters.age[0], filters.age[1]);
      if (fetchIdRef.current === id) {
        setNearbyPeople(data ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch nearby people:", err);
      if (fetchIdRef.current === id) {
        setNearbyPeople([]);
      }
    } finally {
      if (fetchIdRef.current === id) {
        setNearbyLoading(false);
      }
    }
  }, [filters, locationState.permission, locationState.inRangeSharing]);

  useEffect(() => {
    fetchNearby();
  }, [fetchNearby]);

  return (
    <FiltersContext.Provider
      value={{
        filters,
        locationState,
        updateFilters,
        resetFilters,
        updateLocationState,
        activeFilterCount: getActiveFilterCount(),
        nearbyPeople,
        nearbyLoading,
        refreshNearby: fetchNearby,
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
