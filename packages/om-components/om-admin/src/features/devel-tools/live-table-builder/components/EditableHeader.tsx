/**
 * Editable Header Component for AG Grid
 * Provides inline editing of column headers
 */

import React, { useState, useRef, useEffect } from 'react';
import { TextField, IconButton } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { IHeaderParams } from 'ag-grid-community';

interface EditableHeaderParams extends IHeaderParams {
  onHeaderValueChange?: (newValue: string) => void;
}

export const EditableHeader: React.FC<EditableHeaderParams> = (params) => {
  const displayName = params.displayName || '';
  const onHeaderValueChange = (params as EditableHeaderParams).onHeaderValueChange;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(displayName);
  }, [displayName]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(displayName);
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== displayName && onHeaderValueChange) {
      onHeaderValueChange(trimmed);
    } else if (!trimmed) {
      // Revert to original if empty
      setEditValue(displayName);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(displayName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: 4, padding: '0 8px' }}>
        <TextField
          inputRef={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          size="small"
          variant="standard"
          sx={{
            flex: 1,
            '& .MuiInputBase-input': {
              padding: '4px 8px',
              fontSize: '14px',
            },
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        cursor: 'pointer',
        padding: '0 8px',
      }}
      onDoubleClick={handleStartEdit}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {displayName}
      </span>
      <IconButton
        size="small"
        onClick={handleStartEdit}
        sx={{ padding: '4px', marginLeft: '4px' }}
        title="Edit column name"
      >
        <EditIcon fontSize="small" />
      </IconButton>
    </div>
  );
};
