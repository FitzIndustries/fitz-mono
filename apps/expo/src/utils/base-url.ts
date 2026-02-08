import Constants from "expo-constants";

/**
 * Gets the IP address of your host-machine via Expo's debugger host.
 * Falls back to env vars if set, otherwise throws in development.
 *
 * NOTE: `localhost` does not work on Android — Expo's hostUri
 * automatically resolves to the correct LAN IP.
 */
const getLocalhost = () => {
  const debuggerHost = Constants.expoConfig?.hostUri;
  return debuggerHost?.split(":")[0];
};

/**
 * Base URL for the API server (tRPC, better-auth, etc.).
 * Port 3000 is the default for the TanStack Start dev server.
 */
export const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const localhost = getLocalhost();
  if (!localhost) {
    throw new Error(
      "Failed to get localhost. Please point to your production server.",
    );
  }
  return `http://${localhost}:3001`;
};

/**
 * Base URL for the Zero cache server.
 * Port 4848 is the default for zero-cache.
 */
export const getZeroCacheUrl = () => {
  if (process.env.EXPO_PUBLIC_ZERO_CACHE_URL) {
    return process.env.EXPO_PUBLIC_ZERO_CACHE_URL;
  }

  const localhost = getLocalhost();
  if (!localhost) {
    throw new Error(
      "Failed to get localhost. Please point to your production zero-cache server.",
    );
  }
  return `http://${localhost}:4848`;
};
