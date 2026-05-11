/// <reference types="vite/client" />

declare module 'virtual:superpowers/state' {
  import type { WorkbenchState } from 'schemas';

  const state: WorkbenchState;
  export default state;
}
