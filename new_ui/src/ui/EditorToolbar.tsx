import React, { useCallback } from 'react';
import { ButtonToolbar, Dropdown, IconButton } from 'rsuite';
import { VscPlay, VscKebabVertical } from 'react-icons/vsc';

export interface EditorToolbarProps {
  onSave?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  onSendToPreview?: () => void;
  className?: string;
  showPreviewButton?: boolean;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onSave,
  onExport,
  onSettings,
  onSendToPreview,
  className = '',
  showPreviewButton = true
}) => {
  const handleSendToPreview = useCallback(() => {
    onSendToPreview?.();
  }, [onSendToPreview]);

  return (
    <div className={`editor-toolbar flex justify-between items-center px-3 py-1 flex-shrink-0 ${className}`}>
      <ButtonToolbar>
        <Dropdown
          renderToggle={(props, ref) => (
            <IconButton
              {...props}
              ref={ref}
              icon={<VscKebabVertical className="text-lg" />}
              size="sm"
              appearance="subtle"
              title="More options"
              className="border-none bg-transparent text-gray-600 shadow-none"
            />
          )}
        >
          {onSave && (
            <Dropdown.Item onClick={onSave}>Save</Dropdown.Item>
          )}
          {onExport && (
            <Dropdown.Item onClick={onExport}>Export</Dropdown.Item>
          )}
          {(onSave || onExport) && onSettings && (
            <Dropdown.Separator />
          )}
          {onSettings && (
            <Dropdown.Item onClick={onSettings}>Settings</Dropdown.Item>
          )}
        </Dropdown>
      </ButtonToolbar>

      {showPreviewButton && onSendToPreview && (
        <ButtonToolbar>
          <IconButton
            icon={<VscPlay className="text-green-600" />}
            size="sm"
            appearance="subtle"
            onClick={handleSendToPreview}
            title="Send to preview"
            className="border-none bg-transparent text-green-600 shadow-none"
          />
        </ButtonToolbar>
      )}
    </div>
  );
};

export default EditorToolbar;
