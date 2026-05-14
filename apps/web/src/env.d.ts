/// <reference types="vite/client" />

declare module 'virtual:supermech/state' {
  import type { WorkbenchState } from '@supermech/schema';

  const state: WorkbenchState;
  export default state;
}
