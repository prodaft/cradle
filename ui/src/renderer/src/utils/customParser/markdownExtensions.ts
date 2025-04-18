import QueryString from 'qs';
import type MarkdownIt from 'markdown-it';
import type { Token } from 'markdown-it';

export interface FileData {
    minio_file_name: string;
    file_name: string;
    bucket_name: string;
}

const entryMarkdownColors = {
    entities: 'text-[#744abf]',
    artifacts: 'text-[#e66100]',
};

function createDashboardLink({
    name,
    subtype,
}: {
    name: string;
    subtype: string;
}): string {
    return name && subtype
        ? `/dashboards/${encodeURIComponent(subtype)}/${encodeURIComponent(name)}/`
        : '/not-found';
}

function createDownloadPath(file: FileData, axiosInstance: Axios): string {
    const baseURL = axiosInstance.defaults.baseURL;
    const { minio_file_name, bucket_name } = file;
    const queryParams = QueryString.stringify({
        bucketName: bucket_name,
        minioFileName: minio_file_name,
    });
    return `${baseURL}/file-transfer/download/?${queryParams}`;
}

export function prependLinks(
    mdContent: string,
    fileData: FileData[],
    axiosInstance: Axios,
): string {
    const mdLinks = fileData
        .map(
            (file) =>
                `[${file.minio_file_name}]: ${createDownloadPath(file, axiosInstance)} "${file.file_name}"\n\n`,
        )
        .join('');
    return mdLinks + mdContent;
}

const LINK_REGEX =
    /^\[\[([^:|]+?):((?:\\[[\]|]|[^[\]|])+?)(?:\|((?:\\[[\]|]|[^[\]|])+?))?\]\]/;

export function cradleLinkRule(state: any, silent: boolean): boolean {
    const match = LINK_REGEX.exec(state.src.slice(state.pos));
    if (!match) return false;
    if (silent) return false;
    const token = state.push('cradle_link', '', 0);
    token.markup = match[0];
    token.cradle_type = match[1];
    token.cradle_name = match[2];
    token.cradle_alias = match[3];
    state.pos += match[0].length;
    return true;
}

export function renderCradleLink(
    entryColors: Map<string, string>,
    token: Token,
): string {
    const type = (token as any).cradle_type;
    const name = (token as any).cradle_name;
    const alias = (token as any).cradle_alias;
    const displayedName = alias || name;
    const url = createDashboardLink({ name, subtype: type });
    const colorClass = entryColors.get(type) || '#000000';
    return `<a style="color: ${colorClass};" href="${url}" data-custom-href="${url}">${displayedName}</a>`;
}

let DownloadLinkPromiseCache: Record<
    string,
    Promise<{ presigned: string; expiry: number }>
> = {};
let MinioCache: Record<string, { presigned: string; expiry: number }> = {};

export function fetchMinioDownloadLink(
    href: string,
    axiosInstance: Axios,
): Promise<{ presigned: string; expiry: number }> {
    if (!DownloadLinkPromiseCache[href]) {
        DownloadLinkPromiseCache[href] = axiosInstance.get(href).then((response) => {
            const { presigned, expiry } = response.data;
            return { presigned, expiry };
        });
    }
    return DownloadLinkPromiseCache[href];
}

export async function resolveMinioLinks(
    token: Token,
    axiosInstance: Axios,
): Promise<void> {
    if (token.type === 'link_open' || token.type === 'image') {
        let hrefIndex = token.attrIndex('href');
        hrefIndex = hrefIndex < 0 ? token.attrIndex('src') : hrefIndex;
        if (hrefIndex < 0) return;
        const href = token.attrs![hrefIndex][1];
        try {
            new URL(href);
        } catch {
            return;
        }
        const url = new URL(href);
        const baseUrlStr = axiosInstance.defaults.baseURL || '';
        if (!baseUrlStr) return;
        const apiBaseUrl = new URL(baseUrlStr);
        const apiBasePath = apiBaseUrl.pathname.replace(/\/$/, '');

        if (
            url.origin === apiBaseUrl.origin &&
            url.pathname === `${apiBasePath}/file-transfer/download/`
        ) {
            const apiDownloadPath = url.href;
            let cached = MinioCache[apiDownloadPath];
            let presigned: string | undefined = cached?.presigned;
            let expiry: number | undefined = cached?.expiry;
            if (!presigned || Date.now() > (expiry || 0)) {
                const result = await fetchMinioDownloadLink(url.href, axiosInstance);
                presigned = result.presigned;
                expiry = result.expiry;
                MinioCache[apiDownloadPath] = { presigned, expiry };
            }
            token.attrs![hrefIndex][1] = presigned;
        }
    }
}

export async function processTokens(
    tokens: Token[],
    axiosInstance: Axios,
): Promise<void> {
    for (const token of tokens) {
        await resolveMinioLinks(token, axiosInstance);
        if (token.children) {
            await processTokens(token.children, axiosInstance);
        }
    }
}

export async function parseWithExtensions(
    md: MarkdownIt,
    mdContent: string,
    fileData: FileData[] | undefined,
    entryColors: Map<string, string>,
    axiosInstance: Axios,
): Promise<string> {
    DownloadLinkPromiseCache = {};
    md.inline.ruler.before('link', 'cradle_link', cradleLinkRule);
    md.renderer.rules.cradle_link = (tokens: Token[], idx: number) =>
        renderCradleLink(entryColors, tokens[idx]);
    const content = fileData
        ? prependLinks(mdContent, fileData, axiosInstance)
        : mdContent;
    const tokens = md.parse(content, {});
    await processTokens(tokens, axiosInstance);
    return md.renderer.render(tokens, md.options);
}
