/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import NavbarDropdown from './NavbarDropdown';
import '@testing-library/jest-dom'

describe('NavbarDropdown', () => {
    const contents = [
        { label: 'Option 1', handler: jest.fn() },
        { label: 'Option 2', handler: jest.fn() },
        { label: 'Option 3', handler: jest.fn() },
    ];
    const icon = <i className="fa fa-bars"></i>;
    const text = 'Dropdown';

    it('renders the dropdown button with the provided icon', () => {
        const { getByTestId } = render(<NavbarDropdown contents={contents} icon={icon} text={text} testid={"dropdown-button"} />);
        const dropdownButton = getByTestId('dropdown-button');
        expect(dropdownButton).toBeInTheDocument();
        expect(dropdownButton).toContainHTML('<i class="fa fa-bars"></i>');
    });

    it('renders the dropdown menu with the provided contents', () => {
        const { getByTestId } = render(<NavbarDropdown contents={contents} icon={icon} text={text} testid={"dropdown-button"} />);
        const dropdownMenu = getByTestId('dropdown-menu');
        expect(dropdownMenu).toBeInTheDocument();
        expect(dropdownMenu.children.length).toBe(contents.length);
    });

    it('calls the handler function when a dropdown item is clicked', () => {
        const { getByText } = render(<NavbarDropdown contents={contents} icon={icon} text={text} testid={"dropdown-button"} />);
        const dropdownItem = getByText('Option 1');
        fireEvent.click(dropdownItem);
        expect(contents[0].handler).toHaveBeenCalled();
    });
});