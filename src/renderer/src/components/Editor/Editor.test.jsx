/**
 * @jest-environment jsdom
 */
<<<<<<< HEAD
=======
import React from "react";
>>>>>>> main
import { render, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom'
import Editor from "./Editor";

<<<<<<< HEAD
const markdownContent = `# Hello world!`;
const setMarkdownContent = jest.fn();

test('render', () => {
=======
test("renders", () => {
  const markdownContent = "Initial markdown content";
  const setMarkdownContent = jest.fn();

>>>>>>> main
  const { getByTestId } = render(
    <Editor markdownContent={markdownContent} setMarkdownContent={setMarkdownContent} />
  );

<<<<<<< HEAD
  const codeMirrorInput = getByTestId('markdown-input');
  expect(codeMirrorInput).toBeInTheDocument();

  const vimToggle = getByTestId('vim-toggle');
  expect(vimToggle).toBeInTheDocument();
});

test('toggle vim mode', () => {
  const { getByTestId } = render(
    <Editor markdownContent={markdownContent} setMarkdownContent={setMarkdownContent} />
  );

  const vimToggle = getByTestId('vim-toggle');
  expect(vimToggle).not.toBeChecked();

  fireEvent.click(vimToggle);
  expect(vimToggle).toBeChecked();

  fireEvent.click(vimToggle);
  expect(vimToggle).not.toBeChecked();
=======
  const editor = getByTestId("markdown-input");
  expect(editor).toBeInTheDocument();
>>>>>>> main
});