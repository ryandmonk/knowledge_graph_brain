import React, { useEffect, useRef } from 'react';
import { SelectionState } from './SelectionManager';

interface ContextMenuProps {
  selection: SelectionState;
  onAction: (action: string, targetId: string, targetType: 'node' | 'edge') => void;
  onClose: () => void;
}

interface MenuAction {
  id: string;
  label: string;
  icon?: string;
  disabled?: boolean;
  separator?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  selection,
  onAction,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Node-specific actions
  const nodeActions: MenuAction[] = [
    { id: 'focus', label: 'Focus on Node', icon: '🎯' },
    { id: 'expand', label: 'Expand Connections', icon: '📈' },
    { id: 'hide', label: 'Hide Node', icon: '👁️' },
    { separator: true, id: 'sep1', label: '' },
    { id: 'properties', label: 'Properties', icon: '📋' },
    { id: 'copy-id', label: 'Copy ID', icon: '📋' },
    { separator: true, id: 'sep2', label: '' },
    { id: 'delete', label: 'Delete Node', icon: '🗑️' }
  ];

  // Edge-specific actions
  const edgeActions: MenuAction[] = [
    { id: 'highlight-path', label: 'Highlight Path', icon: '🔗' },
    { id: 'hide', label: 'Hide Edge', icon: '👁️' },
    { separator: true, id: 'sep1', label: '' },
    { id: 'properties', label: 'Properties', icon: '📋' },
    { id: 'copy-id', label: 'Copy ID', icon: '📋' },
    { separator: true, id: 'sep2', label: '' },
    { id: 'delete', label: 'Delete Edge', icon: '🗑️' }
  ];

  // Handle action clicks
  const handleAction = (actionId: string) => {
    if (!selection.contextMenu.targetId || !selection.contextMenu.type) return;
    
    onAction(actionId, selection.contextMenu.targetId, selection.contextMenu.type);
    onClose();
  };

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (selection.contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selection.contextMenu.visible, onClose]);

  // Position menu to stay within viewport
  const getMenuStyle = (): React.CSSProperties => {
    const { x, y } = selection.contextMenu;
    const menuWidth = 200;
    const menuHeight = 300;
    
    let left = x;
    let top = y;

    // Adjust position to stay within viewport
    if (x + menuWidth > window.innerWidth) {
      left = x - menuWidth;
    }
    if (y + menuHeight > window.innerHeight) {
      top = y - menuHeight;
    }

    return {
      position: 'fixed',
      left: `${Math.max(0, left)}px`,
      top: `${Math.max(0, top)}px`,
      zIndex: 1000
    };
  };

  if (!selection.contextMenu.visible) {
    return null;
  }

  const actions = selection.contextMenu.type === 'node' ? nodeActions : edgeActions;
  const targetType = selection.contextMenu.type;
  const targetId = selection.contextMenu.targetId;

  return (
    <div
      ref={menuRef}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-2 min-w-[180px]"
      style={getMenuStyle()}
    >
      {/* Menu Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {targetType === 'node' ? '🔵 Node' : '🔗 Edge'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {targetId}
        </div>
      </div>

      {/* Menu Actions */}
      <div className="py-1">
        {actions.map((action) => {
          if (action.separator) {
            return (
              <div
                key={action.id}
                className="h-px bg-gray-200 dark:bg-gray-600 my-1"
              />
            );
          }

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={action.disabled}
              className={`
                w-full text-left px-3 py-2 text-sm flex items-center gap-2
                hover:bg-gray-100 dark:hover:bg-gray-700
                disabled:opacity-50 disabled:cursor-not-allowed
                ${action.disabled 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-700 dark:text-gray-200'
                }
              `}
            >
              {action.icon && (
                <span className="text-base">{action.icon}</span>
              )}
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Selection Info */}
      {(selection.selectedNodes.size > 0 || selection.selectedEdges.size > 0) && (
        <>
          <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
            Selected: {selection.selectedNodes.size} nodes, {selection.selectedEdges.size} edges
          </div>
        </>
      )}
    </div>
  );
};

export default ContextMenu;
