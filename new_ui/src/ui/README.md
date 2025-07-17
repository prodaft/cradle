# UI Components

This directory contains reusable UI components that are decoupled from specific business logic and can be used throughout the application.

## Editor Component

A pure code editor component built on top of CodeMirror 6, focused solely on editing functionality.

### Features

- **Multi-language support**: Currently supports markdown with extensibility for other languages
- **Theme support**: Light and dark themes
- **Scroll synchronization**: Built-in scroll event handling for synchronization with other components
- **Ref API**: Imperative API for external control of editor state
- **Flexible configuration**: Configurable line numbers, read-only mode, auto-focus, etc.
- **Pure editing**: No toolbar or UI chrome - just the editor

### Usage

```tsx
import { Editor, EditorRef } from "../ui";

const MyComponent = () => {
  const editorRef = useRef<EditorRef>(null);
  const [content, setContent] = useState("");

  return (
    <Editor
      ref={editorRef}
      value={content}
      onChange={setContent}
      onScroll={(scrollInfo) => console.log("Scroll:", scrollInfo)}
      language="markdown"
      theme="dark"
    />
  );
};
```

### Props

- `value`: Current editor content
- `onChange`: Called when content changes
- `onScroll`: Called when scroll position changes
- `language`: Programming language (currently 'markdown' only)
- `theme`: 'light' or 'dark'
- `placeholder`: Placeholder text
- `className`: Additional CSS classes
- `readOnly`: Whether editor is read-only
- `lineNumbers`: Whether to show line numbers
- `autoFocus`: Whether to auto-focus on mount

### Ref API

- `getContent()`: Get current editor content
- `setContent(content)`: Set editor content
- `getScrollInfo()`: Get current scroll position and percentage
- `scrollToPercentage(percentage)`: Scroll to specific percentage
- `focus()`: Focus the editor

## EditorToolbar Component

A separate toolbar component designed to work with the Editor component or standalone.

### Features

- **Dropdown menu**: Configurable dropdown with save, export, and settings actions
- **Preview button**: Optional send-to-preview button
- **Flexible styling**: Customizable appearance and layout

### Usage

```tsx
import { EditorToolbar } from "../ui";

const MyComponent = () => {
  return (
    <div className="flex flex-col h-full">
      <EditorToolbar
        onSave={() => console.log("Save")}
        onExport={() => console.log("Export")}
        onSettings={() => console.log("Settings")}
        onSendToPreview={() => console.log("Send to preview")}
        className="border-b"
      />
      <Editor value={content} onChange={setContent} className="flex-1" />
    </div>
  );
};
```

### Props

- `onSave`: Callback for save action
- `onExport`: Callback for export action
- `onSettings`: Callback for settings action
- `onSendToPreview`: Callback for send to preview action
- `className`: Additional CSS classes
- `showPreviewButton`: Whether to show the preview button (default: true)

### Integration with Tab System

Both components are designed to be easily integrated with the tab system while remaining completely decoupled. See `CodeEditorTab.tsx` for an example of how to:

1. Combine Editor and EditorToolbar in a layout
2. Handle event communication between editor and other tabs
3. Manage editor state within a tab context
4. Synchronize scroll position with preview tabs
5. Configure theme and language based on tab configuration
