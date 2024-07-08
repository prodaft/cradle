/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import NoteSelector from './NoteSelector';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}));

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { isAdmin: true };
    }),
}));

jest.mock('../../hooks/useNavbarContents/useNavbarContents');

const noteEntries = [
    { id: 4, name: '127.0.0.1', type: 'artifact', subtype: 'ip' },
    { id: 5, name: 'Case 1', type: 'case', subtype: '' },
];

const contentObject = {
    id: 5,
    name: 'Case 1',
    type: 'case',
    subtype: '',
    entries: noteEntries,
    description: 'Description',
    notes: [
        { id: 1, publishable: true, entries: noteEntries },
        { id: 2, publishable: true, entries: noteEntries },
        { id: 3, publishable: true, entries: noteEntries },
    ],
};

const notes = [
    {
        id: 10,
        content: 'Note 1',
        entries: [
            { id: 2, name: 'Actor 1' },
            { id: 3, name: 'Case 1' },
        ],
        timestamp: '2021-10-01T00:00:00Z',
    },
];

const mockData = {
    id: 1,
    name: 'Test Case',
    description: 'This is a test case.',
    type: 'case',
    actors: [{ id: 2, name: 'Actor 1' }],
    cases: [{ id: 3, name: 'Case 1' }],
    metadata: [{ id: 4, name: 'Metadata 1' }],
    notes: notes,
};

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn().mockImplementation(() => {
        return { path: '/notes', state: mockData };
    }),
}));

test('displays the name, type, and description of the content object', () => {
    render(
        <MemoryRouter>
            <NoteSelector />
        </MemoryRouter>,
    );

    expect(screen.getByText('Test Case')).toBeInTheDocument();
    expect(screen.getByText('Description: This is a test case.')).toBeInTheDocument();
});
