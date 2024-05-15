import { useState } from "react";

/**
 * A custom hook that provides a state and a callback that will set that state 
 * and save it in local storage under the key 'md-content'
 * 
 * The state will be what is present in local storage at that key
 * 
 * @returns {array} markdownContent - the state object
 *                  setMarkdownContentCallback - the callback to set the state
 */
const useLocalStorageMarkdown = () => {
  const storedMarkdown = localStorage.getItem("md-content");
  const [markdownContent, setMarkdownContent] = useState(storedMarkdown ? storedMarkdown : "");

  const setMarkdownContentCallback = (markdownContent) => {
    setMarkdownContent(markdownContent);
    localStorage.setItem("md-content", markdownContent);
  };

  return [markdownContent, setMarkdownContentCallback];
};

export default useLocalStorageMarkdown;