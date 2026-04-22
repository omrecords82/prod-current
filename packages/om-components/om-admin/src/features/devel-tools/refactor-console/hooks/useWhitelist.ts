import { useCallback, useState } from 'react';
import { WhitelistEntry } from '@/types/refactorConsole';

const STORAGE_KEY = 'refactor-console-whitelist';

const loadWhitelist = (): Map<string, WhitelistEntry> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const entries: WhitelistEntry[] = JSON.parse(raw);
    return new Map(entries.map(e => [e.relPath, e]));
  } catch {
    return new Map();
  }
};

const saveWhitelist = (map: Map<string, WhitelistEntry>) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.values())));
};

export interface UseWhitelistReturn {
  whitelist: Map<string, WhitelistEntry>;
  isWhitelisted: (relPath: string) => boolean;
  addToWhitelist: (relPath: string, reason?: string) => void;
  removeFromWhitelist: (relPath: string) => void;
  toggleWhitelist: (relPath: string, reason?: string) => void;
  addMultiple: (relPaths: string[], reason?: string) => void;
  clearWhitelist: () => void;
  whitelistCount: number;
}

export const useWhitelist = (): UseWhitelistReturn => {
  const [whitelist, setWhitelist] = useState<Map<string, WhitelistEntry>>(loadWhitelist);

  const isWhitelisted = useCallback((relPath: string) => {
    return whitelist.has(relPath);
  }, [whitelist]);

  const addToWhitelist = useCallback((relPath: string, reason?: string) => {
    setWhitelist(prev => {
      const next = new Map(prev);
      next.set(relPath, {
        relPath,
        addedAt: new Date().toISOString(),
        reason,
      });
      saveWhitelist(next);
      return next;
    });
  }, []);

  const removeFromWhitelist = useCallback((relPath: string) => {
    setWhitelist(prev => {
      const next = new Map(prev);
      next.delete(relPath);
      saveWhitelist(next);
      return next;
    });
  }, []);

  const toggleWhitelist = useCallback((relPath: string, reason?: string) => {
    setWhitelist(prev => {
      const next = new Map(prev);
      if (next.has(relPath)) {
        next.delete(relPath);
      } else {
        next.set(relPath, {
          relPath,
          addedAt: new Date().toISOString(),
          reason,
        });
      }
      saveWhitelist(next);
      return next;
    });
  }, []);

  const addMultiple = useCallback((relPaths: string[], reason?: string) => {
    setWhitelist(prev => {
      const next = new Map(prev);
      const now = new Date().toISOString();
      relPaths.forEach(relPath => {
        next.set(relPath, { relPath, addedAt: now, reason });
      });
      saveWhitelist(next);
      return next;
    });
  }, []);

  const clearWhitelist = useCallback(() => {
    setWhitelist(new Map());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    whitelist,
    isWhitelisted,
    addToWhitelist,
    removeFromWhitelist,
    toggleWhitelist,
    addMultiple,
    clearWhitelist,
    whitelistCount: whitelist.size,
  };
};
