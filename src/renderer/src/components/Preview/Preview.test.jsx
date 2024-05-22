/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom'
import Preview from "./Preview";
<<<<<<< HEAD
import { MemoryRouter } from "react-router-dom";
=======
>>>>>>> main

jest.mock('../../services/textEditorService/textEditorService', () => ({
  saveNote: jest.fn()
}));

test('renders as expected', () => {
<<<<<<< HEAD
  render(
    <MemoryRouter>
      <Preview />
    </MemoryRouter>
  );
=======
  render(<Preview />);
>>>>>>> main

  expect(screen.getByTestId('preview')).toBeInTheDocument();
});

test('renders with inner html', () => {
  const safeHTML = `<p> This is some html! </p>`;
<<<<<<< HEAD
  const { getByTestId } = render(
    <MemoryRouter>
      <Preview htmlContent={safeHTML} />
    </MemoryRouter>
  );
=======
  const { getByTestId } = render(<Preview htmlContent={safeHTML} />);
>>>>>>> main
  const previewDiv = getByTestId("preview");

  expect(previewDiv.innerHTML).toBe(safeHTML);
});

test('does not render unsafe html', () => {
  const unsafeHTML = `<alert> This is some html! </alert>\n <script> console.log("HACKED"); </script>`;
<<<<<<< HEAD
  const { getByTestId } = render(
    <MemoryRouter>
      <Preview htmlContent={unsafeHTML} />
    </MemoryRouter>
  );
=======
  const { getByTestId } = render(<Preview htmlContent={unsafeHTML} />);
>>>>>>> main
  const previewDiv = getByTestId("preview");

  expect(previewDiv.innerHTML).not.toContain("alert");
  expect(previewDiv.innerHTML).not.toContain("script");
});