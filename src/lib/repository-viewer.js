import {fetchRepoTree, fetchFile} from "./github-utils";
import {decompress} from "./decompressor";
import {LatexToSvgConverter} from "./latex2svg";

// Utility Class to handle the repository and file operations
export class RepositoryViewer {
    url;
    repo;
    view;
    path;
    displayData;
    displayName;
    isMarkdown;
    isExcalidraw;
    tree;

    constructor(url, owner, repo, path, sha) {
        this.url = url;
        this.repo = `${owner}/${repo}`;
        if (sha) {
            this.view = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${sha}`;
        } else if (path) {
            this.view = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        }
        this.path = path;
        this.displayData = "";
        this.displayName = "";
        this.isMarkdown = false;
        this.tree = [];
    }

    async initialize() {
        try {
            this.tree = await this.fetchAndBuildTree();
            const res = await this.fetchFileData();
            if (res) {
                return res;
            }
        } catch (error) {
            console.error("Initialization error:", error);
        }
    }

    async fetchFileData() {
        if (!this.view)
            return;

        try {
            const fileData = await fetchFile(this.view);

            if (fileData.message) {
                throw new Error(`Github API error (${fileData.status} ${fileData.message})`);
            }
            const content = atob(fileData.content);
            this.displayData = new TextDecoder("utf-8").decode(
                Uint8Array.from(content, (c) => c.charCodeAt(0)),
            );

            this.path = this.path ? this.path : fileData.path;
            this.displayName = this.path.split("/").pop();
            this.isMarkdown = this.path.endsWith(".md");

            if (this.isMarkdown) {
                this.displayName = this.displayName.replace(".md", "");
                this.isExcalidraw = this.displayData.includes("excalidraw-plugin: parsed");
                if (this.isExcalidraw) {
                    await this.processExcalidraw();
                    return;
                }
                this.displayData = this.formatMarkdown(this.displayData);
            } else {
                const fileExtension = this.path.split(".").pop();
                let contentType;

                switch (fileExtension) {
                    case "html":
                        contentType = "text/html";
                        break;
                    case "css":
                        contentType = "text/css";
                        break;
                    case "js":
                        contentType = "application/javascript";
                        break;
                    case "json":
                        contentType = "application/json";
                        break;
                    case "txt":
                        contentType = "text/plain";
                        break;
                    case "png":
                        contentType = "image/png";
                        break;
                    case "jpg":
                    case "jpeg":
                        contentType = "image/jpeg";
                        break;
                    case "gif":
                        contentType = "image/gif";
                        break;
                    case "svg":
                        contentType = "image/svg+xml";
                        break;
                        case "pdf":
                        contentType = "application/pdf";
                        break;
                    default:
                        contentType = "application/octet-stream";
                }

                if (contentType.startsWith("image/")) {
                    const blob = new Blob(
                        [
                            Uint8Array.from(atob(fileData.content), (c) =>
                                c.charCodeAt(0),
                            ),
                        ],
                        {type: contentType},
                    );
                    return new Response(blob, {
                        headers: {
                            "Content-Type": contentType,
                        },
                    });
                } else if (fileExtension === "pdf") {
                    const blob = new Blob(
                        [
                            Uint8Array.from(atob(fileData.content), (c) =>
                                c.charCodeAt(0),
                            ),
                        ],
                        {type: "application/pdf"},
                    );
                    return new Response(blob, {
                        headers: {
                            "Content-Type": "application/pdf",
                        },
                    });
                } else {
                    return new Response(content, {
                        headers: {
                            "Content-Type": contentType,
                        },
                    });
                }
            }
        } catch (error) {
            this.displayName = "Open a file";
            this.displayData = this.formatMarkdown(`Open a file to get started. \nIf you opened a file and still see an error, please report it.\n\n${error}`);
        }
    }

    findFilePathInTree(filename) {
        const stack = [...this.tree];

        while (stack.length) {
            const node = stack.pop();

            if (!node.children) {
                // Check if it's a file and matches the filename
                const nodeName = node.name.endsWith(".md")
                    ? node.name.slice(0, -3)
                    : node.name;
                if (nodeName === filename) {
                    return node; // Return the node containing the path and URL
                }
            } else {
                // Add children to stack for further search
                stack.push(...node.children);
            }
        }

        return null; // Not found
    };

    formatMarkdown(markdown) {
        const smilesCodeBlockRegex = /```smiles\s+([\s\S]*?)```/gm;
        const wikilinkRegex = /\[\[([^\]]+)]]/g;
        const imageWikiLinkRegex = /!\[\[([^\]]+)]]/g;

        // First replace image wikilinks
        const replaceImageWikilinks = (match, content) => {
            const filename = content.trim();

            const fileNode = this.findFilePathInTree(filename);

            if (fileNode) {
                if (fileNode.name.endsWith(".md")) {
                    // Use iframe with the query param raw=true to render markdown files
                    return `<iframe src="/app/${this.repo}/${fileNode.path}?sha=${fileNode.sha}&raw=true" title="${filename}" class="markdown-iframe" width="100%" style="min-height: 600px"></iframe>\n\n`;
                }
                return `<img src="${fileNode.url}" title="${filename}" alt="${filename}"/>\n\n`;
            } else {
                return `<img src="https://http.cat/404" title="Not found" alt="Not found"/>\n\n`; // Fallback if file isn't found
            }
        }

        markdown = markdown.replace(imageWikiLinkRegex, replaceImageWikilinks);

        const replaceWikilinks = (match, content) => {
            if (content.startsWith("#")) {
                // Handle heading links
                const heading = content.slice(1).trim();
                return `[${heading}](#${encodeURIComponent(heading)})`;
            } else {
                // Handle file links
                const filename = content.trim();

                const fileNode = this.findFilePathInTree(filename);

                if (fileNode) {
                    // Uses anchor because of diacritics in filenames
                    const url = `/app/${this.repo}/${fileNode.path}?sha=${fileNode.sha}`;
                    return `<a href="${url}">${filename}</a>`;
                } else {
                    return `[${filename}](#file-not-found)`; // Fallback if file isn't found
                }
            }
        };

        // Replace smiles code blocks first
        let processedMarkdown = markdown.replace(
            smilesCodeBlockRegex,
            (match, smilesContent) => {
                const trimmedSmiles = smilesContent.trim();
                return `\n\n<svg data-smiles="${trimmedSmiles}" />\n\n`;
            },
        );

        // Replace wikilinks
        processedMarkdown = processedMarkdown.replace(
            wikilinkRegex,
            replaceWikilinks,
        );

        return processedMarkdown;
    }

