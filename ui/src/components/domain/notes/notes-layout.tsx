import { Outlet } from '@tanstack/react-router';

/**
 * Layout for the notes section: renders child routes (list at /notes, detail at /notes/$id).
 */
export default function NotesLayout() {
    return (
        <div className='w-full h-full'>
            <Outlet />
        </div>
    );
}
