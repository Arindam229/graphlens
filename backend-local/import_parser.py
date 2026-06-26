import re

# Very simple but effective patterns (file-level only)

JS_IMPORT = re.compile(r'import .* from [\'"](.*)[\'"]')
JS_REQUIRE = re.compile(r'require\([\'"](.*)[\'"]\)')

PY_IMPORT = re.compile(r'from (.*) import')
PY_IMPORT_SIMPLE = re.compile(r'import (.*)')


def extract_imports(content: str, language: str):

    imports = []

    if language == "js" or language == "ts":

        imports += JS_IMPORT.findall(content)
        imports += JS_REQUIRE.findall(content)

    elif language == "python":

        imports += PY_IMPORT.findall(content)
        imports += PY_IMPORT_SIMPLE.findall(content)

    return imports