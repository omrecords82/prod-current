#!/usr/bin/env python3
"""extract-portal-api-calls.py — read-only.

Given a closure file (one path per line, produced by build-portal-closure.js),
scan each .ts/.tsx/.js/.jsx file for apiClient/omApi/axiosInstance calls and
emit normalized (method, path, callers) JSON to stdout.

Usage:
  node docs/analysis/portal-workshop-intake/tools/build-portal-closure.js > /tmp/closure.txt
  python3 docs/analysis/portal-workshop-intake/tools/extract-portal-api-calls.py /tmp/closure.txt > portal-api-map.json
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]

call_re = re.compile(
    r"(apiClient|api|omApi|axiosInstance)\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(\s*[`\'\"]([^`\'\"]+)[`\'\"]",
    re.IGNORECASE,
)


def norm(path: str) -> str:
    path = re.sub(r"\$\{[^}]*\}", ":param", path)
    return re.sub(r"\?.*$", "", path)


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: extract-portal-api-calls.py <closure-file>", file=sys.stderr)
        return 1

    closure = Path(sys.argv[1]).read_text().strip().splitlines()
    calls = []
    for rel in closure:
        if not rel.endswith((".ts", ".tsx", ".js", ".jsx")):
            continue
        try:
            body = (ROOT / rel).read_text()
        except OSError:
            continue
        for lineno, line in enumerate(body.splitlines(), 1):
            for match in call_re.finditer(line):
                _, method, path = match.groups()
                calls.append(
                    {
                        "method": method.upper(),
                        "path": path,
                        "file": rel,
                        "line": lineno,
                    }
                )

    groups: dict[tuple, list] = defaultdict(list)
    for c in calls:
        groups[(c["method"], norm(c["path"]))].append(c)

    out = [
        {
            "method": k[0],
            "path": k[1],
            "callers": sorted({c["file"] for c in v}),
            "call_count": len(v),
        }
        for k, v in sorted(groups.items(), key=lambda kv: (kv[0][1], kv[0][0]))
    ]
    json.dump(out, sys.stdout, indent=2)
    print(f"\n# unique endpoints: {len(out)} (total calls: {len(calls)})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
