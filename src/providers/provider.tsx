import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  // Add your theme customizations here
});

export const Provider = ({ children }: { children: React.ReactNode }) => {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
};
