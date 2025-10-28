import { useEffect, useState } from 'react';
import useApi from '../../hooks/useApi/useApi';
import useAuth from '../../hooks/useAuth/useAuth';
import { parseContent } from '../../utils/textEditorUtils/textEditorUtils';
import Preview from '../Preview/Preview';

/**
 * NotePreviewContent - Handles async parsing and rendering of note content for tooltips
 * @param {Object} props
 * @param {Object} props.note - The note object to preview
 * @returns {JSX.Element}
 */
export const NotePreviewContent = ({ note }) => {
  const [parsedContent, setParsedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const { entriesApi, fileTransferApi } = useApi();
  const { basePath } = useAuth();

  useEffect(() => {
    parseContent(note.content, entriesApi, fileTransferApi, basePath, note.files)
      .then((result) => {
        setParsedContent(result.html);
        setLoading(false);
      })
      .catch(() => {
        setParsedContent('<p>Error loading preview</p>');
        setLoading(false);
      });
  }, [note.content, note.files, entriesApi, fileTransferApi, basePath]);

  return (
    <div className="w-[450px] max-h-[450px] overflow-hidden">
      {loading ? (
        <div className='flex items-center justify-center h-32'>
          <div className='spinner-dot-pulse'>
            <div className='spinner-pulse-dot'></div>
          </div>
        </div>
      ) : (
        <div className='max-h-[450px] overflow-y-auto cradle-scrollbar'>
          <Preview htmlContent={parsedContent} />
        </div>
      )}
    </div>
  );
};

export default NotePreviewContent;

