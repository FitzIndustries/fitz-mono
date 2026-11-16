// Do not import expo-sqlite on web: that unnecessarily bundles its WASM worker.
export const storageProvider = () => "idb" as const;
export const storageProviderName = () => "idb";
