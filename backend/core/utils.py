#!/usr/bin/env python
# coding=utf-8
# License: Public domain (CC0)
# Isaac Turner 2016/12/05

from __future__ import print_function

import difflib
import re

_no_eol = "\ No newline at end of file"
_hdr_pat = re.compile("^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@$")


def make_patch(a, b):
    """
    Get unified string diff between two strings. Trims top two lines.
    Returns empty string if strings are identical.
    """
    diffs = difflib.unified_diff(a.splitlines(True), b.splitlines(True), n=0)
    try:
        _, _ = next(diffs), next(diffs)
    except StopIteration:
        pass
    # diffs = list(diffs); print(diffs)
    return "".join([d if d[-1] == "\n" else d + "\n" + _no_eol + "\n" for d in diffs])


def apply_patch(s, patch, revert=False):
    """
    Apply patch to string s to recover newer string.
    If revert is True, treat s as the newer string, recover older string.
    """
    s = s.splitlines(True)
    p = patch.splitlines(True)
    t = ""
    i = sl = 0
    (midx, sign) = (1, "+") if not revert else (3, "-")
    while i < len(p) and p[i].startswith(("---", "+++")):
        i += 1  # skip header lines
    while i < len(p):
        m = _hdr_pat.match(p[i])
        if not m:
            raise Exception("Bad patch -- regex mismatch [line " + str(i) + "]")
        l = int(m.group(midx)) - 1 + (m.group(midx + 1) == "0")
        if sl > l or l > len(s):
            raise Exception("Bad patch -- bad line num [line " + str(i) + "]")
        t += "".join(s[sl:l])
        sl = l
        i += 1
        while i < len(p) and p[i][0] != "@":
            if i + 1 < len(p) and p[i + 1][0] == "\\":
                line = p[i][:-1]
                i += 2
            else:
                line = p[i]
                i += 1
            if len(line) > 0:
                if line[0] == sign or line[0] == " ":
                    t += line[1:]
                sl += line[0] != sign
    t += "".join(s[sl:])
    return t
