import json
import re
import tomllib


def parse_node(content: str) -> dict:
    pkg = json.loads(content)

    deps = {
        **pkg.get("dependencies", {}),
        **pkg.get("devDependencies", {})
    }

    nodes = [{
        "id": "package.json",
        "label": pkg.get("name", "root"),
        "type": "root"
    }]

    edges = []

    for name, version in deps.items():
        nodes.append({
            "id": name,
            "label": name,
            "type": "dep",
            "version": version
        })

        edges.append({
            "source": "package.json",
            "target": name
        })

    return {
        "nodes": nodes,
        "edges": edges
    }


def parse_python(content: str) -> dict:

    lines = [
        l.strip()
        for l in content.splitlines()
        if l.strip() and not l.startswith("#")
    ]

    nodes = [{
        "id": "requirements.txt",
        "label": "requirements.txt",
        "type": "root"
    }]

    edges = []

    for line in lines:

        name = (
            line.split("==")[0]
            .split(">=")[0]
            .split("~=")[0]
            .strip()
        )

        version = line[len(name):].strip() or "*"

        nodes.append({
            "id": name,
            "label": name,
            "type": "dep",
            "version": version
        })

        edges.append({
            "source": "requirements.txt",
            "target": name
        })

    return {
        "nodes": nodes,
        "edges": edges
    }


def parse_go(content: str) -> dict:

    requires = re.findall(
        r'^\s+(\S+)\s+(\S+)',
        content,
        re.MULTILINE
    )

    nodes = [{
        "id": "go.mod",
        "label": "go.mod",
        "type": "root"
    }]

    edges = []

    for mod, version in requires:

        nodes.append({
            "id": mod,
            "label": mod,
            "type": "dep",
            "version": version
        })

        edges.append({
            "source": "go.mod",
            "target": mod
        })

    return {
        "nodes": nodes,
        "edges": edges
    }


def parse_rust(content: str) -> dict:

    cargo = tomllib.loads(content)

    deps = cargo.get("dependencies", {})

    nodes = [{
        "id": "Cargo.toml",
        "label": cargo.get("package", {}).get("name", "root"),
        "type": "root"
    }]

    edges = []

    for name, val in deps.items():

        version = val if isinstance(val, str) else val.get("version", "*")

        nodes.append({
            "id": name,
            "label": name,
            "type": "dep",
            "version": version
        })

        edges.append({
            "source": "Cargo.toml",
            "target": name
        })

    return {
        "nodes": nodes,
        "edges": edges
    }