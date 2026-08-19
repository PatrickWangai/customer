import { Badge, type BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_MAP: Record<string, { label: string; variant: Variant }> = {
  SUBMITTED: { label: "Submitted", variant: "info" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  RESOLVED: { label: "Resolved", variant: "success" },
  CLOSED: { label: "Closed", variant: "outline" },

  LOW: { label: "Low", variant: "outline" },
  MEDIUM: { label: "Medium", variant: "info" },
  HIGH: { label: "High", variant: "warning" },
  URGENT: { label: "Urgent", variant: "destructive" },
};

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_MAP[status] ?? { label: toTitleCase(status), variant: "secondary" as Variant };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
