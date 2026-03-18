import type { CheckoutStorage } from "./checkout-storage";
import type { TrackEventInput, CheckoutTrackingRecord } from "../types";

export class TrackingService {
  constructor(private storage: CheckoutStorage) {}

  async track(input: TrackEventInput): Promise<CheckoutTrackingRecord> {
    return this.storage.trackEvent(input);
  }

  async getSessionFunnel(sessionId: string): Promise<CheckoutTrackingRecord[]> {
    return this.storage.getSessionEvents(sessionId);
  }
}
