/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import PublishPreview from "./PublishPreview";
import { MemoryRouter } from "react-router-dom";
import '@testing-library/jest-dom'

jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { access: 'testToken', isAdmin: false };
    }),
}));

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useLocation: jest.fn().mockImplementation(() => {
        return { location: '/publish-preview', search: '?noteIds=1&entityName=Test' };
    }),
}));

jest.mock('../../services/dashboardService/dashboardService', () => ({
    getPublishData: jest.fn().mockResolvedValue({ data: {} }),
}));

jest.mock('../../hooks/useNavbarContents/useNavbarContents');

describe("PublishPreview", () => {
    test("renders PublishPreview component", () => {
        render(<MemoryRouter><PublishPreview /></MemoryRouter>);
        const publishPreviewElement = screen.getByTestId("publish-preview");
        expect(publishPreviewElement).toBeInTheDocument();
    });
});
