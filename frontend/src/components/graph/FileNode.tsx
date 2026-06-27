import { Handle, Position, type NodeProps } from 'reactflow';

type FileNodeData = {
  label: string;
  isCyclic: boolean;
  isIsolated: boolean;
  isEntryPoint: boolean;
  isDark: boolean;
  selected: boolean;
};

export function FileNode({ data, id }: NodeProps<FileNodeData>) {
  // Show "parent/filename" so same-named files are distinguishable
  const parts = id.split('/');
  const displayLabel = parts.length > 1
    ? `${parts[parts.length - 2]}/${parts[parts.length - 1]}`
    : data.label;


  const bg  = data.isCyclic
    ? '#450a0a'
    : data.selected
      ? (data.isDark ? '#14532d' : '#dcfce7')
      : data.isEntryPoint
        ? (data.isDark ? '#1c1917' : '#fefce8')
        : (data.isDark ? '#1e293b' : '#f1f5f9');

  const bdr = data.isCyclic
    ? '#ef4444'
    : data.selected
      ? '#4ade80'
      : data.isEntryPoint
        ? '#f59e0b'
        : (data.isDark ? '#475569' : '#94a3b8');

  const clr = data.isCyclic
    ? '#fca5a5'
    : data.selected
      ? (data.isDark ? '#86efac' : '#166534')
      : data.isEntryPoint
        ? (data.isDark ? '#fcd34d' : '#92400e')
        : (data.isDark ? '#e2e8f0' : '#1e293b');

  return (
    <>
      <Handle type="target" position={Position.Top}
        style={{ opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0 }} />
      <div style={{
        background: bg,
        border: `1.5px solid ${bdr}`,
        borderRadius: 8,
        color: clr,
        fontSize: 11,
        fontFamily: 'monospace',
        padding: '5px 10px',
        whiteSpace: 'nowrap',
        maxWidth: 200,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        cursor: 'pointer',
        boxShadow: data.selected
          ? `0 0 10px ${bdr}60`
          : data.isCyclic
            ? '0 0 8px #ef444440'
            : data.isEntryPoint
              ? '0 0 8px #f59e0b50'
              : '0 1px 4px #00000040',
        transition: 'all 0.15s ease',
      }}>
        {displayLabel}
      </div>
      <Handle type="source" position={Position.Bottom}
        style={{ opacity: 0, width: 1, height: 1, minWidth: 0, minHeight: 0 }} />
    </>
  );
}
