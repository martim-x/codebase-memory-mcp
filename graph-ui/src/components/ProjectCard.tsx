import type { Project, SchemaInfo } from "../lib/types";
import { colorForLabel } from "../lib/colors";

interface ProjectCardProps {
  project: Project;
  schema: SchemaInfo | null;
  onSelect: (project: string) => void;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function ProjectCard({ project, schema, onSelect }: ProjectCardProps) {
  const totalNodes = schema?.node_labels?.reduce((s, l) => s + l.count, 0) ?? 0;
  const totalEdges = schema?.edge_types?.reduce((s, t) => s + t.count, 0) ?? 0;

  return (
    <div className="border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-medium">{project.name}</h3>
          <p className="text-muted-foreground text-label font-mono mt-0.5 truncate max-w-[300px]">
            {project.root_path}
          </p>
        </div>
        <button
          onClick={() => onSelect(project.name)}
          className="px-3 py-1 bg-accent hover:bg-accent text-accent-foreground rounded text-label font-medium transition-colors"
        >
          View Graph
        </button>
      </div>

      {schema && (
        <>
          <div className="flex gap-4 text-label text-muted-foreground mb-3">
            <span>{formatNumber(totalNodes)} nodes</span>
            <span>{formatNumber(totalEdges)} edges</span>
          </div>

          {schema.node_labels && schema.node_labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {schema.node_labels.map((l) => (
                /* The label hue encodes node type, so it stays on the dot where
                 * it cannot hurt legibility. Chip text and count use the theme
                 * tokens and stay readable in both themes. */
                <span
                  key={l.label}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted text-label"
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: colorForLabel(l.label) }}
                    aria-hidden="true"
                  />
                  <span className="text-foreground">{l.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatNumber(l.count)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {!schema && (
        <p className="text-muted-foreground text-label italic">Loading schema...</p>
      )}
    </div>
  );
}
