const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');
const marked = require('marked');
const { JSDOM } = require('jsdom');

// Sample markdown
const markdown = `# Test Heading

This is a **bold** test paragraph.

## Subheading

- List item 1
- List item 2

> This is a blockquote

\`\`\`
// Code block
console.log("Hello world");
\`\`\`
`;

// Helper function to convert HTML to docx elements (copied from server.js)
function convertHtmlToDocxElements(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    const elements = [];
    
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
                        text: node.textContent,
                        heading: HeadingLevel.HEADING_1
                    }));
                    break;
                case 'h2':
                    elements.push(new Paragraph({
                        text: node.textContent,
                        heading: HeadingLevel.HEADING_2
                    }));
                    break;
                case 'h3':
                    elements.push(new Paragraph({
                        text: node.textContent,
                        heading: HeadingLevel.HEADING_3
                    }));
                    break;
                case 'p':
                    elements.push(new Paragraph({
                        children: [new TextRun(node.textContent)]
                    }));
                    break;
                case 'ul':
                case 'ol':
                    // For simplicity, we'll just convert list items to paragraphs with dashes
                    Array.from(node.getElementsByTagName('li')).forEach(li => {
                        elements.push(new Paragraph({
                            children: [new TextRun(`- ${li.textContent}`)]
                        }));
                    });
                    break;
                case 'blockquote':
                    elements.push(new Paragraph({
                        children: [new TextRun({ text: node.textContent, italics: true })]
                    }));
                    break;
                case 'pre':
                    elements.push(new Paragraph({
                        children: [new TextRun({ text: node.textContent, font: "Courier New" })]
                    }));
                    break;
                // Add more element types as needed
                default:
                    // For other elements, just get the text content
                    if (node.textContent.trim() !== '') {
                        elements.push(new Paragraph({
                            children: [new TextRun(node.textContent)]
                        }));
                    }
                    break;
            }
        }
    }
    
    return elements;
}

// Convert markdown to HTML
console.log('Converting markdown to HTML...');
const html = marked.parse(markdown);
console.log('HTML generated:', html.substring(0, 100) + '...');

try {
    // Create document with docx elements
    console.log('Creating DOCX document...');
    const doc = new Document({
        sections: [{
            properties: {},
            children: convertHtmlToDocxElements(html)
        }]
    });
    
    // Generate DOCX
    console.log('Generating DOCX buffer...');
    Packer.toBuffer(doc).then(buffer => {
        console.log('DOCX generated successfully, buffer size:', buffer.length);
        
        // Save the buffer to a file
        fs.writeFileSync('test-output.docx', buffer);
        console.log('DOCX file saved as test-output.docx');
    }).catch(error => {
        console.error('DOCX generation error:', error);
    });
} catch (error) {
    console.error('Conversion error:', error);
}
