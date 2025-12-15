import DeleteNote from '@components/domain/notes/DeleteNote';
import NotesList from '@components/domain/notes/NotesList';
import { useEffect, useState } from 'react';

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
        content: '',
    });
    const [submittedFilters, setSubmittedFilters] = useState<SearchFilters | null>(
        null,
    );

    // On load, fetch the dashboard data for the entry
    useEffect(() => {
        if (!obj) return;
        setSearchFilters((prev) => ({
            ...prev,
            ['linked_to']: obj.id,
        }));

        setSubmittedFilters({
            ...searchFilters,
            ['linked_to']: obj.id,
        });
    }, [obj]);

    const handleSearchSubmit = () => {
        setSubmittedFilters(searchFilters);
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
