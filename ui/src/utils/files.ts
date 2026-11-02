/**
 * File upload and handling utilities
 */

/**
 * Upload a file to a presigned URL (e.g., MinIO)
 *
 * @param presignedUrl - The presigned URL for file upload
 * @param file - The file to upload
 * @param onProgress - Optional callback receiving the uploaded fraction (0..1)
 * @returns The response from the upload
 * @throws Error if the file upload fails
 */
export async function uploadFile(
    presignedUrl: string,
    file: File,
    onProgress?: (fraction: number) => void,
): Promise<Response> {
    if (onProgress) return uploadFileWithProgress(presignedUrl, file, onProgress);

    const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type || 'application/octet-stream',
        },
    });

    if (!response.ok) {
        const reason = [String(response.status), response.statusText]
            .filter(Boolean)
            .join(' ');
        throw new Error(`Storage upload failed (${reason}).`);
    }

    return response;
}

// fetch() has no upload progress events, so progress-reporting uploads go through XHR.
function uploadFileWithProgress(
    presignedUrl: string,
    file: File,
    onProgress: (fraction: number) => void,
): Promise<Response> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onProgress(event.loaded / event.total);
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                onProgress(1);
                resolve(new Response(null, { status: xhr.status }));
                return;
            }
            const reason = [String(xhr.status), xhr.statusText]
                .filter(Boolean)
                .join(' ');
            reject(new Error(`Storage upload failed (${reason}).`));
        };
        xhr.onerror = () => reject(new Error('Storage upload failed (network error).'));
        xhr.send(file);
    });
}

export function formatFileSize(bytes: number): string {
    if (bytes <= 0 || !Number.isFinite(bytes)) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export type FileKind =
    'executable' | 'archive' | 'capture' | 'document' | 'image' | 'other';

const EXTENSIONS_BY_KIND: Record<Exclude<FileKind, 'other'>, string> = {
    executable:
        'exe dll sys scr cpl ocx elf so dylib bin msi apk jar lnk hta ps1 vbs bat cmd',
    archive: 'zip 7z rar tar gz tgz bz2 xz cab iso img vhd vhdx dmg',
    capture: 'pcap pcapng cap evtx etl har',
    document:
        'pdf doc docx docm xls xlsx xlsm ppt pptx rtf txt md csv json xml html eml msg one',
    image: 'png jpg jpeg gif webp bmp svg ico',
};

const KIND_BY_EXTENSION = new Map<string, FileKind>(
    Object.entries(EXTENSIONS_BY_KIND).flatMap(([kind, exts]) =>
        exts.split(' ').map((ext) => [ext, kind as FileKind] as const),
    ),
);

const KIND_BY_MIME: Array<[RegExp, FileKind]> = [
    [/^image\//, 'image'],
    [
        /x-dosexec|x-executable|x-sharedlib|x-mach-binary|x-msdownload|portable-executable|x-pie-executable|java-archive|android\.package-archive/,
        'executable',
    ],
    [
        /zip|x-7z|x-rar|gzip|x-tar|x-bzip2|x-xz|iso9660|x-cpio|ms-cab|x-apple-diskimage/,
        'archive',
    ],
    [/pcap/, 'capture'],
    [
        /pdf|msword|officedocument|ms-excel|ms-powerpoint|rtf|json|xml|^text\/|^message\//,
        'document',
    ],
];

function fileExtension(name?: string | null): string {
    const match = name?.match(/\.([a-z0-9]{1,8})$/i);
    return match?.[1]?.toLowerCase() ?? '';
}

/** Category of a file, from its detected MIME type with the extension as fallback. */
export function getFileKind(mimeType?: string | null, name?: string | null): FileKind {
    if (mimeType && mimeType !== 'application/octet-stream') {
        const hit = KIND_BY_MIME.find(([pattern]) => pattern.test(mimeType));
        if (hit) return hit[1];
    }
    return KIND_BY_EXTENSION.get(fileExtension(name)) ?? 'other';
}

/** Short label for a file type tile, e.g. `DLL` or `PCAP`. */
export function getFileTypeLabel(name?: string | null): string {
    const ext = fileExtension(name);
    return ext && ext.length <= 4 ? ext.toUpperCase() : 'FILE';
}

/** Tailwind classes giving each file kind its tile colour. */
export const FILE_KIND_TONE: Record<FileKind, string> = {
    executable: 'bg-destructive/10 text-destructive',
    archive: 'bg-primary/10 text-primary',
    capture: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    document: 'bg-foreground/10 text-foreground/80',
    image: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    other: 'bg-foreground/10 text-muted-foreground',
};

/** Tag used as the reference label for a file, e.g. `[name][<id>-<name>]`. */
export function buildReferenceTag(file: { id?: string; name?: string | null }): string {
    return file.id && file.name ? `${file.id}-${file.name}` : (file.id ?? '');
}

export interface FileReferenceLocation {
    /** 1-based line number. */
    line: number;
    /** Document offset of the reference label. */
    pos: number;
}

/** Every place in `content` that references the file with `fileId` (by id or tag). */
export function findFileReferences(
    content: string,
    fileId?: string,
): FileReferenceLocation[] {
    if (!fileId || !content) return [];
    const needle = `[${fileId}`;
    const found: FileReferenceLocation[] = [];
    let line = 1;
    let lineStart = 0;
    let index = content.indexOf(needle);
    while (index !== -1) {
        for (let i = content.indexOf('\n', lineStart); i !== -1 && i < index;) {
            line++;
            lineStart = i + 1;
            i = content.indexOf('\n', lineStart);
        }
        found.push({ line, pos: index });
        index = content.indexOf(needle, index + needle.length);
    }
    return found;
}
