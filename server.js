const express = require('express');
const multer = require('multer');
const marked = require('marked');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, ImageRun } = require('docx');
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3001;

// Configure marked options
marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: true,
    langPrefix: 'language-',
    highlight: function(code) {
        return code;
    }
});

// Set up multer for form parsing
const upload = multer();

// Add middleware to log all requests
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Add JSON body parser
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Helper function to process text nodes with formatting
function processTextWithFormatting(node, dom) {
    const runs = [];

    // Process child nodes to handle inline formatting
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i];

        if (child.nodeType === dom.window.Node.TEXT_NODE) {
            // Plain text
            if (child.textContent.trim() !== '') {
                runs.push(new TextRun(child.textContent));
            }
        } else if (child.nodeType === dom.window.Node.ELEMENT_NODE) {
            // Handle inline formatting elements
            switch (child.tagName.toLowerCase()) {
                case 'strong':
                case 'b':
                    runs.push(new TextRun({ text: child.textContent, bold: true }));
                    break;
                case 'em':
                case 'i':
                    runs.push(new TextRun({ text: child.textContent, italics: true }));
                    break;
                case 'code':
                    runs.push(new TextRun({
                        text: child.textContent,
                        font: 'Courier New',
                        size: 22,  // Fixed size for inline code (11pt)
                        shading: {
                            type: 'solid',
                            color: defaultColors.codeBackground
                        }
                    }));
                    break;
                case 'a':
                    runs.push(new TextRun({
                        text: child.textContent,
                        style: 'Hyperlink',
                        underline: {}
                    }));
                    break;
                default:
                    // For other elements, just get the text content
                    if (child.textContent.trim() !== '') {
                        runs.push(new TextRun(child.textContent));
                    }
                    break;
            }
        }
    }

    // If no runs were created (e.g., only whitespace), return a single empty run
    if (runs.length === 0) {
        return [new TextRun('')];
    }

    return runs;
}

