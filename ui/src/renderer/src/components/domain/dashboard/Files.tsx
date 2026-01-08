import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import useCradleNavigate from '@/hooks/navigation/useCradleNavigate';
import { Card, CardContent } from '@/components/ui/card';
import FilesList from '@components/domain/files/FilesList';
import { Search } from 'iconoir-react';
import { ChangeEvent, FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

interface SearchFilters {
    linked_to: number | string; // Entry ID (number) or empty string
    entity_type: string;
    keyword: string;
    mimetype: string;
}

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
    const { navigate, navigateLink } = useCradleNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        linked_to: obj?.id || '',
        entity_type: obj?.type || '',
        keyword: '',
        mimetype: '',
    });

    // Error handler function
    const handleError = (error: any) => {
        toast.error(error.response?.data?.detail || 'An error occurred');
    };

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSearchFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Reset page to 1 when search is submitted
        const newParams = new URLSearchParams(searchParams);
        newParams.set('page', '1');
        setSearchParams(newParams);
    };

    // Prepare the query for FilesList
    const query = {
        ...searchFilters,
    };

    return (
        <div className='w-full h-full flex flex-col gap-4'>
            <Card className='cradle-card-compact'>
                <CardContent className='p-3'>
                    <form
                        onSubmit={handleSearchSubmit}
                        className='flex items-center gap-4 w-full'
                    >
                    <div className='relative flex-grow'>
                        <input
                            type='text'
                            name='keyword'
                            value={searchFilters.keyword}
                            onChange={handleSearchChange}
                            placeholder='Search files by name or hash...'
                            className='w-full bg-transparent border border-cradle-border-accent hover:border-cradle-accent-primary text-cradle-text-primary rounded-full px-4 pr-10 h-10 outline-none transition-colors'
                        />
                        <Button
                            type='submit'
                            variant='ghost'
                            size='icon-sm'
                            className='absolute right-3 top-1/2 transform -translate-y-1/2 text-cradle-text-secondary hover:text-cradle-text-primary'
                        >
                            <Search width={16} height={16} />
                        </Button>
                    </div>

                    <div className='w-80'>
                        <input
                            type='text'
                            name='mimetype'
                            value={searchFilters.mimetype}
                            onChange={handleSearchChange}
                            placeholder='MIME Type'
                            className='w-full bg-transparent border border-cradle-border-accent hover:border-cradle-accent-primary text-cradle-text-primary rounded-full px-4 h-10 outline-none transition-colors'
                        />
                    </div>
                </form>
                </CardContent>
            </Card>

            <FilesList query={query} onError={handleError} />
        </div>
    );
}
