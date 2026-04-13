export interface CrawlFormErrors {
  url?: string;
  devDomain?: string;
  excludePatterns?: string;
  username?: string;
  password?: string;
}

export interface CrawlFormValues {
  url: string;
  devDomain: string;
  excludePatterns: string;
  useAuth: boolean;
  username: string;
  password: string;
}

function isValidHttpUrl(value: string): boolean {
  // 制御文字・空白文字が含まれている場合は無効（new URL() が正規化してしまうため先に弾く）
  if (/[\s\x00-\x1f\x7f]/.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidExcludePattern(pattern: string): boolean {
  // crawler.ts と同じ変換（* → .*）を施してから正規表現として有効か検証する
  try {
    new RegExp(pattern.replace(/\*/g, '.*'));
    return true;
  } catch {
    return false;
  }
}

export function validateCrawlForm(values: CrawlFormValues): CrawlFormErrors {
  const errors: CrawlFormErrors = {};

  if (!values.url) {
    errors.url = 'URLを入力してください';
  } else if (!isValidHttpUrl(values.url)) {
    errors.url = '有効なURL（http:// または https://）を入力してください';
  }

  if (values.devDomain && !isValidHttpUrl(values.devDomain)) {
    errors.devDomain = '有効なURL（http:// または https://）を入力してください';
  }

  if (values.excludePatterns.length > 1000) {
    errors.excludePatterns = '除外パターンは1000文字以内で入力してください';
  } else {
    const patterns = values.excludePatterns
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    const invalidPattern = patterns.find((p) => !isValidExcludePattern(p));
    if (invalidPattern) {
      errors.excludePatterns = `除外パターンに無効な正規表現が含まれています: "${invalidPattern}"`;
    }
  }

  if (values.useAuth) {
    if (!values.username.trim()) {
      errors.username = 'ユーザー名を入力してください';
    }
    if (!values.password) {
      errors.password = 'パスワードを入力してください';
    }
  }

  return errors;
}

export function hasErrors(errors: CrawlFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
