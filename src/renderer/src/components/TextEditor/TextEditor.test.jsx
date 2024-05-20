/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom'
import TextEditor from './TextEditor';
import { saveNote } from "../../services/textEditorService/textEditorService";

jest.mock('../../hooks/useNavbarContents/useNavbarContents', () => () => {});

beforeEach(() => {
    localStorage.clear();
});

afterAll(() => {
    localStorage.clear();
});

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

jest.mock('../../services/textEditorService/textEditorService', () => ({
  saveNote: jest.fn()
}));

test('renders as expected', () => {
    render(<TextEditor />);

    expect(screen.getByTestId('preview')).toBeInTheDocument();
    expect(screen.getByTestId('markdown-input')).toBeInTheDocument();
});
