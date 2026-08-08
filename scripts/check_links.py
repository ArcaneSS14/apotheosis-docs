from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


class ReferenceParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.references: list[str] = []

    def handle_starttag(self, _tag: str, attrs: list[tuple[str, str | None]]) -> None:
        for key, value in attrs:
            if key in {"href", "src"} and value:
                self.references.append(value)


def resolve_target(page: Path, site_root: Path, raw: str, base_path: str) -> Path | None:
    parsed = urlsplit(raw)
    if parsed.scheme or parsed.netloc or raw.startswith(("#", "javascript:", "mailto:", "tel:")):
        return None

    url_path = unquote(parsed.path)
    if not url_path:
        return None

    if url_path.startswith(base_path):
        target = site_root / url_path[len(base_path) :]
    elif url_path.startswith("/"):
        return Path("__outside_configured_base__")
    else:
        target = page.parent / url_path

    if url_path.endswith("/") or target.is_dir():
        target /= "index.html"

    return target.resolve()


def main() -> int:
    parser = argparse.ArgumentParser(description="Проверяет локальные ссылки собранного сайта MkDocs.")
    parser.add_argument("--site-dir", default="site", help="Каталог результата mkdocs build")
    parser.add_argument("--base-path", default="/", help="Базовый URL-путь GitHub Pages")
    args = parser.parse_args()

    site_root = Path(args.site_dir).resolve()
    base_path = "/" + args.base_path.strip("/") + "/" if args.base_path != "/" else "/"
    html_pages = list(site_root.rglob("*.html"))
    errors: list[str] = []
    checked = 0

    for page in html_pages:
        references = ReferenceParser()
        references.feed(page.read_text(encoding="utf-8"))

        for raw in references.references:
            target = resolve_target(page, site_root, raw, base_path)
            if target is None:
                continue

            checked += 1
            try:
                target.relative_to(site_root)
            except ValueError:
                errors.append(f"{page.relative_to(site_root)} -> {raw} (вне каталога сайта)")
                continue

            if not target.exists():
                errors.append(f"{page.relative_to(site_root)} -> {raw}")

    if errors:
        print("Найдены неразрешимые локальные ссылки:")
        print("\n".join(errors))
        return 1

    print(f"Проверено страниц: {len(html_pages)}, локальных ссылок и ресурсов: {checked}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
