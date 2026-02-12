import { parseHTML } from 'linkedom';

/**
 * クロスプラットフォーム対応のBase64エンコード（非ASCII文字対応）
 */
function encodeBase64(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

const MAX_REDIRECTS = 5;

export interface CrawlOptions {
  url: string;
  maxDepth?: number;
  username?: string;
  password?: string;
  excludePatterns?: string[];
}

export interface PageInfo {
  url: string;
  title: string;
  description: string;
}

export interface CrawlResult {
  url: string;
  title: string;
  description: string;
  depth: number;
  children: CrawlResult[];
}

/**
 * URLのパス深度を計算
 * 例: https://example.com/ → 0
 *     https://example.com/about → 1
 *     https://example.com/products/product-a → 2
 */
export function getUrlDepth(url: string): number {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p !== '');
    return pathParts.length;
  } catch (error) {
    return 0;
  }
}

/**
 * URLを正規化（相対パス→絶対パス変換）
 */
export function normalizeUrl(baseUrl: string, href: string): string | null {
  try {
    // 空文字やアンカーのみの場合は無視
    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return null;
    }

    // 絶対URLに変換
    const absoluteUrl = new URL(href, baseUrl);

    // フラグメント（#以降）を除去
    absoluteUrl.hash = '';

    // 末尾のスラッシュを統一（あってもなくても同じURLとして扱う）
    let normalized = absoluteUrl.href;
    if (normalized.endsWith('/') && normalized !== absoluteUrl.origin + '/') {
      normalized = normalized.slice(0, -1);
    }

    // 末尾のindex.htmlを除去して正規化
    if (normalized.endsWith('/index.html')) {
      normalized = normalized.slice(0, -11);
    }

    return normalized;
  } catch (error) {
    return null;
  }
}

/**
 * 同一ドメインかチェック
 */
export function isSameDomain(baseUrl: string, targetUrl: string): boolean {
  try {
    const base = new URL(baseUrl);
    const target = new URL(targetUrl);
    return base.hostname === target.hostname;
  } catch (error) {
    return false;
  }
}

/**
 * 除外パターンにマッチするかチェック
 */
export function shouldExclude(url: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => {
    // 簡易的なワイルドカードマッチング
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(url);
  });
}

/**
 * 非HTMLファイルの拡張子リスト
 */
const NON_HTML_EXTENSIONS = [
  // 画像
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff',
  // ドキュメント
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // 動画・音声
  '.mp4', '.mp3', '.avi', '.mov', '.wmv', '.flv', '.wav', '.ogg',
  // アーカイブ
  '.zip', '.rar', '.tar', '.gz', '.7z',
  // その他
  '.css', '.js', '.json', '.xml', '.txt', '.csv'
];

/**
 * URLが非HTMLファイルかどうかチェック（拡張子ベース）
 */
export function isNonHtmlUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    return NON_HTML_EXTENSIONS.some(ext => pathname.endsWith(ext));
  } catch {
    return false;
  }
}

/**
 * Content-TypeがHTMLかどうかチェック
 */
export function isHtmlContentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return contentType.includes('text/html');
}

/**
 * 単一ページのクロール
 */
