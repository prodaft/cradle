import { useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

export interface EditorRef {
  getContent: () => string;
  setContent: (content: string) => void;
  getScrollInfo: () => { scrollTop: number; scrollPercentage: number };
  scrollToPercentage: (percentage: number) => void;
  focus: () => void;
}

export interface EditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onScroll?: (scrollInfo: { scrollTop: number; scrollPercentage: number }) => void;
  theme?: any;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  autoFocus?: boolean;
}

const Editor = forwardRef<EditorRef, EditorProps>(({
  value = '',
  onChange,
  onScroll,
  theme = null,
  placeholder = 'Start typing...',
  className = '',
  readOnly = false,
  lineNumbers = true,
  autoFocus = false
}, ref) => {
  const editorRef = useRef<any>(null);

  // Get language extension based on prop
  const getLanguageExtension = () => {
      return markdown();
  };

  // Get theme based on prop
  const getTheme = () => {
    return theme ? theme : oneDark;
  };

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    getContent: () => value,
    setContent: (content: string) => {
      onChange?.(content);
    },
    getScrollInfo: () => {
      if (editorRef.current?.view) {
        const scrollDOM = editorRef.current.view.scrollDOM;
        const scrollTop = scrollDOM.scrollTop;
        const scrollPercentage = scrollTop / (scrollDOM.scrollHeight - scrollDOM.clientHeight) || 0;
        return { scrollTop, scrollPercentage };
      }
      return { scrollTop: 0, scrollPercentage: 0 };
    },
    scrollToPercentage: (percentage: number) => {
      if (editorRef.current?.view) {
        const scrollDOM = editorRef.current.view.scrollDOM;
        const maxScroll = scrollDOM.scrollHeight - scrollDOM.clientHeight;
        scrollDOM.scrollTop = maxScroll * percentage;
      }
    },
    focus: () => {
      editorRef.current?.view?.focus();
    }
  }), [value, onChange]);

  const handleContentChange = useCallback((newValue: string) => {
    onChange?.(newValue);
  }, [onChange]);

  const handleScrollSync = useCallback(() => {
    if (editorRef.current?.view && onScroll) {
      const scrollDOM = editorRef.current.view.scrollDOM;
      const scrollTop = scrollDOM.scrollTop;
      const scrollPercentage = scrollTop / (scrollDOM.scrollHeight - scrollDOM.clientHeight) || 0;
      
      onScroll({ scrollTop, scrollPercentage });
    }
  }, [onScroll]);

  // Create extensions array
  const extensions = [
    getLanguageExtension(),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        // Content changed - handled by onChange
      }
      if (update.geometryChanged || update.viewportChanged) {
        // Scroll changed
        handleScrollSync();
      }
    }),
    EditorView.theme({
      "&": {
        height: "100%",
        flex: "1"
      },
      ".cm-scroller": {
        fontFamily: "monospace",
        fontSize: "14px"
      },
      ".cm-focused": {
        outline: "none"
      },
      ".cm-editor": {
        height: "100%"
      }
    }),
    ...(readOnly ? [EditorView.editable.of(false)] : [])
  ];

  return (
    <div className={`editor-component h-full ${className}`}>
      <CodeMirror
        ref={editorRef}
        value={value}
        onChange={handleContentChange}
        extensions={extensions}
        theme={getTheme()}
        placeholder={placeholder}
        className="h-full"
        readOnly={readOnly}
        autoFocus={autoFocus}
        basicSetup={{
          lineNumbers,
          foldGutter: true,
          dropCursor: false,
          allowMultipleSelections: false,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          highlightSelectionMatches: false,
          searchKeymap: true
        }}
      />
    </div>
  );
});

Editor.displayName = 'Editor';

export default Editor;