    async fetchAndBuildTree() {
        const [owner, repoName] = this.repo.split("/").slice(-2);
        let tree = await fetchRepoTree(owner, repoName);

        tree = tree.filter((f) => !f.path.startsWith("."));
        return this.buildNestedTree(tree);
    }

    buildNestedTree(tree) {

        const root = [];
        const findOrCreateFolder = (level, name, path, sha = null) => {
            let folder = level.find(
                (item) => item.name === name && item.children,
            );
            if (!folder) {
                folder = {name, path, children: [], sha};
                level.push(folder);
            }
            return folder;
        };

        const addFile = (level, name, path, sha) => {
            level.push({name, path, sha});
        };

        tree.forEach((node) => {
            const parts = node.path.split("/");
            let currentLevel = root;
            let currentPath = "";

            parts.forEach((part, index) => {
                const isLastPart = index === parts.length - 1;
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (isLastPart) {
                    node.mode === "040000"
                        ? findOrCreateFolder(
                            currentLevel,
                            part,
                            currentPath,
                            node.sha,
                        )
                        : addFile(currentLevel, part, currentPath, node.sha);
                } else {
                    currentLevel = findOrCreateFolder(
                        currentLevel,
                        part,
                        currentPath,
                    ).children;
                }
            });
        });

        return root;
    }

