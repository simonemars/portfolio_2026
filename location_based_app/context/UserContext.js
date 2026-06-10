import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getMe } from "../services/profile";

const UserContext = createContext();

export function UserProvider({ children }) {
  const [me, setMe] = useState(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const refreshMe = useCallback(async () => {
    setLoadingMe(true);
    try {
      const data = await getMe();
      setMe(data ?? null);
    } catch (err) {
      console.error("Failed to fetch current user:", err);
      setMe(null);
    } finally {
      setLoadingMe(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  return (
    <UserContext.Provider
      value={{
        me,
        loadingMe,
        refreshMe,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
