import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "~/utils/base-url";

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins:
    // on web, we use the browser's storage
    Platform.OS === "web"
      ? []
      : [
          expoClient({
            scheme: "expo",
            storagePrefix: "expo",
            storage: SecureStore,
          }),
        ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
