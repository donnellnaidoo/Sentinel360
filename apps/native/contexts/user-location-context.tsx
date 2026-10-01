import * as Location from "expo-location";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { reverseGeocode } from "@/lib/tomtom";

export type UserPlace = {
  latitude: number;
  longitude: number;
  label: string;
  address: string;
};

export type UserLocationStatus = "loading" | "ready" | "denied" | "unavailable";

type UserLocationContextValue = {
  status: UserLocationStatus;
  place: UserPlace | null;
  message: string | null;
  refresh: () => Promise<UserPlace | null>;
};

const UserLocationContext = createContext<UserLocationContextValue | null>(null);
const LOCATION_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Location request timed out.")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error("Could not read your location."));
      },
    );
  });
}

async function readDevicePosition() {
  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      LOCATION_TIMEOUT_MS,
    );
  } catch (error) {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) return lastKnown;
    throw error;
  }
}

export function UserLocationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<UserLocationStatus>("loading");
  const [place, setPlace] = useState<UserPlace | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setMessage(null);

    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setPlace(null);
      setStatus("denied");
      setMessage("Location permission is off.");
      return null;
    }

    try {
      const position = await readDevicePosition();
      const { latitude, longitude } = position.coords;
      const geocoded = await reverseGeocode(latitude, longitude);
      const nextPlace: UserPlace = {
        latitude,
        longitude,
        label: geocoded.label,
        address: geocoded.address,
      };
      setPlace(nextPlace);
      setStatus("ready");
      return nextPlace;
    } catch (error) {
      setPlace(null);
      setStatus("unavailable");
      setMessage(error instanceof Error ? error.message : "Could not read your location.");
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ status, place, message, refresh }),
    [status, place, message, refresh],
  );

  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}

export function useUserLocation() {
  const value = useContext(UserLocationContext);
  if (!value) {
    throw new Error("useUserLocation must be used within UserLocationProvider");
  }
  return value;
}

export function regionHeadline(status: UserLocationStatus, place: UserPlace | null): string {
  if (status === "loading") return "Locating…";
  if (status === "denied") return "Location off";
  if (!place) return "Location unavailable";

  const words = place.label.trim().split(/\s+/);
  if (words.length < 2) return place.label;
  return `${words[0]}\n${words.slice(1).join(" ")}`;
}
