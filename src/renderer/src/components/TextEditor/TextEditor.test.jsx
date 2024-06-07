/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import TextEditor from './TextEditor';
import { saveNote } from "../../services/textEditorService/textEditorService";
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import Home from "../Home/Home";

const markdownContent =`
# Hello world!
### Hello world!

---
- List item 1
- List item 2

[click link for Google](https://google.com)

> Do not the cat

![](https://www.wfla.com/wp-content/uploads/sites/71/2023/05/GettyImages-1389862392.jpg?w=2560&h=1440&crop=1)

\`\`\`js
// You can write code!
const x = 5;
console.log("Hello world!");
\`\`\`

| A | B| C   |
| -| - | -|
| 2| 4 | 6|
| 3| 5| 7 |
`;

jest.mock('../../hooks/useNavbarContents/useNavbarContents', () => () => { });
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
    useOutletContext: () => jest.fn(),
}));

global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}));


jest.mock('../../hooks/useAuth/useAuth', () => ({
    useAuth: jest.fn().mockImplementation(() => {
        return { access: 'testToken', isAdmin: false };
    }),
}));

jest.mock('../../services/textEditorService/textEditorService', () => ({
    saveNote: jest.fn()
}));

window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
}));

describe('TextEditor', () => {
    test('renders as expected', () => {
        render(
            <MemoryRouter>
                <TextEditor />
            </MemoryRouter>
        )

        expect(screen.getByTestId('preview')).toBeInTheDocument();
        expect(screen.getByTestId('markdown-input')).toBeInTheDocument();
    });
});

