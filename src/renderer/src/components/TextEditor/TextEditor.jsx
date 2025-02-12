import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../../hooks/useTheme/useTheme';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Editor from '../Editor/Editor';
import Preview from '../Preview/Preview';

// === New imports for worker-based parsing ===
import DOMPurify from 'dompurify';
import { parseWorker } from '../../utils/customParser/customParser'; // The same approach as in NoteEditor
import ResizableSplitPane from '../ResizableSplitPane/ResizableSplitPane';

export default function TextEditor({noteid, markdownContent, setMarkdownContent, fileData = [], setFileData}) {
    const markdownContentRef = useRef(markdownContent);
    const fileDataRef = useRef(fileData);

    const textEditorDivRef = useRef(null);
    const resizeRef = useRef(null);
    const [isResizing, setIsResizing] = useState(false);
    const [splitPosition, setSplitPosition] = useState(
        Number(localStorage.getItem('editor.splitPosition')) || 50
    );
    const [lastPosition, setLastPosition] = useState(splitPosition);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
    const { isDarkMode, toggleTheme } = useTheme();
    const [parsedContent, setParsedContent] = useState('');
    const [previewCollapsed, setPreviewCollapsed] = useState(
        localStorage.getItem('preview.collapse') === 'true'
    );
    const [worker, setWorker] = useState(null);
    const [isParsing, setIsParsing] = useState(false);
    const pendingParseRef = useRef(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            e.preventDefault();

            const container = textEditorDivRef.current;
            if (!container) return;

            const containerRect = container.getBoundingClientRect();
            let newPosition = isMobile
                ? ((e.clientY - containerRect.top) / containerRect.height) * 100
                : ((e.clientX - containerRect.left) / containerRect.width) * 100;

            newPosition = Math.min(Math.max(newPosition, 20), 80);
            requestAnimationFrame(() => {
                setSplitPosition(newPosition);
                localStorage.setItem('editor.splitPosition', newPosition);
            });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.classList.remove('select-none');
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.classList.add('select-none');
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isMobile]);

    useEffect(() => {
        const workerInstance = parseWorker();

        workerInstance.onmessage = (event) => {
            if (event.data.html) {
                setParsedContent(DOMPurify.sanitize(event.data.html));
            }

            if (pendingParseRef.current) {
                pendingParseRef.current = false;
                workerInstance.postMessage({
                    markdown: markdownContentRef.current,
                    fileData: fileDataRef.current
                });
            } else {
                setIsParsing(false);
            }
        };

        setWorker(workerInstance);

        if (markdownContentRef.current.trim() !== '') {
            setIsParsing(true);
            workerInstance.postMessage({
                markdown: markdownContentRef.current,
                fileData: fileDataRef.current
            });
        }

        // Cleanup on unmount
        return () => {
            workerInstance.terminate();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!worker) return;

        // If preview is collapsed, we don't parse anything
        if (previewCollapsed) {
            setParsedContent('');
            return;
        }

        if (!isParsing) {
            // If no parse in progress, start it immediately
            setIsParsing(true);
            worker.postMessage({
                markdown: markdownContent,
                fileData
            });
        } else {
            // If a parse is in progress, flag it for a rerun after current parse
            pendingParseRef.current = true;
        }
    }, [markdownContent, fileData, previewCollapsed, worker]);

    useEffect(() => {
        markdownContentRef.current = markdownContent;
    }, [markdownContent]);

    useEffect(() => {
        fileDataRef.current = fileData;
    }, [fileData]);

    const previewCollapseUpdated = (collapsed) => {
        setPreviewCollapsed(collapsed);
        localStorage.setItem('preview.collapse', collapsed);
        if (!collapsed) {
          setSplitPosition(lastPosition);
        } else {
          setSplitPosition(100);
        }
    };

    return (
      <div className="w-full h-full p-1.5">
        <AlertDismissible alert={alert} setAlert={setAlert} />
        <ResizableSplitPane
          orientation={isMobile ? 'vertical' : 'horizontal'}
          initialSplitPosition={splitPosition}
          showRightPane={!previewCollapsed}
          onSplitChange={(newPosition) => {
            setSplitPosition(newPosition);
            localStorage.setItem('editor.splitPosition', newPosition);
          }}
          leftContent={
            <Editor
              noteid={noteid}
              markdownContent={markdownContent}
              setMarkdownContent={setMarkdownContent}
              isDarkMode={isDarkMode}
              fileData={fileData}
              setFileData={setFileData}
              viewCollapsed={previewCollapsed}
              setViewCollapsed={previewCollapseUpdated}
            />
          }
          rightContent={
            <Preview htmlContent={parsedContent}>
              {isParsing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
                  <div className="animate-spin rounded-full border-8 border-t-8 border-gray-400 h-16 w-16" />
                </div>
              )}
            </Preview>
          }
        />
      </div>
    );
}
