/// <reference types="vite/client" />

// Declaração para permitir importar arquivos CSV
declare module '*.csv' {
  const content: string;
  export default content;
}
