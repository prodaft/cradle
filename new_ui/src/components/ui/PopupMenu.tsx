import * as React from "react";
import * as ReactDOM from "react-dom/client";

/** @hidden @internal */
interface PopupMenuItem {
    name: string;
    callback: (event: React.MouseEvent<HTMLElement, MouseEvent>) => Promise<[string, boolean]>;
}

/** @hidden @internal */
export function showPopup(
    title: string | null,
    layoutDiv: HTMLElement,
    x: number, y: number,
    items: PopupMenuItem[],
) {
    const currentDocument = layoutDiv.ownerDocument;
    const layoutRect = layoutDiv.getBoundingClientRect();

    const elm = currentDocument.createElement("div");
    elm.className = "flexlayout__popup_menu_container";

    if (x < layoutRect.left + layoutRect.width / 2) {
        elm.style.left = x - layoutRect.left + "px";
    } else {
        elm.style.right = layoutRect.right - x + "px";
    }

    if (y < layoutRect.top + layoutRect.height / 2) {
        elm.style.top = y - layoutRect.top + "px";
    } else {
        elm.style.bottom = layoutRect.bottom - y + "px";
    }

    layoutDiv.appendChild(elm);

    const onHide = (_item: string | undefined) => {
        layoutDiv.removeChild(elm);
        root.unmount();
        elm.removeEventListener("pointerdown", onElementPointerDown);
        currentDocument.removeEventListener("pointerdown", onDocPointerDown);
    };

    const onElementPointerDown = (event: Event) => {
        event.stopPropagation();
    };

    const onDocPointerDown = (_event: Event) => {
        onHide(undefined);
    };

    elm.addEventListener("pointerdown", onElementPointerDown);
    currentDocument.addEventListener("pointerdown", onDocPointerDown);

    const root = ReactDOM.createRoot(elm);
    root.render(<PopupMenu
        currentDocument={currentDocument}
        onHide={onHide}
        title={title}
        items={items} />);
}

/** @hidden @internal */
interface IPopupMenuProps {
    title: string | null;
    items: PopupMenuItem[];
    currentDocument: Document;
    onHide: (item: string | undefined) => void;
}

/** @hidden @internal */
const PopupMenu = (props: IPopupMenuProps) => {
    const { title, items, onHide } = props;
    const [itemStates, setItemStates] = React.useState<{[key: string]: string}>(
        items.reduce((acc, item) => ({ ...acc, [item.name]: item.name }), {})
    );

    const onItemClick = async (item: PopupMenuItem, event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        const [newName, shouldHide] = await item.callback(event);
        
        // Update the displayed name for this item
        setItemStates(prev => ({ ...prev, [item.name]: newName }));
        
        if (shouldHide) {
            onHide(item.name);
        }
        
        event.stopPropagation();
    };

    const itemElements = items.map((item) => (
        <div key={item.name}
            className="flexlayout__popup_menu_item"
            onClick={(event) => onItemClick(item, event)}>
            {itemStates[item.name]}
        </div>
    ));

    return (
        <div className="flexlayout__popup_menu">
            {title && <div className="flexlayout__popup_menu_title">{title}</div>}
            {itemElements}
        </div>);
};
