import { expoSQLiteStoreProvider } from "@fitzindustries/zero-shared/expo-sqlite";

export const storageProvider = () => expoSQLiteStoreProvider();
export const storageProviderName = () => "expo-sqlite";
