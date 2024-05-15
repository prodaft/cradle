import Prism from 'prismjs';
import { markedHighlight } from "marked-highlight";
import { Marked } from "marked";
import "prismjs/themes/prism-tomorrow.css"; // Theme for syntax highlighting

// Currently, the default configuration is being used
// Documentation: https://github.com/markedjs/marked
const marked = new Marked(
    markedHighlight({
        highlight(code, lang) {
            const language = Prism.languages[lang] ? lang : 'plaintext';
            return Prism.highlight(code, Prism.languages[language], language);
        },
    })
);
  
export default marked;