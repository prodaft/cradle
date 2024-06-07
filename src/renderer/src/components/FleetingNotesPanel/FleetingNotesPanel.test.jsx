/*
* @jest-environment jsdom
 */
import { render, waitFor, fireEvent } from '@testing-library/react';
import FleetingNotesPanel from './FleetingNotesPanel';
import { getFleetingNotes } from '../../services/fleetingNotesService/fleetingNotesService';
import '@testing-library/jest-dom';

jest.mock('../../services/fleetingNotesService/fleetingNotesService', () => ({
    getFleetingNotes: jest.fn()
}));
jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn(() => ({ access: 'access-token' }))
}));
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(() => jest.fn()),
}));

describe('FleetingNotesPanel', () => {

    getFleetingNotes.mockResolvedValue({ status: 200,  data: [] });

    it('renders without crashing', () => {
        render(<FleetingNotesPanel />);
    });

    it('fetches notes on mount', async () => {
        render(<FleetingNotesPanel />);

        await waitFor(() => expect(getFleetingNotes).toHaveBeenCalledTimes(1));
    });

    it('displays notes', async () => {
        getFleetingNotes.mockResolvedValueOnce({ status: 200 ,data: [{ id: 1, content: 'Note 1' }, { id: 2, content: 'Note 2' }] });

        const { findByText } = render(<FleetingNotesPanel />);

        expect(await findByText('Note 1')).toBeInTheDocument();
        expect(await findByText('Note 2')).toBeInTheDocument();
    });

    it('fetches notes again when fleetingNotesRefresh prop changes', async () => {
        const { rerender } = render(<FleetingNotesPanel fleetingNotesRefresh={false} />);

        await waitFor(() => expect(getFleetingNotes).toHaveBeenCalledTimes(1));

        rerender(<FleetingNotesPanel fleetingNotesRefresh={true} />);

        await waitFor(() => expect(getFleetingNotes).toHaveBeenCalledTimes(2));
    });

    it('displays an error message when fetching notes fails', async () => {
        getFleetingNotes.mockRejectedValueOnce(new Error('Failed to fetch notes'));
        const {findByTestId } = render(<FleetingNotesPanel />);

        const alert = await findByTestId('dismissable-alert');

        expect(alert).toBeInTheDocument();
    });

    it('calls handleFleetingNotesButton when the button is clicked', () => {
        const handleFleetingNotesButton = jest.fn();
        const { getByTestId } = render(<FleetingNotesPanel handleFleetingNotesButton={handleFleetingNotesButton} />);

        fireEvent.click(getByTestId('close-fleeting-notes'));

        expect(handleFleetingNotesButton).toHaveBeenCalledTimes(1);
    });
});