import { ZeroProvider } from "./zero-provider";

function Providers({ children }: { children: React.ReactNode }) {
  return <ZeroProvider>{children}</ZeroProvider>;
}

export { Providers };
