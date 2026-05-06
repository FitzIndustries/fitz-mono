export interface ZeroContext {
  userId: string;
  organizationId: string;
  membershipId: string | null;
}

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    context: ZeroContext | undefined;
  }
}

// Zero shared types and utilities
export { schema } from "./schema";
export { queries } from "./queries";
export { mutators } from "./mutators";
