"""Block parser that preserves blank lines for markdown round-trip."""

from re import Match

from mistune.block_parser import BlockParser
from mistune.core import BlockState


class NewlineAwareBlockParser(BlockParser):
    """Block parser that preserves blank line content for markdown round-trip."""

    def parse_blank_line(self, m: Match[str], state: BlockState) -> int:
        """Preserve blank line content for markdown round-trip."""
        state.append_token({"type": "blank_line", "content": m.group(0)})
        return m.end()
