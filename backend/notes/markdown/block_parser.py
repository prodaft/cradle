import re
from mistune.block_parser import BlockParser


class NewlineAwareBlockParser(BlockParser):
    def parse_blank_line(self, m, state):
        state.append_token({"type": "blank_line", "content": m.group(0)})

        return m.end()
