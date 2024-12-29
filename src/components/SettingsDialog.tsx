// src/components/SettingsDialog.tsx
import React, { useState } from 'react';
import { Settings } from 'lucide-react';

interface SettingsDialogProps {
  currentZoom: number;
  onSave: (newZoom: number) => Promise<void>;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  currentZoom,
  onSave
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [zoomValue, setZoomValue] = useState(currentZoom.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newZoom = parseInt(zoomValue, 10);
      if (isNaN(newZoom) || newZoom < 1 || newZoom > 100) {
        throw new Error('Zoom must be between 1 and 100');
      }
      await onSave(newZoom);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <button onClick={() => setIsOpen(true)}>
        <Settings className="h-5 w-5" />
      </button>
      
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-lg" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg mb-4">Settings</h2>
              <div className="mb-4">
                <label className="block mb-2">Default Zoom Level (1-100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={zoomValue}
                  onChange={(e) => setZoomValue(e.target.value)}
                  className="border p-2 w-full"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-500 text-white disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
