import { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import useLightMode from '../../hooks/useLightMode/useLightMode';
import useNavbarContents from '../../hooks/useNavbarContents/useNavbarContents';
import NavbarButton from '../NavbarButton/NavbarButton';
import { FloppyDisk } from 'iconoir-react/regular';
import DOMPurify from 'dompurify';
import AlertDismissible from '../AlertDismissible/AlertDismissible';
import Editor from '../Editor/Editor';
import Preview from '../Preview/Preview';
import useChangeFlexDirectionBySize from '../../hooks/useChangeFlexDirectionBySize/useChangeFlexDirectionBySize';
import { updateNote, getNote } from '../../services/notesService/notesService';
import { displayError } from '../../utils/responseUtils/responseUtils';
import { parseWorker } from '../../utils/customParser/customParser';

/**
 * Component for creating new Notes and editing existing fleeting Notes.
 * (Features: editor, preview, auto-save, etc.)
 *
 * @function NoteEditor
 * @param {Object} props
 * @param {number} [props.autoSaveDelay=1000] - The delay (ms) before auto-saving
 * @returns {JSX.Element}
 */
export default function NoteEditor({ autoSaveDelay = 1000 }) {
  const [markdownContent, setMarkdownContent] = useState('');
  const markdownContentRef = useRef(markdownContent);
  const textEditorRef = useRef(null);
  const auth = useAuth();
  const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
  const navigate = useNavigate();
  const isLightMode = useLightMode();
  const { id } = useParams();
  const [fileData, setFileData] = useState([]);
  const fileDataRef = useRef(fileData);
  const [parsedContent, setParsedContent] = useState('');
  const flexDirection = useChangeFlexDirectionBySize(textEditorRef);
  const [previewCollapsed, setPreviewCollapsed] = useState(
    localStorage.getItem('preview.collapse') === 'true'
  );
  const [worker, setWorker] = useState(null);

  // Track whether a parse request is in progress.
  const [isParsing, setIsParsing] = useState(false);
  // If new markdown arrives while parsing, mark that a new request is pending.
  const pendingParseRef = useRef(false);

  // Create the worker on mount and do the initial parse.
  useEffect(() => {
    const workerInstance = parseWorker();
    workerInstance.onmessage = (event) => {
      if (event.data.html) {
        setParsedContent(DOMPurify.sanitize(event.data.html));
      }

      // If new content arrived while parsing, trigger an immediate update.
      if (pendingParseRef.current) {
        pendingParseRef.current = false;
        setIsParsing(true);
        workerInstance.postMessage({ markdown: markdownContent, fileData });
      } else {
        // Mark parsing as complete.
        setIsParsing(false);
      }
    };
    setWorker(workerInstance);
    workerInstance.postMessage({ markdown: markdownContent, fileData });
    setIsParsing(true);
  }, []);

  // Whenever markdownContent or fileData changes, either send a new parse
  // request (if the worker is idle) or mark that a new request is pending.
  useEffect(() => {
    if (worker) {
      if (!isParsing) {
        setIsParsing(true);
        worker.postMessage({ markdown: markdownContent, fileData });
      } else {
        pendingParseRef.current = true;
      }
    }
  }, [markdownContent, fileData, worker]);

  // Keep the markdownContent ref up-to-date.
  useEffect(() => {
    markdownContentRef.current = markdownContent;
  }, [markdownContent]);

  // Load note content when the id changes.
  useEffect(() => {
    getNote(id, false)
      .then((response) => {
        setMarkdownContent(response.data.content);
        setFileData(response.data.files);
      })
      .catch(displayError(setAlert, navigate));
  }, [id, setMarkdownContent, setFileData, setAlert, navigate]);

  // Keep the fileData ref up-to-date.
  useEffect(() => {
    fileDataRef.current = fileData;
  }, [fileData]);

  // Validate that the note is not empty.
  const isValidContent = () =>
    markdownContentRef.current && markdownContentRef.current.trim();

  const validateContent = () => {
    if (isValidContent()) {
      return true;
    } else {
      setAlert({ show: true, message: 'Cannot save empty note.', color: 'red' });
      return false;
    }
  };

  // Save the note (either new or updating an existing note).
  const handleSaveNote = (displayAlert) => {
    if (!validateContent()) return;

    const storedContent = markdownContentRef.current;
    const storedFileData = fileDataRef.current;

    updateNote(id, { content: storedContent, files: storedFileData })
      .then((response) => {
        if (response.status === 200) {
          if (displayAlert) {
            setAlert({
              show: true,
              message: displayAlert,
              color: 'green',
            });
          }
          navigate(`/notes/${response.data.id}`);
        }
      })
      .catch(displayError(setAlert, navigate));
  };

  const previewCollapseUpdated = (collapsed) => {
    setPreviewCollapsed(collapsed);
    localStorage.setItem('preview.collapse', collapsed);
  };

  // Set navbar contents.
  useNavbarContents(
    [
      <NavbarButton
        key="editor-save-btn"
        icon={<FloppyDisk />}
        text={'Save'}
        onClick={() => handleSaveNote('Changes saved successfully.')}
      />,
    ],
    [auth, id]
  );

  return (
    <div
      className={`w-full h-full rounded-md flex p-1.5 gap-1.5 ${
        flexDirection === 'flex-col' ? 'flex-col' : 'flex-row'
      } overflow-y-hidden relative`}
      ref={textEditorRef}
    >
      <AlertDismissible alert={alert} setAlert={setAlert} />
      <div className={`${flexDirection === 'flex-col' ? 'h-1/2' : 'h-full'} w-full bg-gray-2 rounded-md`}>
        <Editor
          markdownContent={markdownContent}
          setMarkdownContent={setMarkdownContent}
          isLightMode={isLightMode}
          fileData={fileData}
          setFileData={setFileData}
          viewCollapsed={previewCollapsed}
          setViewCollapsed={previewCollapseUpdated}
        />
      </div>
      {!previewCollapsed && (
        <div
          className={`${flexDirection === 'flex-col' ? 'h-1/2' : 'h-full'} w-full bg-gray-2 rounded-md relative`}
        >
          {/* Render the preview */}
          <Preview htmlContent={parsedContent} />
          {/* Overlay a spinner while parsing is in progress */}
          {isParsing && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
              <div className="animate-spin rounded-full border-8 border-t-8 border-gray-200 h-16 w-16"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
