/// <reference types="vite/client" />

declare module 'virtual:supermech/state' {
  import type { WorkbenchState } from 'schemas';

  const state: WorkbenchState;
  export default state;
}
