/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import useLocalStorageMarkdown from "./useMarkdownContent";

beforeAll(() => {
    localStorage.clear();
});

test("gets from localStorage", () => {
    localStorage.setItem("md-content", "Initial markdown content");

    const { result } = renderHook(() => useLocalStorageMarkdown());

    expect(result.current[0]).toBe("Initial markdown content");
});

test("change content and localStorage updates", () => {
    localStorage.setItem("md-content", "Initial markdown content");

    const { result } = renderHook(() => useLocalStorageMarkdown());

    act(() => {
      result.current[1]("Updated markdown content");
    });

    expect(result.current[0]).toBe("Updated markdown content");
    expect(localStorage.getItem("md-content")).toBe("Updated markdown content");
});
