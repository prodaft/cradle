import mime from 'mime';
// import template from './reportTemplate.html?raw';

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
            markdown += `### ${new Date(note.timestamp).toLocaleString()}\n\n`;
            markdown += `${note.content}\n\n---\n\n`;
        });
    }

    return markdown;
};

/**
 * Function to download a file given its content and type.
 * 
 * The extension should be a valid extension corresponding to a MIME type.
 * If the extension is not valid, an error is thrown.
 *  
 * @param {string} content - the content of the file
 * @param {string} extension - the extension of the file
 * @throws {Error} if the extension is invalid
 * @returns {void}
 */
const downloadFile = (content, extension) => {
    const fileType = mime.getType(extension);

    if (!fileType) {
        throw new Error(`Invalid file extension: ${extension}`);
    }    

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

/**
 * Function to create an HTML report from a title and some HTML content.
 * It returns a report with a given template, using [TailwindCSS](https://tailwindcss.com/).
 * Imports the TailwindCSS CDN.
 * 
 * Uses the tailwind config from the root of this project.
 * 
 * Also attempts to disable most internal links in the report. External links (e.g. https://google.com) are not affected.
 * 
 * @param {string} title - the title of the report. Default is "Report"
 * @param {string} htmlContent - the HTML content of the report
 * @returns {string} the HTML report
 */
const createHtmlReport = (title, htmlContent) => {
    const reportTitle = title || "Report";
    const tailwindConfig = {
        theme: {
            extend: {
                colors: {
                    cradle1: '#02111a',
                    cradle2: '#f68d2e',
                    cradle3: '#253746', 
                },
                typography: (theme) => ({
                    DEFAULT: {
                        css: {
                            pre: {
                                padding: theme('padding.4'),
                                overflow: 'auto !important',
                                maxWidth: '100% !important',
                            },
                            code: {
                                whiteSpace: 'pre-wrap !important',
                                wordBreak: 'break-word !important',
                            },
                        },
                    },
                }),
            }, 
        },
    };

    // TODO - move this into an html file. configure jest to handle importing raw html
    // return template.replace(/{{reportTitle}}/g, reportTitle)
    //                .replace(/{{htmlContent}}/g, htmlContent);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reportTitle}</title>

    <!-- TailwindCSS CDN -->
    <script src="https://cdn.tailwindcss.com?plugins=forms,typography,aspect-ratio,container-queries"></script>

    <!-- TailwindCSS config -->
    <script>
        tailwind.config = ${JSON.stringify(tailwindConfig)};
    </script>
    
    <!-- Disable internal links -->
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const anchors = document.querySelectorAll('a[href]');
            anchors.forEach(function(anchor) {
                const href = anchor.getAttribute('href');
                if (href && (href.startsWith('/') || href.startsWith('#') || !href.includes(':'))) {
                    anchor.addEventListener('click', function(event) {
                        event.preventDefault();
                    });
                }
            });
        });
    </script>
</head>
<body class="bg-gray-100">
    <div class="max-w-4xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-lg">
        <div class="border-b-2 pb-4 mb-6 text-center">
            <h1 class="text-2xl font-bold text-gray-800">${reportTitle}</h1>
        </div>
        <div class="prose prose-lg">
            ${htmlContent}
        </div>
    </div>
</body>
</html>

`
}

export { createMarkdownSection, createMarkdownReportFromJson, downloadFile, createHtmlReport };