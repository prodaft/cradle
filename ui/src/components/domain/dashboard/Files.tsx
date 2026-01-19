import FilesList from '@components/domain/files/FilesList';
import { useMemo } from 'react';

interface FilesProps {
    obj: {
        id?: number; // Entry ID (BigAutoField)
        type?: string;
        [key: string]: any;
    };
}

/**
 * Files component
 * Displays files related to an artifact
 * Uses the FilesList component to display files
 *
 * @param {FilesProps} props
 * @returns {JSX.Element}
 */
export default function Files({ obj }: FilesProps) {
    const query = useMemo(
        () =>
            obj?.id
                ? {
                      linked_to: obj.id,
                      linked_to_exact_match: true,
                  }
                : undefined,
        [obj?.id],
    );

    return (
        <div className='w-full h-full'>
            <FilesList query={query} />
        </div>
    );
}
