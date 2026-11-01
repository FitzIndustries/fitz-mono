import { db } from "@fitzindustries/db/client";
import { schema } from "@fitzindustries/zero-shared";
import { zeroDrizzle } from "@fitzindustries/zero-shared/server";

export const dbProvider = zeroDrizzle(schema, db);
