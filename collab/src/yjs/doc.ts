import * as Y from "yjs";

export function createDocFromContent(content: string): Y.Doc {
  const doc = new Y.Doc();
  const text = doc.getText("content");
  if (content) {
    text.insert(0, content);
  }
  return doc;
}

export function getDocContent(doc: Y.Doc): string {
  return doc.getText("content").toString();
}
