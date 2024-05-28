/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DashboardHorizontalSection from './DashboardHorizontalSection';
import '@testing-library/jest-dom';
import { NavArrowDown, NavArrowUp } from 'iconoir-react';

jest.mock('iconoir-react', () => ({
    NavArrowDown: jest.fn(() => <div data-testid="nav-arrow-down"></div>),
    NavArrowUp: jest.fn(() => <div data-testid="nav-arrow-up"></div>)
}));

describe('DashboardHorizontalSection component', () => {
    it('renders the title correctly', () => {
        const title = 'Test Title';
        render(<DashboardHorizontalSection title={title} />);

        expect(screen.getByText(title)).toBeInTheDocument();
    });

    it('renders children when expanded', () => {
        const title = 'Test Title';
        render(
            <DashboardHorizontalSection title={title}>
                {[<div>Child 1</div>,
                <div>Child 2</div>]}
            </DashboardHorizontalSection>
        );

        fireEvent.click(screen.getByText(title));
        expect(screen.getByText('Child 1')).toBeVisible();
        expect(screen.getByText('Child 2')).toBeVisible();
    });

    it('displays a message when there are no children', () => {
        const title = 'Test Title';
        render(<DashboardHorizontalSection title={title} />);

        fireEvent.click(screen.getByText(title));
        expect(screen.getByText('No items to display')).toBeVisible();
    });

    it('shows the correct arrow icon based on expanded state', () => {
        const title = 'Test Title';
        render(<DashboardHorizontalSection title={title}><div>Child</div></DashboardHorizontalSection>);

        expect(screen.getByTestId('nav-arrow-down')).toBeInTheDocument();
        expect(screen.queryByTestId('nav-arrow-up')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText(title));
        expect(screen.getByTestId('nav-arrow-up')).toBeInTheDocument();
        expect(screen.queryByTestId('nav-arrow-down')).not.toBeInTheDocument();
    });
});
