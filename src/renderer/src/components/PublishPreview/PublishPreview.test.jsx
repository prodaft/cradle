/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import PublishPreview from './PublishPreview';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { isAdmin: false };
    }),
}));

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn().mockImplementation(() => {
        return {
            location: '/publish',
            state: { noteIds: [1], entryName: 'Test' },
        };
    }),
}));

jest.mock('../../services/dashboardService/dashboardService', () => ({
    getPublishData: jest.fn().mockResolvedValue({ data: {} }),
}));

jest.mock('../../hooks/useNavbarContents/useNavbarContents');

describe('PublishPreview', () => {
    test('renders PublishPreview component', () => {
        render(
            <MemoryRouter>
                <PublishPreview />
            </MemoryRouter>,
        );
        const publishPreviewElement = screen.getByTestId('publish-preview');
        expect(publishPreviewElement).toBeInTheDocument();
    });
});
