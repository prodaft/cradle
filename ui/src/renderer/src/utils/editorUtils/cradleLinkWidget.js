import { WidgetType } from '@codemirror/view';

/**
 * Widget to render Cradle links as clickable elements in the editor
 */
export class CradleLinkWidget extends WidgetType {
    constructor(type, name, alias, color, navigate, fullText, timestamp, hasPrefix) {
        super();
        this.type = type;
        this.name = name;
        this.alias = alias;
        this.color = color;
        this.navigate = navigate;
        this.fullText = fullText;
        this.timestamp = timestamp;
        this.hasPrefix = hasPrefix;
    }

    eq(other) {
        return other.type === this.type &&
            other.name === this.name &&
            other.alias === this.alias &&
            other.color === this.color &&
            other.timestamp === this.timestamp &&
            other.hasPrefix === this.hasPrefix;
    }

    toDOM(view) {
        const container = document.createElement('span');
        container.style.display = 'inline';
        container.className = 'cradle-link-widget-container';

        const linkSpan = this.createLinkElement();
        container.appendChild(linkSpan);

        if (this.timestamp) {
            const timestampSpan = this.createTimestampElement();
            container.appendChild(timestampSpan);
        }

        return container;
    }

    createLinkElement() {
        const linkSpan = document.createElement('span');
        const displayName = this.alias || this.name;
        const url = `/dashboards/${encodeURIComponent(this.type)}/${encodeURIComponent(this.name)}/`;

        linkSpan.textContent = displayName;
        linkSpan.style.color = this.color || '#FF8C00';
        linkSpan.style.cursor = 'pointer';
        linkSpan.style.textDecoration = 'underline';
        linkSpan.style.display = 'inline';
        linkSpan.setAttribute('data-link-url', url);
        linkSpan.setAttribute('data-link-full-text', this.fullText);
        linkSpan.className = 'cradle-link-widget';

        linkSpan.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.ctrlKey || e.metaKey) {
                this.navigate(url);
            }
        });

        linkSpan.addEventListener('mouseenter', () => {
            linkSpan.style.opacity = '0.8';
        });

        linkSpan.addEventListener('mouseleave', () => {
            linkSpan.style.opacity = '1';
        });

        return linkSpan;
    }

    createTimestampElement() {
        const timestampSpan = document.createElement('span');
        timestampSpan.textContent = this.timestamp;
        timestampSpan.style.color = this.color || '#FF8C00';
        timestampSpan.style.fontSize = '0.85em';
        timestampSpan.style.fontStyle = 'italic';
        timestampSpan.style.opacity = '0.7';
        timestampSpan.style.marginLeft = '4px';
        timestampSpan.style.textDecoration = 'underline';
        timestampSpan.style.display = 'inline';
        timestampSpan.className = 'cradle-link-timestamp';
        return timestampSpan;
    }

    ignoreEvent(e) {
        return e.type === 'mousedown';
    }
}
