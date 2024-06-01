/**
 * @jest-environment jsdom
 */
import { createMarkdownSection, createMarkdownReportFromJson, downloadFile, createHtmlReport } from "./publishUtils";

describe("createMarkdownSection", () => {
    it("should return an empty string if the array is null", () => {
        const array = null;
        const sectionTitle = "Test Section";
        const result = createMarkdownSection(array, sectionTitle);
        expect(result).toBe("");
    });

    it("should return an empty string if the array is undefined", () => {
        const array = undefined;
        const sectionTitle = "Test Section";
        const result = createMarkdownSection(array, sectionTitle);
        expect(result).toBe("");
    });

    it("should return an empty string if the array is empty", () => {
        const array = [];
        const sectionTitle = "Test Section";
        const result = createMarkdownSection(array, sectionTitle);
        expect(result).toBe("");
    });


    it("should return an empty string if the array is empty", () => {
        const array = [];
        const sectionTitle = "Test Section";
        const result = createMarkdownSection(array, sectionTitle);

        expect(result).toBe("");
    });

    it("should return the markdown section with the correct title and items", () => {
        const array = [
            { name: "Item 1" },
            { name: "Item 2" },
            { name: "Item 3" },
        ];
        const sectionTitle = "Test Section";
        const result = createMarkdownSection(array, sectionTitle);
        const expected = "## Test Section\n\n##### Item 1; Item 2; Item 3; \n\n---\n\n";

        expect(result).toBe(expected);
    });

    it("should ignore objects without a name property", () => {
        const array = [
            { name: "Item 1" },
            { name: "Item 2" },
            { description: "Item 3" },
        ];
        const sectionTitle = "Test Section";
        const result = createMarkdownSection(array, sectionTitle);
        const expected = "## Test Section\n\n##### Item 1; Item 2; \n\n---\n\n";

        expect(result).not.toContain("Item 3");
        expect(result).toBe(expected);
    });
});

describe("createMarkdownReportFromJson", () => {

    beforeEach(() => {
        jest.spyOn(Date.prototype, "toLocaleString").mockReturnValue("01/01/2022, 01:00:00");
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should return an empty string if any required field is missing", () => {
        const data = {
            actors: [],
            cases: [],
            entries: [],
            metadata: [],
        };
        const result = createMarkdownReportFromJson(data);
        const expected = "";
        expect(result).toBe(expected);
    });

    it("should return the markdown report with all sections and notes", () => {
        const data = {
            actors: [{ name: "Actor 1" }, { name: "Actor 2" }],
            cases: [{ name: "Case 1" }, { name: "Case 2" }],
            entries: [{ name: "Entry 1" }, { name: "Entry 2" }],
            metadata: [{ name: "Metadata 1" }, { name: "Metadata 2" }],
            notes: [
                { timestamp: "2022-01-01", content: "Note 1" },
                { timestamp: "2022-01-02", content: "Note 2" },
            ],
        };
        const result = createMarkdownReportFromJson(data);
        const expected = '## Actors\n\n##### Actor 1; Actor 2; \n\n---\n\n'
                       + '## Cases\n\n##### Case 1; Case 2; \n\n---\n\n'
                       + '## Entries\n\n##### Entry 1; Entry 2; \n\n---\n\n'
                       + '## Metadata\n\n##### Metadata 1; Metadata 2; \n\n---\n\n'
                       + '## Notes\n\n### 01/01/2022, 01:00:00\n\nNote 1\n\n---\n\n### 01/01/2022, 01:00:00\n\nNote 2\n\n---\n\n';

        expect(result).toBe(expected);
    });

    it("should avoid returning titles if any of the data arrays are empty", () => {
        const data = {
            actors: [],
            cases: [{ name: "Case 1" }, { name: "Case 2" }],
            entries: [],
            metadata: [{ name: "Metadata 1" }, { name: "Metadata 2" }],
            notes: [
                { timestamp: "2022-01-01", content: "Note 1" },
                { timestamp: "2022-01-02", content: "Note 2" },
            ],
        };
        const result = createMarkdownReportFromJson(data);
        const expected = '## Cases\n\n##### Case 1; Case 2; \n\n---\n\n'
                       + '## Metadata\n\n##### Metadata 1; Metadata 2; \n\n---\n\n'
                       + '## Notes\n\n### 01/01/2022, 01:00:00\n\nNote 1\n\n---\n\n### 01/01/2022, 01:00:00\n\nNote 2\n\n---\n\n';

        expect(result).toBe(expected);
    });
});

describe("downloadFile", () => {
    it("should throw an error for an invalid file extension", () => {
        const content = "This is the file content";
        const extension = "invalid";
        expect(() => downloadFile(content, extension)).toThrowError("Invalid file extension: invalid");
    });

    it("should create a download link with the correct file name and content", () => {
        const content = "This is the file content";
        const extension = "html";

        // Mocks
        const createElementSpy = jest.spyOn(document, "createElement");
        const appendChildSpy = jest.spyOn(document.body, "appendChild");
        const clickSpy = jest.spyOn(HTMLElement.prototype, "click");
        const removeChildSpy = jest.spyOn(document.body, "removeChild");
        const mockURL = {
            createObjectURL: jest.fn(),
            revokeObjectURL: jest.fn(),
        };
        global.URL = mockURL;

        downloadFile(content, extension);

        expect(createElementSpy).toHaveBeenCalledWith("a");
        expect(appendChildSpy).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(mockURL.createObjectURL).toHaveBeenCalled();
        expect(mockURL.revokeObjectURL).toHaveBeenCalled();

        const downloadLink = createElementSpy.mock.results[0].value;
        expect(downloadLink.download).toBe("report.html");

        jest.restoreAllMocks();
    });
});

describe("createHtmlReport", () => {
    it("should return an html report with the given contents", () => {
        const title = "This is the title!";
        const htmlContent = "<div>This is the content!!!</div>";
        const result = createHtmlReport(title, htmlContent);

        expect(result).toContain(title);
        expect(result).toContain(htmlContent);
    });

    it("should use the default title if there is not given title", () => {
        const title = "";
        const htmlContent = "<div>This is the content!!!</div>";
        const result = createHtmlReport(title, htmlContent);

        expect(result).toContain("Report");
        expect(result).toContain(htmlContent);
    });

    it("should contain the cradle themes", () => {
        const title = "This is the title!";
        const htmlContent = "<div>This is the content!!!</div>";
        const result = createHtmlReport(title, htmlContent);

        expect(result).toContain("cradle1");
        expect(result).toContain("cradle2");
        expect(result).toContain("cradle3");
    });
});
