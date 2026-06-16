
import { useState, useEffect } from 'react';

export const useBackendStatus = (endpoint: string) => {
  const [status, setStatus] = useState<'ONLINE' | 'OFFLINE' | 'UNKNOWN'>('UNKNOWN');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${endpoint}/health`, { 
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        setStatus(res.ok ? 'ONLINE' : 'OFFLINE');
      } catch {
        setStatus('OFFLINE');
      }
    };
    checkHealth();
  }, [endpoint]);

  return { status, setStatus };
};
