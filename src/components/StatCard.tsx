import { Card, Statistic } from "antd";

export function StatCard({
  title,
  value,
  className = "",
  testId,
}: {
  title: string;
  value: string;
  className?: string;
  testId?: string;
}) {
  return (
    <Card className={className} data-testid={testId}>
      <Statistic
        title={<span data-testid={testId ? `${testId}-title` : undefined}>{title}</span>}
        value={value}
        valueStyle={{ fontSize: "24px", fontWeight: 600 }}
      />
    </Card>
  );
}
