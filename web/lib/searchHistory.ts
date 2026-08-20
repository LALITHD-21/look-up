export interface SearchHistoryItem {
  epic: string;
  name?: string;
  timestamp: number;
}

const STORAGE_KEY = 'elector_lookup_recent_searches_v1';
const MAX_HISTORY_ITEMS = 8;

export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveSearchHistoryItem(epic: string, name?: string): SearchHistoryItem[] {
  if (typeof window === 'undefined' || !epic) return [];
  try {
    const current = getSearchHistory();
    // Filter out existing matching epic
    const filtered = current.filter(item => item.epic.toUpperCase() !== epic.toUpperCase());
    
    // Add new item to the top
    const newItem: SearchHistoryItem = {
      epic: epic.toUpperCase(),
      name: name || undefined,
      timestamp: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
