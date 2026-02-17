import DeleteNote from '@components/domain/notes/delete-note';
import NotesList from '@components/domain/notes/notes-list';
import { useEffect, useRef, useState } from 'react';

interface SearchFilters {
    content: string;
    linked_to?: number; // Entry ID (BigAutoField)
    linked_to_exact_match?: boolean;
}

interface NotesProps {
    obj: {
        id?: number;
        type?: string;
        [key: string]: any;
    };
}

export default function Notes({ obj }: NotesProps) {
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        linked_to: obj?.id,
        content: '',
    });
    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters | null>({
        linked_to: obj?.id,
        content: '',
    });
    const searchFiltersRef = useRef(searchFilters);
    useEffect(() => {
        searchFiltersRef.current = searchFilters;
    }, [searchFilters]);

    // On load, fetch the dashboard data for the entry
    useEffect(() => {
        if (!obj?.id) return;
        setSearchFilters((prev) => {
            if (prev.linked_to === obj.id) return prev;
            return { ...prev, linked_to: obj.id };
        });
        setSubmittedFilters((prev) => {
            if (prev && prev.linked_to === obj.id) return prev;
            return { ...(prev ?? searchFiltersRef.current), linked_to: obj.id };
        });
    }, [obj?.id]);

    const handleSearchSubmit = (value?: string) => {
        const next = {
            ...searchFiltersRef.current,
            content: value ?? searchFiltersRef.current.content,
        };
        setSubmittedFilters(next);
    };

    const handleSearchChange = (value: string) => {
        setSearchFilters((prev) => ({ ...prev, content: value }));
    };

    return (
        <div className='flex flex-col h-full'>
            {submittedFilters && (
                <NotesList
                    query={submittedFilters}
                    noteActions={[{ Component: DeleteNote, props: {} }]}
                    hideFleetingNotes={true}
                    contentSearch={{
                        value: searchFilters.content,
                        onChange: handleSearchChange,
                        onSubmit: handleSearchSubmit,
                    }}
                />
            )}
        </div>
    );
}