// Helper function to convert HTML to docx elements
function convertHtmlToDocxElements(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const elements = [];

    // Use default colors
    const colors = defaultColors;

    // We'll use the default font size for code blocks
    // No need to access styleOptions here

    // Process each element in the body
    const childNodes = document.body.childNodes;

    for (let i = 0; i < childNodes.length; i++) {
        const node = childNodes[i];

        if (node.nodeType === dom.window.Node.TEXT_NODE) {
            // Skip empty text nodes
            if (node.textContent.trim() !== '') {
                elements.push(new Paragraph({
                    children: [new TextRun(node.textContent)]
                }));
            }
        } else if (node.nodeType === dom.window.Node.ELEMENT_NODE) {
            switch (node.tagName.toLowerCase()) {
                case 'h1':
                    elements.push(new Paragraph({
                        children: processTextWithFormatting(node, dom),
                        heading: HeadingLevel.HEADING_1,
                        style: 'Heading1'
                    }));
                    break;
                case 'h2':
                    elements.push(new Paragraph({
                        children: processTextWithFormatting(node, dom),
                        heading: HeadingLevel.HEADING_2,
                        style: 'Heading2'
                    }));
                    break;
                case 'h3':
                    elements.push(new Paragraph({
                        children: processTextWithFormatting(node, dom),
                        heading: HeadingLevel.HEADING_3,
                        style: 'Heading3'
                    }));
                    break;
                case 'p':
                    elements.push(new Paragraph({
                        children: processTextWithFormatting(node, dom)
                    }));
                    break;
                case 'ul':
                    // Handle unordered lists
                    Array.from(node.getElementsByTagName('li')).forEach(li => {
                        elements.push(new Paragraph({
                            children: [
                                new TextRun('• '),
                                ...processTextWithFormatting(li, dom)
                            ],
                            indent: { left: 720 } // 0.5 inch indent
                        }));
                    });
                    break;
                case 'ol':
                    // Handle ordered lists
                    Array.from(node.getElementsByTagName('li')).forEach((li, index) => {
                        elements.push(new Paragraph({
                            children: [
                                new TextRun(`${index + 1}. `),
                                ...processTextWithFormatting(li, dom)
                            ],
                            indent: { left: 720 } // 0.5 inch indent
                        }));
                    });
                    break;
                case 'blockquote':
                    elements.push(new Paragraph({
                        children: processTextWithFormatting(node, dom),
                        indent: { left: 720 },
                        border: {
                            left: {
                                color: colors.blockquoteBorder,
                                size: 12,
                                style: 'single'
                            }
                        }
                    }));
                    break;
                case 'pre':
                    // Handle code blocks
                    // First, create a container paragraph for the entire code block
                    elements.push(new Paragraph({
                        children: [],
                        spacing: {
                            before: 240,  // 12pt before code block
                            after: 240,   // 12pt after code block
                            line: 240,    // single line spacing for code
                            lineRule: 'auto'
                        }
                    }));

                    // Get the code element inside pre
                    const codeElement = node.querySelector('code');
                    const codeText = codeElement ? codeElement.textContent : node.textContent;

                    // Split by lines and preserve empty lines
                    const codeLines = codeText.split('\n');

                    // Create a table for the code block with a single column
                    const codeRows = [];

                    codeLines.forEach(line => {
                        // Create a table row for each line of code
                        codeRows.push(
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [
                                            new Paragraph({
                                                children: [
                                                    new TextRun({
                                                        text: line,
                                                        font: 'Courier New',
                                                        size: 22  // Fixed size for code (11pt)
                                                    })
                                                ],
                                                spacing: {
                                                    before: 20,   // 1pt before line
                                                    after: 20,    // 1pt after line
                                                    line: 240,    // single spacing
                                                    lineRule: 'auto'
                                                }
                                            })
                                        ],
                                        shading: {
                                            fill: colors.codeBackground
                                        }
                                    })
                                ]
                            })
                        );
                    });

                    // Add the code table to the elements
                    elements.push(
                        new Table({
                            rows: codeRows,
                            width: {
                                size: 100,
                                type: WidthType.PERCENTAGE
                            },
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                bottom: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                left: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                right: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                insideHorizontal: { style: BorderStyle.NONE },
                                insideVertical: { style: BorderStyle.NONE }
                            }
                        })
                    );
                    break;
                case 'hr':
                    // Handle horizontal rule
                    elements.push(new Paragraph({
                        border: {
                            bottom: {
                                color: colors.blockquoteBorder,
                                size: 1,
                                style: 'single'
                            }
                        }
                    }));
                    break;
                case 'table':
                    // Process table
                    try {
                        const tableRows = [];
                        const headerRow = node.querySelector('thead tr');
                        const bodyRows = node.querySelectorAll('tbody tr');

                        // Process header row if it exists
                        if (headerRow) {
                            const headerCells = [];
                            headerRow.querySelectorAll('th').forEach(th => {
                                headerCells.push(
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: processTextWithFormatting(th, dom)
                                        })],
                                        shading: {
                                            fill: colors.tableHeader
                                        }
                                    })
                                );
                            });
                            tableRows.push(new TableRow({ children: headerCells }));
                        }

                        // Process body rows
                        bodyRows.forEach(tr => {
                            const rowCells = [];
                            tr.querySelectorAll('td').forEach(td => {
                                rowCells.push(
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: processTextWithFormatting(td, dom)
                                        })]
                                    })
                                );
                            });
                            tableRows.push(new TableRow({ children: rowCells }));
                        });

                        // If no thead, try to use the first tr as header
                        if (!headerRow && bodyRows.length > 0) {
                            const firstRow = bodyRows[0];
                            const headerCells = [];
                            firstRow.querySelectorAll('td').forEach(td => {
                                headerCells.push(
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: processTextWithFormatting(td, dom)
                                        })],
                                        shading: {
                                            fill: colors.tableHeader
                                        }
                                    })
                                );
                            });
                            // Replace first row with header-styled row
                            tableRows[0] = new TableRow({ children: headerCells });
                        }

                        // Create and add the table
                        elements.push(
                            new Table({
                                rows: tableRows,
                                width: {
                                    size: 100,
                                    type: WidthType.PERCENTAGE
                                },
                                borders: {
                                    top: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                    bottom: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                    left: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                    right: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder },
                                    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: colors.tableBorder }
                                }
                            })
                        );
                    } catch (error) {
                        console.error('Error processing table:', error);
                        // Fallback to simple text if table processing fails
                        elements.push(new Paragraph({
                            children: [new TextRun('Table content (simplified): ' + node.textContent)]
                        }));
                    }
                    break;

                case 'img':
                    // Process image
                    try {
                        const src = node.getAttribute('src');
                        const alt = node.getAttribute('alt') || 'Image';

                        // Add a placeholder paragraph for the image
                        // The actual image will be fetched and added asynchronously
                        elements.push(new Paragraph({
                            children: [new TextRun({ text: `[Image: ${alt}]` })],
                            alignment: 'center'
                        }));

                        // Store image info for later processing
                        if (src) {
                            // Add to a list of images to be processed
                            if (!global.imagesToProcess) {
                                global.imagesToProcess = [];
                            }
                            global.imagesToProcess.push({
                                src,
                                alt,
                                index: elements.length - 1 // Index of the placeholder paragraph
                            });
                            console.log(`Image found: ${src} (${alt})`);
                        }
                    } catch (error) {
                        console.error('Error processing image:', error);
                        elements.push(new Paragraph({
                            children: [new TextRun('Image could not be processed')]
                        }));
                    }
                    break;
                // Add more element types as needed
                default:
                    // For other elements, just get the text content
                    if (node.textContent.trim() !== '') {
                        elements.push(new Paragraph({
                            children: processTextWithFormatting(node, dom)
                        }));
                    }
                    break;
            }
        }
    }

    return elements;
}

