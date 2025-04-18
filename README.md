# Markdown to DOCX Converter

A web-based tool that allows you to write and preview Markdown content and convert it to a downloadable DOCX file.

## Features

- Live Markdown preview
- Convert Markdown to DOCX with a single click
- Responsive design
- Supports all common Markdown syntax

## Installation

1. Make sure you have [Node.js](https://nodejs.org/) installed (version 14 or higher)
2. Clone this repository or download the files
3. Install the dependencies:

```bash
npm install
```

## Usage

1. Start the server:

```bash
npm start
```

2. Open your browser and navigate to http://localhost:3000
3. Enter your Markdown content in the left panel
4. Preview your content in real-time on the right panel
5. Click the "Convert to DOCX" button to download your content as a Word document

## Development

For development with auto-restart:

```bash
npm run dev
```

## Dependencies

- Express - Web server framework
- Marked - Markdown to HTML conversion
- html-docx-js - HTML to DOCX conversion
- Multer - Form data handling

## License

MIT 