export async function crawlPage(
  url: string,
  username?: string,
  password?: string
): Promise<{ title: string; description: string; links: string[] }> {
  const headers: Record<string, string> = {
    'User-Agent': 'SitemapCrawler/1.0'
  };

  // Basic認証
  if (username && password) {
    const credentials = encodeBase64(`${username}:${password}`);
    headers['Authorization'] = `Basic ${credentials}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    // リダイレクトを手動追従してAuthorizationヘッダーを維持
    let currentUrl = url;
    let response: Response | null = null;

    for (let i = 0; i < MAX_REDIRECTS; i++) {
      response = await fetch(currentUrl, {
        headers,
        signal: controller.signal,
        redirect: 'manual',
      });

      // リダイレクト (301, 302, 303, 307, 308)
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('Location');
        if (!location) {
          throw new Error(`リダイレクト ${response.status} にLocationヘッダーがありません`);
        }

        const redirectUrl = new URL(location, currentUrl).href;

        // 異なるドメインへのリダイレクト時はAuthorizationヘッダーを削除
        if (!isSameDomain(currentUrl, redirectUrl)) {
          delete headers['Authorization'];
        }

        currentUrl = redirectUrl;
        continue;
      }

      break;
    }

    if (!response) {
      throw new Error('レスポンスを受信できませんでした');
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('認証に失敗しました (HTTP 401)。ユーザー名とパスワードを確認してください。');
      }
      if (response.status === 403) {
        throw new Error('アクセスが拒否されました (HTTP 403)。権限が不足している可能性があります。');
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    const titleElement = document.querySelector('title');
    const title = titleElement?.textContent?.trim() || 'No Title';

    // Extract meta description
    const metaDescOG = document.querySelector('meta[property="og:description"]');
    const metaDescName = document.querySelector('meta[name="description"]');
    const descContent = metaDescOG?.getAttribute('content') || metaDescName?.getAttribute('content');
    const description = descContent?.trim() || '';

    const links: string[] = [];
    const anchorElements = document.querySelectorAll('a[href]');
    for (const elem of anchorElements) {
      const href = elem.getAttribute('href');
      if (href) {
        // リダイレクト後の最終URLをベースとして使用
        const normalizedUrl = normalizeUrl(currentUrl, href);
        if (normalizedUrl) {
          links.push(normalizedUrl);
        }
      }
    }

    // 重複を除去
    const uniqueLinks = Array.from(new Set(links));

    return { title, description, links: uniqueLinks };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * サイト全体をクロールして全URLを収集（フラットリスト）
 */
export async function crawlSiteFlat(
  startUrl: string,
  options: CrawlOptions
): Promise<Map<string, PageInfo>> {
  const {
    maxDepth = 3,
    username,
    password,
    excludePatterns = []
  } = options;

  const visited = new Set<string>();
  const pages = new Map<string, PageInfo>();
  const queue: string[] = [startUrl];

  while (queue.length > 0) {
    const currentUrl = queue.shift()!;

    // 訪問済みチェック
    if (visited.has(currentUrl)) {
      continue;
    }

    // 深度チェック（ルートURLからの階層）
    const depth = getUrlDepth(currentUrl);
    const rootDepth = getUrlDepth(startUrl);
    if (depth - rootDepth > maxDepth) {
      continue;
    }

    // 除外パターンチェック
    if (shouldExclude(currentUrl, excludePatterns)) {
      continue;
    }

    // 拡張子ベースの非HTMLファイルチェック
    if (isNonHtmlUrl(currentUrl)) {
      visited.add(currentUrl);
      continue;
    }

    visited.add(currentUrl);

    try {
      console.log(`クロール中: ${currentUrl}`);
      const { title, description, links } = await crawlPage(currentUrl, username, password);

      pages.set(currentUrl, { url: currentUrl, title, description });

      // 同一ドメインのリンクをキューに追加
      for (const link of links) {
        if (isSameDomain(startUrl, link) && !visited.has(link)) {
          queue.push(link);
        }
      }

      // サーバーへの負荷を考慮して少し待機
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`クロール失敗: ${currentUrl}`, errorMessage);
      // エラーが発生してもページ情報は保存（エラー詳細を含む）
      pages.set(currentUrl, { url: currentUrl, title: `Error: ${errorMessage}`, description: '' });
    }
  }

  return pages;
}

/**
 * URLが親URLの直接の子かチェック
 * 例:
 *   isDirectChild('/products', '/products/product-a') → true
 *   isDirectChild('/products', '/products/category/item') → false
 */
function isDirectChild(parentUrl: string, childUrl: string): boolean {
  try {
    const parent = new URL(parentUrl);
    const child = new URL(childUrl);

    // ドメインが異なる場合は子ではない
    if (parent.hostname !== child.hostname) {
      return false;
    }

    // パスを分割
    let parentPath = parent.pathname;
    let childPath = child.pathname;

    // 末尾のスラッシュを除去
    if (parentPath.endsWith('/') && parentPath !== '/') {
      parentPath = parentPath.slice(0, -1);
    }
    if (childPath.endsWith('/') && childPath !== '/') {
      childPath = childPath.slice(0, -1);
    }

    // 子が親で始まるかチェック
    if (!childPath.startsWith(parentPath)) {
      return false;
    }

    // パスの残り部分を取得
    const remainder = childPath.slice(parentPath.length);

    // ルートの特殊処理
    if (parentPath === '' || parentPath === '/') {
      const parts = childPath.split('/').filter(p => p !== '');
      return parts.length === 1;
    }

    // 残りが `/xxx` の形式（1階層だけ深い）かチェック
    const parts = remainder.split('/').filter(p => p !== '');
    return parts.length === 1;

  } catch (error) {
    return false;
  }
}

/**
 * 最も近い存在する祖先URLを探す
 */
function findClosestAncestor(
  childUrl: string,
  existingUrls: Set<string>,
  rootUrl: string
): string {
  try {
    const child = new URL(childUrl);
    const pathParts = child.pathname.split('/').filter(p => p !== '');

    // パスを1つずつ削って、存在する祖先を探す
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const ancestorPath = '/' + pathParts.slice(0, i).join('/');
      let ancestorUrl = child.origin + (ancestorPath || '/');

      // 末尾スラッシュを正規化
      if (ancestorUrl.endsWith('/') && ancestorUrl !== child.origin + '/') {
        ancestorUrl = ancestorUrl.slice(0, -1);
      }

      if (existingUrls.has(ancestorUrl)) {
        return ancestorUrl;
      }
    }

    // ルートURLも確認
    let normalizedRoot = rootUrl;
    if (normalizedRoot.endsWith('/') && normalizedRoot !== child.origin + '/') {
      normalizedRoot = normalizedRoot.slice(0, -1);
    }
    if (existingUrls.has(normalizedRoot)) {
      return normalizedRoot;
    }

    return rootUrl;
  } catch (error) {
    return rootUrl;
  }
}

/**
 * フラットなページリストを階層構造に変換
 */
export function buildHierarchy(
  pages: Map<string, PageInfo>,
  rootUrl: string
): CrawlResult {
  const urlArray = Array.from(pages.keys());
  const rootDepth = getUrlDepth(rootUrl);
  const existingUrls = new Set(urlArray);

  // URLを深度順にソート
  urlArray.sort((a, b) => {
    const depthA = getUrlDepth(a);
    const depthB = getUrlDepth(b);
    if (depthA !== depthB) {
      return depthA - depthB;
    }
    return a.localeCompare(b);
  });

  // ノードマップを作成（URLからCrawlResultへのマッピング）
  const nodeMap = new Map<string, CrawlResult>();

  // まず全てのノードを作成
  for (const url of urlArray) {
    const pageInfo = pages.get(url)!;
    const depth = getUrlDepth(url) - rootDepth;
    nodeMap.set(url, {
      url,
      title: pageInfo.title,
      description: pageInfo.description,
      depth,
      children: []
    });
  }

  // ルートURLを正規化
  let normalizedRootUrl = rootUrl;
  if (!nodeMap.has(normalizedRootUrl)) {
    // 末尾スラッシュなしで試す
    if (normalizedRootUrl.endsWith('/')) {
      const withoutSlash = normalizedRootUrl.slice(0, -1);
      if (nodeMap.has(withoutSlash)) {
        normalizedRootUrl = withoutSlash;
      }
    } else {
      // 末尾スラッシュありで試す
      const withSlash = normalizedRootUrl + '/';
      if (nodeMap.has(withSlash)) {
        normalizedRootUrl = withSlash;
      }
    }
  }

  // ルートノードを取得または作成
  let rootNode = nodeMap.get(normalizedRootUrl);
  if (!rootNode) {
    // ルートが見つからない場合は最初のURLをルートとして使用
    const firstUrl = urlArray[0];
    if (firstUrl) {
      rootNode = nodeMap.get(firstUrl)!;
      normalizedRootUrl = firstUrl;
    } else {
      return {
        url: rootUrl,
        title: 'No pages found',
        description: '',
        depth: 0,
        children: []
      };
    }
  }

  // 親子関係を構築
  for (const url of urlArray) {
    if (url === normalizedRootUrl) {
      continue;
    }

    const node = nodeMap.get(url)!;

    // 直接の親が存在するか確認
    let parentFound = false;
    for (const candidateParent of urlArray) {
      if (isDirectChild(candidateParent, url)) {
        const parentNode = nodeMap.get(candidateParent)!;
        parentNode.children.push(node);
        parentFound = true;
        break;
      }
    }

    // 直接の親が見つからない場合、最も近い祖先を探す
    if (!parentFound) {
      const ancestorUrl = findClosestAncestor(url, existingUrls, normalizedRootUrl);
      const ancestorNode = nodeMap.get(ancestorUrl);
      if (ancestorNode && ancestorUrl !== url) {
        ancestorNode.children.push(node);
      } else {
        // 祖先も見つからない場合はルートに追加
        rootNode.children.push(node);
      }
    }
  }

  return rootNode;
}

/**
 * メインのクロール関数（URL構造ベースの階層化）
 */
export async function crawlSite(options: CrawlOptions): Promise<CrawlResult> {
  const { url: startUrl } = options;

  // 1. サイト全体をクロールしてフラットリストを作成
  const pages = await crawlSiteFlat(startUrl, options);

  // 2. URL構造に基づいて階層構造を構築
  const hierarchy = buildHierarchy(pages, startUrl);

  return hierarchy;
}