// Function to process images
async function processImages(images) {
    if (!images || images.length === 0) return;

    console.log(`Processing ${images.length} images...`);

    // We'll use a simple approach for now - just log the images
    // In a real implementation, you would fetch the images and add them to the document
    for (const image of images) {
        console.log(`Would process image: ${image.src} (${image.alt})`);
        // In a real implementation, you would:
        // 1. Fetch the image data
        // 2. Convert it to a format docx can use
        // 3. Replace the placeholder paragraph with an actual image
    }

    return Promise.resolve();
}

// Default colors for document elements
const defaultColors = {
    text: '000000',
    heading: '2C3E50',
    accent: '3498DB',
    tableBorder: 'DDDDDD',
    tableHeader: 'F2F2F2',
    blockquoteBorder: 'CCCCCC',
    codeBackground: 'F5F5F5'
};

// Endpoint to convert markdown to DOCX
app.post('/convert', upload.none(), (req, res) => {
    console.log('Headers:', req.headers);
    try {
        console.log('Request received at /convert endpoint');
        console.log('Request body:', req.body);

        let markdown;

        // Check if the request is FormData or JSON
        let styleOptions = {
            fontFamily: 'Calibri',
            fontSize: '12',
            pageSize: 'A4',
            marginSize: 'normal'
        };

        // Make styleOptions available globally for other functions
        global.currentStyleOptions = styleOptions;

        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
            console.log('Processing as FormData');
            markdown = req.body.markdown;

            // Extract style options from form data
            if (req.body.fontFamily) styleOptions.fontFamily = req.body.fontFamily;
            if (req.body.fontSize) styleOptions.fontSize = req.body.fontSize;
            if (req.body.pageSize) styleOptions.pageSize = req.body.pageSize;
            if (req.body.marginSize) styleOptions.marginSize = req.body.marginSize;

        } else if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
            console.log('Processing as JSON');
            markdown = req.body.markdown;

            // Extract style options from JSON
            if (req.body.styleOptions) {
                styleOptions = { ...styleOptions, ...req.body.styleOptions };
            }
        } else {
            console.log('Unknown content type, trying to extract markdown anyway');
            markdown = req.body.markdown;
        }

        console.log('Style options:', styleOptions);

        if (!markdown) {
            console.error('No markdown content received');
            return res.status(400).send('No markdown content received');
        }

        console.log('Processing markdown of length:', markdown.length);

        // Convert markdown to HTML
        const html = marked.parse(markdown);

        // Use default colors
        const colors = defaultColors;

        // Create document with docx elements and apply style options
        const doc = new Document({
            styles: {
                paragraphStyles: [
                    {
                        id: 'Normal',
                        name: 'Normal',
                        run: {
                            font: styleOptions.fontFamily,
                            size: parseInt(styleOptions.fontSize) * 2, // Convert pt to half-points
                            color: colors.text
                        }
                    },
                    {
                        id: 'Heading1',
                        name: 'Heading 1',
                        basedOn: 'Normal',
                        next: 'Normal',
                        run: {
                            font: styleOptions.fontFamily,
                            size: parseInt(styleOptions.fontSize) * 2 + 8, // Larger than normal text
                            bold: true,
                            color: colors.heading
                        }
                    },
                    {
                        id: 'Heading2',
                        name: 'Heading 2',
                        basedOn: 'Normal',
                        next: 'Normal',
                        run: {
                            font: styleOptions.fontFamily,
                            size: parseInt(styleOptions.fontSize) * 2 + 4, // Larger than normal text
                            bold: true,
                            color: colors.heading
                        }
                    },
                    {
                        id: 'Heading3',
                        name: 'Heading 3',
                        basedOn: 'Normal',
                        next: 'Normal',
                        run: {
                            font: styleOptions.fontFamily,
                            size: parseInt(styleOptions.fontSize) * 2 + 2, // Larger than normal text
                            bold: true,
                            color: colors.heading
                        }
                    },
                    {
                        id: 'Hyperlink',
                        name: 'Hyperlink',
                        basedOn: 'Normal',
                        run: {
                            color: colors.accent,
                            underline: {}
                        }
                    },
                    {
                        id: 'Code',
                        name: 'Code',
                        basedOn: 'Normal',
                        run: {
                            font: 'Courier New',
                            size: parseInt(styleOptions.fontSize) * 2 - 2,  // Slightly smaller than normal text
                            color: colors.text
                        },
                        paragraph: {
                            spacing: {
                                before: 20,   // 1pt before line
                                after: 20,    // 1pt after line
                                line: 240,    // single spacing
                                lineRule: 'auto'
                            }
                        }
                    }
                ]
            },
            sections: [{
                properties: {
                    page: {
                        size: {
                            width: styleOptions.pageSize === 'A4' ? 11906 : 12240, // A4 or Letter/Legal width
                            height: styleOptions.pageSize === 'A4' ? 16838 :
                                   styleOptions.pageSize === 'Letter' ? 15840 : 20160 // A4, Letter, or Legal height
                        },
                        margin: {
                            top: styleOptions.marginSize === 'narrow' ? 360 :
                                 styleOptions.marginSize === 'normal' ? 720 : 1080, // narrow, normal, or wide
                            right: styleOptions.marginSize === 'narrow' ? 360 :
                                  styleOptions.marginSize === 'normal' ? 720 : 1080,
                            bottom: styleOptions.marginSize === 'narrow' ? 360 :
                                   styleOptions.marginSize === 'normal' ? 720 : 1080,
                            left: styleOptions.marginSize === 'narrow' ? 360 :
                                 styleOptions.marginSize === 'normal' ? 720 : 1080
                        }
                    }
                },
                children: convertHtmlToDocxElements(html)
            }]
        });

        // Process any images that need to be fetched
        if (global.imagesToProcess && global.imagesToProcess.length > 0) {
            console.log(`Processing ${global.imagesToProcess.length} images...`);
            processImages(global.imagesToProcess)
                .then(() => {
                    // Generate DOCX after images are processed
                    return Packer.toBuffer(doc);
                })
                .then(buffer => {
                    console.log('DOCX generated successfully, buffer size:', buffer.length);
                    // Set headers for file download
                    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                    res.setHeader('Content-Disposition', 'attachment; filename=document.docx');

                    // Send the buffer
                    res.send(buffer);

                    // Clear the images array for the next request
                    global.imagesToProcess = [];
                })
                .catch(error => {
                    console.error('DOCX generation error:', error);
                    res.status(500).send('Error generating DOCX file');
                });
        } else {
            // No images to process, generate DOCX directly
            Packer.toBuffer(doc).then(buffer => {
                console.log('DOCX generated successfully, buffer size:', buffer.length);
                // Set headers for file download
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
                res.setHeader('Content-Disposition', 'attachment; filename=document.docx');

                // Send the buffer
                res.send(buffer);
            }).catch(error => {
                console.error('DOCX generation error:', error);
                res.status(500).send('Error generating DOCX file');
            });
        }
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).send('Error converting markdown to DOCX');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
