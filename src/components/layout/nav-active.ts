function normalizePath(path: string): string {
  const withoutQueryOrHash = path.split(/[?#]/)[0] ?? "";
  return withoutQueryOrHash.replace(/\/+$/, "");
}

export function isNavItemActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  return current === target || current.startsWith(target + "/");
}
