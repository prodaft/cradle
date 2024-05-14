/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom'
import Editor from "./Editor";

test("renders", () => {
  const markdownContent = "Initial markdown content";
  const setMarkdownContent = jest.fn();

  const { getByTestId } = render(
    <Editor markdownContent={markdownContent} setMarkdownContent={setMarkdownContent} />
  );

  const editor = getByTestId("markdown-input");
  expect(editor).toBeInTheDocument();
});