declare module "react-syntax-highlighter" {
  import type { ComponentType, CSSProperties } from "react";
  interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, CSSProperties>;
    customStyle?: CSSProperties;
    showLineNumbers?: boolean;
    children?: string;
  }
  export const Prism: ComponentType<SyntaxHighlighterProps>;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  import { CSSProperties } from "react";
  export const oneDark: { [key: string]: CSSProperties };
}
