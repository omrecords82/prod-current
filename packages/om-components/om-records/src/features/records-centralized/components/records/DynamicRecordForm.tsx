import React from 'react';

interface DynamicRecordFormProps {
  churchId: string;
  tableName: string;
  onSave: (record: any) => void;
  onCancel: () => void;
}

const DynamicRecordForm = ({ churchId, tableName, onSave, onCancel }: DynamicRecordFormProps) => {
  return (
    <div>
      <h3>Dynamic Record Form</h3>
      <p>Church ID: {churchId}</p>
      <p>Table: {tableName}</p>
      <button onClick={() => onSave({})}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default DynamicRecordForm;
