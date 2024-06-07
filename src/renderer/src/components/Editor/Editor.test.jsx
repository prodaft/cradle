/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from "@testing-library/react";
import '@testing-library/jest-dom'
import Editor from "./Editor";

const markdownContent = `# Hello world!`;
const setMarkdownContent = jest.fn();

beforeEach(() => {
  // Mock the DataTransfer object
  global.DataTransfer = function () {
    this.setData = jest.fn();
    this.getData = jest.fn();
  };
});

const setFileData = jest.fn();

test('render', () => {
  const { getByTestId } = render(
    <Editor
      markdownContent={markdownContent}
      setMarkdownContent={setMarkdownContent}
      fileData={[]}
      setFileData={setFileData}
      isLightMode={false}
    />
  );

  const codeMirrorInput = getByTestId('markdown-input');
  expect(codeMirrorInput).toBeInTheDocument();

  const vimToggle = getByTestId('vim-toggle');
  expect(vimToggle).toBeInTheDocument();
});

test('toggle vim mode', () => {
  const { getByTestId } = render(
    <Editor
      markdownContent={markdownContent}
      setMarkdownContent={setMarkdownContent}
      fileData={[]}
      setFileData={setFileData}
      isLightMode={false}
    />
  );

  const vimToggle = getByTestId('vim-toggle');
  expect(vimToggle).not.toBeChecked();

  fireEvent.click(vimToggle);
  expect(vimToggle).toBeChecked();

  fireEvent.click(vimToggle);
  expect(vimToggle).not.toBeChecked();
});

test('set markdown content', () => {
  const { getByTestId } = render(
    <Editor
      markdownContent={markdownContent}
      setMarkdownContent={setMarkdownContent}
      fileData={[]}
      setFileData={setFileData}
      isLightMode={false}
    />
  );

  const codeMirrorInput = getByTestId('markdown-input');
  fireEvent.change(codeMirrorInput, { target: { value: '# New content' } });

  expect(setMarkdownContent).toHaveBeenCalledWith('# New content');
});

test('upload file', () => {
  const { getByTestId } = render(
    <Editor
      markdownContent={markdownContent}
      setMarkdownContent={setMarkdownContent}
      fileData={[]}
      setFileData={setFileData}
      isLightMode={false}
    />
  );

  const fileInput = getByTestId('file-input');
  const file = new File(['file content'], 'test.txt', { type: 'text/plain' });
  fireEvent.change(fileInput, { target: { files: [file] } });

  expect(setFileData).toHaveBeenCalledWith([{ tag: 'tag1', name: 'test.txt' }]);
});

test('toggle file list', () => {
  const { getByTestId, queryByTestId } = render(
    <Editor
      markdownContent={markdownContent}
      setMarkdownContent={setMarkdownContent}
      fileData={[]}
      setFileData={setFileData}
      isLightMode={false}
    />
  );

  const toggleButton = getByTestId('toggle-file-list');
  fireEvent.click(toggleButton);

  expect(queryByTestId('file-table')).toBeInTheDocument();

  fireEvent.click(toggleButton);

  expect(queryByTestId('file-table')).not.toBeInTheDocument();
});

