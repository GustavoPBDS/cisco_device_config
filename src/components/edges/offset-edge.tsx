import { BaseEdge, EdgeProps } from "reactflow";

export default function ParallelStraightEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    data,
    style,
    markerEnd,
}: EdgeProps) {
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const len = Math.hypot(dx, dy) || 1;

    const nx = -dy / len;
    const ny = dx / len;

    const index = data?.index ?? 0;
    const total = data?.count ?? 1;
    const mid = (total - 1) / 2;
    const offsetIndex = index - mid;

    const spacing = 9;
    let offset = offsetIndex * spacing;

    if (data?.direction === 'reverse') {
        offset = -offset;
    }

    const sx = sourceX + nx * offset;
    const sy = sourceY + ny * offset;
    const tx = targetX + nx * offset;
    const ty = targetY + ny * offset;

    const d = `M ${sx} ${sy} L ${tx} ${ty}`;

    return <BaseEdge id={id} path={d} style={style} markerEnd={markerEnd} />;
}
