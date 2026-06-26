def detect_cycles(nodes, edges):
    """
    Detect circular dependencies in a directed graph.
    """

    graph = {}

    # build adjacency list
    for edge in edges:
        src = edge["source"]
        dst = edge["target"]

        if src not in graph:
            graph[src] = []

        graph[src].append(dst)

    visited = set()
    rec_stack = set()
    path = []
    cycles = []

    def dfs(node):

        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        for neighbor in graph.get(node, []):

            if neighbor not in visited:
                dfs(neighbor)

            elif neighbor in rec_stack:
                # cycle found
                cycle_start_index = path.index(neighbor)
                cycles.append(path[cycle_start_index:] + [neighbor])

        rec_stack.remove(node)
        path.pop()

    for node in graph:
        if node not in visited:
            dfs(node)

    return cycles