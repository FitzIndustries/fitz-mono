import { authRouter } from "./router/auth";
import { channelsRouter } from "./router/channels";
import { organizationRouter } from "./router/organization";
import { postRouter } from "./router/post";
import { teamInvitesRouter } from "./router/team-invites";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  channels: channelsRouter,
  organization: organizationRouter,
  post: postRouter,
  teamInvites: teamInvitesRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
