/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import DashboardNote from "./DashboardNote";
import { MemoryRouter } from "react-router-dom";
import '@testing-library/jest-dom';

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { access: 'testToken', isAdmin: false };
    }),
}));

describe("DashboardNote", () => {
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
                    publishNoteIds={new Set()}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        const noteContent = screen.getByText("This is a test note");
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
                    publishNoteIds={new Set()}
                    setPublishNoteIds={setPublishNoteIds}
                />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole("checkbox"));

        expect(setPublishNoteIds).toHaveBeenCalledWith(new Set([note.id]));
    });
});
