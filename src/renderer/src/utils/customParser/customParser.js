import Prism from 'prismjs';
import { markedHighlight } from "marked-highlight";
import { Marked } from "marked";
import "prismjs/themes/prism-tomorrow.css";

const baseUrl = 'https://localhost:8000'; // TODO

// Define what url extension each entry type should have
const entryTypes = new Set([
    "ip",
    "domain",
    "url",
    "username",
    "password",
    "person",
    "social-media",
    "hash", 
    "tool",
    "cve",
    "ttp",
])

const metadataTypes = new Set([
    "crime",
    "industry",
    "country",
    "company",
])
    
const styleClasses = {
    actors: "text-purple-700",
    cases: "text-cyan-800",
    entries: "text-orange-600",
    metadata: "text-emerald-700 underline",
}

const regexes = {
    actors: /\[\[actor:([\w\s.:-]+)(?:\|([\w\s.:-]+))?\]\]/g,         // [[actor:name(|alias)]]
    cases: /\[\[case:([\w\s.:-]+)(?:\|([\w\s.:-]+))?\]\]/g,           // [[case:name(|alias)]]
    entries: /\[\[([\w\s.-]+):([\w\s.:-]+)(?:\|([\w\s.:-]+))?\]\]/g,  // [[entry-type:name(|alias)]]
    metadata: /\[\[([\w\s.-]+):([\w\s.:-]+)(?:\|([\w\s.:-]+))?\]\]/g, // [[metadata-type:name(|alias)]]
}

// Define how each case should be handled
const handlers = { 
    // Take the user to the actor's dashboard
    actors: (text) => {
        return text.replace(regexes.actors, (matched, name, alias) => {
            const url = `${baseUrl}/entities/actors/${encodeURIComponent(name)}/`
            // If an alias is provided, use it as the displayed name
            const displayedName = alias ? alias : name;
            return `<a class="${styleClasses.actors}" href="${url}">${displayedName}</a>`;
        })
    },
    // Take the user to the case's dashboard
    cases: (text) => {
        return text.replace(regexes.cases, (matched, name, alias) => {
            const url = `${baseUrl}/entities/cases/${encodeURIComponent(name)}/`
            // If an alias is provided, use it as the displayed name
            const displayedName = alias ? alias : name;
            return `<a class="${styleClasses.cases}" href="${url}">${displayedName}</a>`;
        })
    },
    // Take the user to the entry's dashboard
    entries: (text) => {
        return text.replace(regexes.entries, (matched, type, name, alias) => {
            if (entryTypes.has(type)) {
                const url = `${baseUrl}/entities/entries/${encodeURIComponent(name)}?subtype=${encodeURIComponent(type)}`
                // If an alias is provided, use it as the displayed name
                const displayedName = alias ? alias : name;
                return `<a class="${styleClasses.entries}" href="${url}">${displayedName}</a>`;
            } 

            return matched; 
        });
    },  
    // Metadata does not have a dashboard. Here just highlight the text
    metadata: (text) => {
        return text.replace(regexes.metadata, (matched, type, name, alias) => {
            if (metadataTypes.has(type)) {
                // If an alias is provided, use it as the displayed name
                const displayedName = alias ? alias : name;
                return `<span class="${styleClasses.metadata}">${displayedName}</span>`;
            } 

            return matched;
        });
    },
}

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

// Use a customer renderer
const renderer = {
    text(text) {
        // Loop through all type handlers and call them on the text
        Object.keys(handlers).forEach(key => {
            const handler = handlers[key];
            text = handler(text);
        });
      
        return text;
    },
};
marked.use({ renderer });
  
export default marked;