import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';

export class LatexToSvgConverter {
    constructor() {
        this.adaptor = liteAdaptor();
        RegisterHTMLHandler(this.adaptor);

        this.tex = new TeX();
        this.svg = new SVG({ fontCache: 'none' });

        this.document = mathjax.document('', {
            InputJax: this.tex,
            OutputJax: this.svg
        });
    }

    convert(latexString) {
        const node = this.document.convert(latexString, {
            display: true
        });

        // Extract clean SVG string
        const svgString = this.adaptor.outerHTML(node).replace(/<mjx-container[^>]*>|<\/mjx-container>/g, '');

        // Encode SVG to Base64
        const base64Svg = btoa(svgString);
        return `data:image/svg+xml;base64,${base64Svg}`;
    }
}