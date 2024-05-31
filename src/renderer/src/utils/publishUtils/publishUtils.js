import * as mime from 'mime-types';

/**
 * Function to create a markdown section from an array of objects.
 * Each object in the array should have a `name` property.
 * Helper function for `createMarkdownReportFromJson()`.
 * 
 * If the array is empty, an empty string is returned.
 * 
 * @param array - the array of objects
 * @param sectionTitle - the title of the section
 * @returns {string} the markdown section
 */
const createMarkdownSection = (array, sectionTitle) => {
    if (!array || array.length === 0) {
        return "";
    }

    let markdown = `## ${sectionTitle}\n\n##### `;
    array.forEach((item) => {
        if (!item.name) {
            return "";
        }
        markdown += `${item.name}; `;
    });
    markdown += '\n\n---\n\n';

    return markdown;
};

/**
 * Function to create a markdown report from a JSON object.
 * Expects the following fields in the JSON object:
 * - actors
 * - cases
 * - entries
 * - metadata
 * - notes
 * 
 * @param {JSON} data - the JSON object
 * @returns {String} the markdown report
 */
const createMarkdownReportFromJson = (data) => {
    const { actors, cases, entries, metadata, notes } = data;
    let markdown = "";

    markdown += createMarkdownSection(actors, "Actors");
    markdown += createMarkdownSection(cases, "Cases");
    markdown += createMarkdownSection(entries, "Entries");
    markdown += createMarkdownSection(metadata, "Metadata");

    if (notes) {
        markdown += '## Notes\n\n';
        notes.forEach((note) => {
            markdown += `### ${note.timestamp}\n\n`;
            markdown += `${note.content}\n\n`;
        });
    }

    return markdown;
};

/**
 * Function to download a file given its content and type.
 * 
 * The extension should be a valid extension corresponding to a MIME type.
 * 
 * @param {string} content - the content of the file
 * @param {string} extension - the extension of the file
 * @returns {void}
 */
const downloadFile = (content, extension) => {
    if (!mime.lookup(extension)) {
        throw new Error(`Invalid file type: ${extension}`);
    }

    const fileType = mime.lookup(extension);

    const blob = new Blob([content], { type: fileType });
    const url = URL.createObjectURL(blob);
    const fileName = `report.${extension}`;

    // Create a link element to download that file and click it
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = fileName;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(url);
};

export { createMarkdownSection, createMarkdownReportFromJson, downloadFile };