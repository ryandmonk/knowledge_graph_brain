import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  context?: string;
  preventDefault?: boolean;
}

export interface KeyboardShortcutOptions {
  enabled?: boolean;
  context?: string;
}

/**
 * Custom hook for managing global keyboard shortcuts
 * Follows existing codebase patterns and provides extensible shortcut system
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: KeyboardShortcutOptions = {}
) {
  const { enabled = true, context = 'global' } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Skip if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Allow Escape key to work even in inputs
        if (event.key !== 'Escape') return;
      }

      // Find matching shortcut
      const matchingShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
        const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
        const metaMatch = !!shortcut.metaKey === event.metaKey;
        const altMatch = !!shortcut.altKey === event.altKey;
        const shiftMatch = !!shortcut.shiftKey === event.shiftKey;

        // Check context compatibility
        const contextMatch = !shortcut.context || shortcut.context === context;

        return keyMatch && ctrlMatch && metaMatch && altMatch && shiftMatch && contextMatch;
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault !== false) {
          event.preventDefault();
          event.stopPropagation();
        }
        matchingShortcut.action();
      }
    },
    [enabled, context]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  return {
    shortcuts: shortcutsRef.current,
    context,
    enabled
  };
}

/**
 * Hook for managing context-specific shortcuts (e.g., modal shortcuts)
 */
export function useContextualShortcuts(
  shortcuts: KeyboardShortcut[],
  isActive: boolean,
  context: string
) {
  return useKeyboardShortcuts(shortcuts, {
    enabled: isActive,
    context
  });
}

/**
 * Helper function to format shortcut key combination for display
 */
export function formatShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  // Use proper platform modifier key symbol
  const isMac = navigator.platform.toLowerCase().includes('mac');
  
  if (shortcut.ctrlKey) parts.push(isMac ? '⌃' : 'Ctrl');
  if (shortcut.metaKey) parts.push(isMac ? '⌘' : '⊞');
  if (shortcut.altKey) parts.push(isMac ? '⌥' : 'Alt');
  if (shortcut.shiftKey) parts.push(isMac ? '⇧' : 'Shift');
  
  // Format key display
  let keyDisplay = shortcut.key;
  switch (shortcut.key.toLowerCase()) {
    case 'escape':
      keyDisplay = 'Esc';
      break;
    case 'enter':
      keyDisplay = '↵';
      break;
    case 'arrowup':
      keyDisplay = '↑';
      break;
    case 'arrowdown':
      keyDisplay = '↓';
      break;
    case 'arrowleft':
      keyDisplay = '←';
      break;
    case 'arrowright':
      keyDisplay = '→';
      break;
    case ' ':
      keyDisplay = 'Space';
      break;
    default:
      keyDisplay = shortcut.key.toUpperCase();
  }
  
  parts.push(keyDisplay);
  return parts.join(isMac ? '' : '+');
}

/**
 * Common keyboard shortcuts used across the application
 */
export const COMMON_SHORTCUTS = {
  SEARCH: { key: 'k', ctrlKey: true, metaKey: true },
  ESCAPE: { key: 'Escape' },
  HELP: { key: 'F1' },
  QUERY_MODAL: { key: 'q', altKey: true },
  CONNECTOR_BUILDER: { key: 'c', altKey: true },
  REFRESH: { key: 'r', ctrlKey: true, metaKey: true },
  SAVE: { key: 's', ctrlKey: true, metaKey: true }
} as const;
