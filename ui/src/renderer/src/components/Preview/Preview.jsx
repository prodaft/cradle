import DOMPurify from 'dompurify';
import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { handleLinkClick } from '../../utils/textEditorUtils/textEditorUtils';
import AlertDismissible from '../AlertDismissible/AlertDismissible';

export default function Preview({ htmlContent, currentLine = 0, setCurrentLine = null }) {
  const sanitizedContent = DOMPurify.sanitize(htmlContent);
  const navigate = useNavigate();
  const previewRef = useRef(null);
  const preventScrollRef = useRef(false);
  const [alert, setAlert] = useState({ show: false, message: '', color: 'red' });
  const [isLoading, setIsLoading] = useState(true); // New state for loading spinner

  // Effect to hide the loading spinner when content is available
  useEffect(() => {
    if (htmlContent !== null) {
      setIsLoading(false); // Content is loaded, hide the spinner
    } else {
      setIsLoading(true); // Content is not loaded, show the spinner
    }
  }, [htmlContent]);


  const handleLineClick = (event) => {
    if (handleLinkClick(navigate)(event)) return;

    const targetElement = event.target.closest('[data-source-line]');
    if (targetElement && setCurrentLine) {
      const lineAttr = targetElement.getAttribute('data-source-line');
      const line = parseInt(lineAttr, 10);
      if (!isNaN(line)) {
        // Prevent the scroll effect triggered by currentLine updates.
        preventScrollRef.current = true;
        setCurrentLine(line);
      }
    }
  };

  useEffect(() => {
    if (preventScrollRef.current) {
      preventScrollRef.current = false;
      return;
    }
    if (!previewRef.current || currentLine === 0) return;

    // Get all elements with data-source-line.
    const elements = Array.from(previewRef.current.querySelectorAll('[data-source-line]'));
    if (elements.length === 0) return;

    // Find the element whose data-source-line is closest to currentLine.
    const lineNumbers = elements.map((el) => parseInt(el.getAttribute('data-source-line'), 10));
    const closestLine = lineNumbers.reduce((prev, curr) =>
      Math.abs(curr - currentLine) < Math.abs(prev - currentLine) ? curr : prev
    );

    const targetElement = previewRef.current.querySelector(`[data-source-line="${closestLine}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentLine, previewRef]);

  return (
    <>
      <AlertDismissible alert={alert} setAlert={setAlert} />
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="spinner-dot-pulse spinner-xl">
            <div className="spinner-pulse-dot"></div>
          </div>
        </div>
      ) : (
        <div
          className="h-full w-full p-4 bg-transparent prose max-w-none break-normal whitespace-normal dark:prose-invert overflow-y-auto rounded-lg flex-1 overflow-x-hidden"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          data-testid="preview"
          ref={previewRef}
          onClick={handleLineClick}
          id="preview-pane"
        ></div>
      )}
    </>
  );
}
