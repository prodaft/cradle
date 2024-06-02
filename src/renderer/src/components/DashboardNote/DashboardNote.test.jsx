/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DashboardNote from "./DashboardNote";
import '@testing-library/jest-dom';
import * as ReactRouterDom from 'react-router-dom';

// Mock the entire module first
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
}));

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { access: 'testToken', isAdmin: true };
    }),
}));

describe("DashboardNote", () => {
    const publishNoteIds = new Set();
    const hasSpy = jest.spyOn(publishNoteIds, 'has').mockReturnValue(true);
    const note = {
        id: 1,
        timestamp: new Date().getTime(),
        content: "This is a test note",
        entities: [
            { id: 1, name: "Entity 1" },
            { id: 2, name: "Entity 2" },
        ],
        publishable: true,
    };

    const setAlert = jest.fn();
    const setAlertColor = jest.fn();
    const setPublishNoteIds = jest.fn();

    test("renders note content", () => {
        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    setAlertColor={setAlertColor}
                    publishMode={false}
                    publishNoteIds={publishNoteIds}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        const noteContent = screen.getByText("This is a test note");
        expect(hasSpy).toHaveBeenCalled();
        expect(noteContent).toBeInTheDocument();
    });

    test("handles select note", () => {
        render(
            <MemoryRouter >
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    setAlertColor={setAlertColor}
                    publishMode={true}
                    publishNoteIds={publishNoteIds}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole("checkbox"));

        expect(hasSpy).toHaveBeenCalled();
        expect(setPublishNoteIds).toHaveBeenCalledWith(new Set([note.id]));
    });

    it('renders note content and entities', () => {
        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    setAlertColor={setAlertColor}
                    publishMode={true}
                    publishNoteIds={publishNoteIds}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        expect(hasSpy).toHaveBeenCalled();
        expect(screen.getByText('This is a test note')).toBeInTheDocument();
        expect(screen.getByText('Entity 1;')).toBeInTheDocument();
        expect(screen.getByText('Entity 2;')).toBeInTheDocument();
    });


    it('navigates to note detail page on note click', () => {
        const navigate = jest.fn();
        ReactRouterDom.useNavigate.mockReturnValue(navigate);

        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    setAlertColor={setAlertColor}
                    publishMode={true}
                    publishNoteIds={publishNoteIds}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByText('This is a test note'));
        expect(hasSpy).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(`/notes/${note.id}`);
    });

    it('does not navigate when checkbox is clicked', () => {
        const navigate = jest.fn();
        ReactRouterDom.useNavigate.mockReturnValue(navigate);

        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    setAlertColor={setAlertColor}
                    publishMode={true}
                    publishNoteIds={publishNoteIds}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('checkbox'));
        expect(hasSpy).toHaveBeenCalled();
        expect(navigate).not.toHaveBeenCalled();
    });

    it('renders note timestamp correctly', () => {
        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    setAlertColor={setAlertColor}
                    publishMode={true}
                    publishNoteIds={publishNoteIds}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        expect(hasSpy).toHaveBeenCalled();
        expect(screen.getByText(new Date(note.timestamp).toLocaleString())).toBeInTheDocument();
    });

    it('renders note entities correctly', () => {
        render(
            <MemoryRouter>
                <DashboardNote
                    index={0}
                    note={note}
                    setAlert={setAlert}
                    setAlertColor={setAlertColor}
                    publishMode={true}
                    publishNoteIds={publishNoteIds}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        expect(hasSpy).toHaveBeenCalled();
        expect(screen.getByText('Entity 1;')).toBeInTheDocument();
        expect(screen.getByText('Entity 2;')).toBeInTheDocument();
    });
});
