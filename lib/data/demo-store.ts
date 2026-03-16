import { createDemoSnapshot } from "@/lib/data/fixtures";
import type { WorkspaceSnapshot } from "@/lib/types";

declare global {
  var __OPSPILOT_DEMO_STORE__: WorkspaceSnapshot | undefined;
}

export function getDemoStore() {
  if (!globalThis.__OPSPILOT_DEMO_STORE__) {
    globalThis.__OPSPILOT_DEMO_STORE__ = createDemoSnapshot();
  }

  return globalThis.__OPSPILOT_DEMO_STORE__;
}

export function resetDemoStore() {
  globalThis.__OPSPILOT_DEMO_STORE__ = createDemoSnapshot();
  return globalThis.__OPSPILOT_DEMO_STORE__;
}
