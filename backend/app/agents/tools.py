from datetime import datetime, timezone
from html.parser import HTMLParser
from urllib.parse import quote_plus
from urllib.request import Request, urlopen

from app.config import get_settings


def get_current_time() -> str:
    """Return the current date and time in UTC."""
    return datetime.now(timezone.utc).strftime("%A, %B %d, %Y at %H:%M UTC")


class _SearchResultParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.results: list[dict[str, str]] = []
        self._capture: str | None = None
        self._current_text: list[str] = []
        self._current_result: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        class_name = attrs_dict.get("class", "")
        if tag == "a" and "result__a" in class_name:
            self._capture = "title"
            self._current_text = []
        elif "result__snippet" in class_name:
            self._capture = "snippet"
            self._current_text = []

    def handle_data(self, data: str) -> None:
        if self._capture:
            self._current_text.append(data.strip())

    def handle_endtag(self, tag: str) -> None:
        if not self._capture:
            return

        if (self._capture == "title" and tag == "a") or (self._capture == "snippet" and tag in {"a", "div"}):
            text = " ".join(part for part in self._current_text if part)
            if text:
                self._current_result[self._capture] = text
                if self._capture == "snippet":
                    self.results.append(self._current_result)
                    self._current_result = {}
            self._capture = None


def web_search(query: str) -> str:
    """Return short search-result titles for current-event questions."""
    settings = get_settings()
    if not settings.enable_web_search:
        return "Web search is disabled."

    url = f"https://duckduckgo.com/html/?q={quote_plus(query)}"
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=settings.web_search_timeout_seconds) as response:
        html = response.read().decode("utf-8", errors="ignore")

    parser = _SearchResultParser()
    parser.feed(html)
    results = parser.results[:5]
    if not results:
        return "No useful web search results were found."
    return "\n".join(
        f"{index + 1}. {result.get('title', 'Result')}: {result.get('snippet', '')}"
        for index, result in enumerate(results)
    )
