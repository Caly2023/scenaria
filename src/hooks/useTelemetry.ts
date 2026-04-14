import { useState, useEffect } from 'react';
import { telemetryService, TelemetryStatus } from '../services/telemetryService';

/**
 * Reactive hook to subscribe to the global telemetry status.
 * Used to display AI agent progress and system events in the UI.
 */
export function useTelemetry() {
  const [status, setStatus] = useState<TelemetryStatus | null>(telemetryService.currentStatus);

  useEffect(() => {
    telemetryService.onStatusChange((newStatus) => {
      setStatus(newStatus ? { ...newStatus } : null);
    });
    
    // Cleanup is handled by telemetryService.onStatusChange(null) 
    // but the service only supports one subscriber currently.
  }, []);

  return status;
}
