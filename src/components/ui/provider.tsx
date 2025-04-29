import React from "react";
import { ChakraProvider } from "@chakra-ui/react";

// Provider component for the entire app
export function Provider({ children }: { children: React.ReactNode }) {
  return <ChakraProvider>{children}</ChakraProvider>;
}

export default Provider;
