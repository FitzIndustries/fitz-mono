// import { opSQLiteStoreProvider } from "@fitzindustries/zero-shared/op-sqlite";
import { Platform } from "react-native";
import { expoSQLiteStoreProvider } from "@fitzindustries/zero-shared/expo-sqlite";

const provider = Platform.OS === "web" ? "idb" : "expo-sqlite";

export const storageProvider = () => {
  if (provider === "idb") {
    return "idb" as const;
  }
  return expoSQLiteStoreProvider();
};

export const storageProviderName = () => {
  return provider;
};
