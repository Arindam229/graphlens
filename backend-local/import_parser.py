import re

# JS/TS — capture relative imports AND @scope/package workspace imports
JS_IMPORT    = re.compile(r'import\s+.*?\s+from\s+[\'"]((?:\.{1,2}|@)[^\'"]*)[\'"]')
JS_REQUIRE   = re.compile(r'require\s*\(\s*[\'"]((?:\.{1,2}|@)[^\'"]*)[\'"]')
# export { X } from './foo'  |  export * from './foo'  |  export * as ns from './foo'
JS_REEXPORT  = re.compile(r'export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+[\'"]((?:\.{1,2}|@)[^\'"]*)[\'"]')

# Python
PY_FROM_IMPORT     = re.compile(r'^from\s+([\w.]+)\s+import', re.MULTILINE)
PY_FROM_DOT_IMPORT = re.compile(r'^from\s+\.\s+import\s+([\w]+(?:\s*,\s*[\w]+)*)', re.MULTILINE)
PY_BARE_IMPORT     = re.compile(r'^import\s+([\w.]+)', re.MULTILINE)

# Go — single: import "pkg/path"  |  grouped: import (\n  "pkg/path"\n)
GO_IMPORT_SINGLE = re.compile(r'^import\s+"([^"]+)"', re.MULTILINE)
GO_IMPORT_BLOCK  = re.compile(r'\bimport\s*\(([^)]*)\)', re.DOTALL)
GO_QUOTED_PATH   = re.compile(r'"([^"]+)"')

# Rust — use crate::a::b  |  use super::x  |  use self::y
RUST_USE_INTERNAL = re.compile(r'^use\s+((?:crate|super|self)::[\w:]+)', re.MULTILINE)


def extract_imports(content: str, language: str) -> list:
    imports = []

    if language in ("js", "ts"):
        imports += JS_IMPORT.findall(content)
        imports += JS_REQUIRE.findall(content)
        imports += JS_REEXPORT.findall(content)

    elif language == "python":
        for names in PY_FROM_DOT_IMPORT.findall(content):
            for name in names.split(","):
                name = name.strip()
                if name:
                    imports.append(f".{name}")
        for module in PY_FROM_IMPORT.findall(content):
            if module != ".":
                imports.append(module)
        imports += PY_BARE_IMPORT.findall(content)

    elif language == "go":
        imports += GO_IMPORT_SINGLE.findall(content)
        for block in GO_IMPORT_BLOCK.findall(content):
            imports += GO_QUOTED_PATH.findall(block)

    elif language == "rust":
        imports += RUST_USE_INTERNAL.findall(content)

    return imports
