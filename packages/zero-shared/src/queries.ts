import { defineQueries, defineQuery } from "./zero";

// import { z } from "zod/v4";

import { zql } from "./schema";

export const queries = defineQueries({
  posts: {
    all: defineQuery(() => zql.Post),
  },
});
