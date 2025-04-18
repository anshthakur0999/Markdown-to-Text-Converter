document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const markdownInput = document.getElementById('markdown-input');
    const preview = document.getElementById('preview');
    const downloadBtn = document.getElementById('download-btn');
    const previewBtn = document.getElementById('preview-btn');
    const previewModal = document.getElementById('preview-modal');
    const printPreview = document.getElementById('print-preview');
    const closeBtn = document.querySelector('.close');


    // Style selectors
    const fontFamily = document.getElementById('font-family');
    const fontSize = document.getElementById('font-size');
    const pageSize = document.getElementById('page-size');
    const marginSize = document.getElementById('margin-size');

    let editor;
    let styleOptions = {
        fontFamily: 'Calibri',
        fontSize: '12',
        pageSize: 'A4',
        marginSize: 'normal'
    };



    // Configure marked options to match server-side rendering
    marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: true,
        langPrefix: 'language-',
        highlight: function(code, lang) {
            return code;
        }
    });

    // Initialize SimpleMDE editor
    editor = new SimpleMDE({
        element: markdownInput,
        spellChecker: false,
        autosave: {
            enabled: true,
            uniqueId: 'markdown-converter',
            delay: 1000,
        },
        toolbar: [
            'bold', 'italic', 'heading', '|',
            'quote', 'unordered-list', 'ordered-list', '|',
            'link', 'image', 'table', 'code', 'horizontal-rule', '|',
            'preview', 'side-by-side', 'fullscreen', '|',
            'guide'
        ],
        status: ['autosave', 'lines', 'words', 'cursor'],
        renderingConfig: {
            singleLineBreaks: true,
            codeSyntaxHighlighting: false,
        },
        previewRender: function(plainText) {
            // Custom preview render function
            const html = marked.parse(plainText);
            setTimeout(enhancePreview, 0); // Schedule enhancement after render
            return html;
        }
    });

    // Initialize with default content
    const defaultContent = `# Hello, World!

This is a **markdown** sample.

## Features
- Bold text
- *Italic text*
- Lists
- [Links](https://example.com)

> Blockquotes are also supported

## Tables

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

## Code Blocks

\`\`\`javascript
// Code blocks too!
function hello() {
    console.log("Hello, world!");
}
\`\`\`

## Images

![Sample Image](https://via.placeholder.com/150)

---

### Additional formatting

You can also use ~~strikethrough~~ and ==highlighted text==.
`;

    // Set the editor content
    editor.value(defaultContent);

    // Update preview on load
    updatePreview();

    // Editor change event
    editor.codemirror.on('change', function() {
        updatePreview();
    });

    // Handle style changes
    fontFamily.addEventListener('change', updateStyles);
    fontSize.addEventListener('change', updateStyles);
    pageSize.addEventListener('change', updateStyles);
    marginSize.addEventListener('change', updateStyles);



    function updateStyles() {
        styleOptions = {
            fontFamily: fontFamily.value,
            fontSize: fontSize.value,
            pageSize: pageSize.value,
            marginSize: marginSize.value
        };

        // Apply styles to preview
        applyStylesToPreview();
    }

    function applyStylesToPreview() {


        // Apply font family and size
        printPreview.style.fontFamily = styleOptions.fontFamily;
        printPreview.style.fontSize = `${styleOptions.fontSize}pt`;



        // Apply page size (just visual cues for now)
        switch(styleOptions.pageSize) {
            case 'A4':
                printPreview.style.width = '210mm';
                printPreview.style.minHeight = '297mm';
                break;
            case 'Letter':
                printPreview.style.width = '8.5in';
                printPreview.style.minHeight = '11in';
                break;
            case 'Legal':
                printPreview.style.width = '8.5in';
                printPreview.style.minHeight = '14in';
                break;
        }

        // Apply margins
        switch(styleOptions.marginSize) {
            case 'narrow':
                printPreview.style.padding = '0.5in';
                break;
            case 'normal':
                printPreview.style.padding = '1in';
                break;
            case 'wide':
                printPreview.style.padding = '1.5in';
                break;
        }
    }

    // Modal controls
    previewBtn.addEventListener('click', showPrintPreview);
    closeBtn.addEventListener('click', () => {
        previewModal.style.display = 'none';
    });
    window.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.style.display = 'none';
        }
    });

    function showPrintPreview() {
        // Generate print preview
        const markdownText = editor.value();
        printPreview.innerHTML = marked.parse(markdownText);

        // Apply current styles
        applyStylesToPreview();

        // Show modal
        previewModal.style.display = 'block';

        // Enhance preview with styling
        document.querySelectorAll('#print-preview pre code').forEach(block => {
            block.classList.add('code-block');
        });

        document.querySelectorAll('#print-preview blockquote').forEach(quote => {
            quote.classList.add('styled-blockquote');
        });

        document.querySelectorAll('#print-preview table').forEach(table => {
            table.classList.add('styled-table');
        });

        document.querySelectorAll('#print-preview img').forEach(img => {
            img.classList.add('responsive-img');
        });
    }

    // Handle download button click
    downloadBtn.addEventListener('click', convertToDocx);

    function updatePreview() {
        const markdownText = editor.value();

        // Use the same marked configuration as the server
        if (!editor.isPreviewActive()) {
            preview.innerHTML = marked.parse(markdownText);
            enhancePreview();
        }
    }

    function enhancePreview() {
        // Apply syntax highlighting to code blocks if needed
        document.querySelectorAll('#preview pre code, .editor-preview pre code').forEach(block => {
            // You could add a syntax highlighter library here if desired
            block.classList.add('code-block');
        });

        // Add classes to elements for better styling
        document.querySelectorAll('#preview blockquote, .editor-preview blockquote').forEach(quote => {
            quote.classList.add('styled-blockquote');
        });

        document.querySelectorAll('#preview table, .editor-preview table').forEach(table => {
            table.classList.add('styled-table');
        });

        // Style images
        document.querySelectorAll('#preview img, .editor-preview img').forEach(img => {
            img.classList.add('responsive-img');
        });
    }

    function convertToDocx() {
        const markdownText = editor.value();

        // Add style options to the request

        if (!markdownText.trim()) {
            alert('Please enter some markdown text first');
            return;
        }

        console.log('Sending markdown text of length:', markdownText.length);
        console.log('First 100 characters of markdown:', markdownText.substring(0, 100));

        // Create form data to send to server
        const formData = new FormData();
        formData.append('markdown', markdownText);

        // Add style options
        formData.append('fontFamily', styleOptions.fontFamily);
        formData.append('fontSize', styleOptions.fontSize);
        formData.append('pageSize', styleOptions.pageSize);
        formData.append('marginSize', styleOptions.marginSize);

        // Log FormData contents (for debugging)
        console.log('FormData created with markdown field');

        // Alternative approach using JSON
        const jsonData = JSON.stringify({ markdown: markdownText });
        console.log('JSON data created as fallback:', jsonData.substring(0, 100) + '...');

        // Show loading state
        downloadBtn.textContent = 'Converting...';
        downloadBtn.disabled = true;

        // Try sending as FormData first
        console.log('Sending request to /convert endpoint with FormData');
        fetch('http://localhost:3001/convert', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error('Server returned status: ' + response.status);
            }
            return response.blob();
        })
        .then(blob => {
            console.log('Received blob of type:', blob.type, 'and size:', blob.size);
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'document.docx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            // Reset button
            downloadBtn.textContent = 'Convert to DOCX';
            downloadBtn.disabled = false;
        })
        .catch(error => {
            console.error('Error with FormData approach:', error);

            // Try again with JSON if FormData failed
            console.log('Trying again with JSON approach');
            fetch('http://localhost:3001/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: jsonData
            })
            .then(response => {
                console.log('JSON approach - Response status:', response.status);
                if (!response.ok) {
                    throw new Error('Server returned status: ' + response.status);
                }
                return response.blob();
            })
            .then(blob => {
                console.log('JSON approach - Received blob of type:', blob.type, 'and size:', blob.size);
                // Create download link
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'document.docx';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);

                // Reset button
                downloadBtn.textContent = 'Convert to DOCX';
                downloadBtn.disabled = false;
            })
            .catch(jsonError => {
                console.error('Error with JSON approach:', jsonError);
                // Reset button
                downloadBtn.textContent = 'Convert to DOCX';
                downloadBtn.disabled = false;
                alert('Error converting file: ' + error.message + '\n\nAlso tried JSON approach but got: ' + jsonError.message);
            });
        });
    }
});