    buildTreeHtml(tree, openPath = "") {
        const buildNode = (node, currentPath) => {
            const isOpen = openPath && openPath.startsWith(currentPath);
            if (node.children) {
                return `
                    <div class="folder ${isOpen ? "open" : ""}">
                        <button class="toggle">${node.name}</button>
                        <div class="nested">
                            ${node.children
                    .map((child) =>
                        buildNode(
                            child,
                            `${currentPath}/${child.name}`,
                        ),
                    )
                    .join("")}
                        </div>
                    </div>
                `;
            }

            return `
                <div class="file">
                    <a href="/app/${this.repo}/${node.path}?sha=${node.sha}">${node.name}</a>
                </div>
            `;
        };

        return `<div class="tree">${tree.map((node) => buildNode(node, node.path)).join("")}</div>`;
    }

    async processExcalidraw() {
        this.isMarkdown = false;
        // ```compressed-json parse in code block
        const start = this.displayData.indexOf("```compressed-json");
        const end = this.displayData.indexOf("```", start + 1);

        // Get attached files, between ## Embedded Files and %%
        const startFiles = this.displayData.indexOf("## Embedded Files");
        const endFiles = this.displayData.indexOf("%%", startFiles + 1);
        const files = this.displayData.slice(startFiles + 19, endFiles)
            .split("\n")
            .filter((f) => f.trim().length !== 0)
            .reduce((acc, f) => {
                const [key, value] = f.split(": ");
                acc[key] = value;
                return acc;
            }, {});

        this.displayData = this.displayData.slice(start + 18, end);
        // Decompress the display data to json using lz string
        this.displayData = JSON.parse(decompress(this.displayData));

        if (files["tags"])
            return;

        let converter = null;

        let resultFiles = {};

        console.log(files);

        let index = 0;
        // Loop through the files, if the file is a wiki link, parse the url and fetch the file blob, then return data url
        for (const key in files) {
            if (files.hasOwnProperty(key)) {
                const file = files[key];
                if (file.startsWith("[[")) {
                    let filename = file.slice(2, -2);
                    if (filename.includes("#")) {
                        filename = filename.split("#")[0];
                    }

                    const fileNode = this.findFilePathInTree(filename);

                    if (fileNode) {
                        let fileData = await fetch(`https://api.github.com/repos/${this.repo}/git/blobs/${fileNode.sha}`)

                        if (fileData.message) {
                            throw new Error(`Github API error (${fileData.status} ${fileData.message})`);
                        }
                        fileData = await fileData.json();

                        const contentBase64 = fileData.content; // Base64 content

                        let fileType = filename.split('.').pop(); // Get file extension (e.g., png, jpg)

                        // Determine MIME type based on file extension
                        const mimeTypes = {
                            png: 'image/png',
                            jpg: 'image/jpeg',
                            jpeg: 'image/jpeg',
                            gif: 'image/gif',
                            svg: 'image/svg+xml',
                            pdf: 'application/pdf'
                        };
                        const mimeType = mimeTypes[fileType] || 'application/octet-stream';

                        // Create a data URL
                        const dataURL = `data:${mimeType};base64,${contentBase64}`.replaceAll('\n', '');
                        resultFiles["file-" + index] = {dataURL, mimeType, id: "file-" + index, created: Date.now()};
                    }
                } else if (file.startsWith("$")) {
                    const latex = file.substring(2, file.length - 2);
                    if (!converter)
                        converter = new LatexToSvgConverter();
                    let svg = converter.convert(latex);
                    resultFiles["file-" + index] = {dataURL: svg, mimeType: "image/svg+xml", id: "file-" + index, created: Date.now()};
                }

                index++;
            }
        }



        // Go through displayData and elements. Replace all elements with fileId based on index
        index = 0;
        for (const key in this.displayData.elements) {
            if (this.displayData.elements.hasOwnProperty(key)) {
                const element = this.displayData.elements[key];
                if (element.fileId) {
                    element.fileId = "file-" + index;
                    console.log(element)
                    resultFiles["file-" + index].size = {
                        width: element.width,
                        height: element.height
                    }
                    index++;
                }
            }
        }

        this.displayData.files = resultFiles;
    }
}