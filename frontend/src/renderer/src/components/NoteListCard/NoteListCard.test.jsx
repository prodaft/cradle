/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import NoteListCard from './NoteListCard';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../utils/textEditorUtils/textEditorUtils', () => ({
    parseContent: jest.fn().mockResolvedValue('<p>Mocked parsed content</p>'),
}));

jest.mock('../../utils/responseUtils/responseUtils', () => ({
    displayError: jest.fn(),
}));

describe('NoteListCard', () => {
    test('renders note cards correctly', async () => {
        const navigate = jest.fn();
        const notes = [
            { id: 1, content: 'Note 1 content', files: [] },
            { id: 2, content: 'Note 2 content', files: [] },
        ];

        render(
            <MemoryRouter>
                <NoteListCard title='Test Title' notes={notes} />
            </MemoryRouter>,
        );

        // Cards are rendered
        screen.findByText('Test Title').then((el) => {
            expect(el).toBeInTheDocument();
        });

        screen.findByText('Note 1 content').then((el) => {
            expect(el).toBeInTheDocument();
        });

        screen.findByText('Note 2 content').then((el) => {
            expect(el).toBeInTheDocument();
        });

        // Clicking cards works as expected
        screen
            .findByText('Note 1 content')
            .then((el) => {
                el.click();
            })
            .then(() => {
                expect(navigate).toHaveBeenCalledWith('/notes/1');
            });

        screen
            .findByText('Note 2 content')
            .then((el) => {
                el.click();
            })
            .then(() => {
                expect(navigate).toHaveBeenCalledWith('/notes/2');
            });
    });
});
