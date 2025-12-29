"use client";

import { useEffect, useMemo, useState } from "react";
import { DataApi } from "@providers/data-provider/api";
import { StatCard } from "@/components/StatCard";
import { Table, Button, DatePicker, Space, Typography, Alert, Card, Row, Col } from "antd";
import { LeftOutlined, RightOutlined, CalendarOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type {
  MonthlyTotalsRow,
  MonthlyCategoryTotalsRow,
  MonthlyTaggedTypeTotalsRow,
} from "@providers/data-provider/types";
import dayjs from "dayjs";

const { Title } = Typography;

function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
  }).format(n);
}

function startOfMonthISO(d = new Date()) {
  const x = new Date(d);
  x.setDate(1);
  return x.toISOString().slice(0, 10);
}

function addMonths(iso: string, delta: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + delta);
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [month, setMonth] = useState<string>(startOfMonthISO());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [totals, setTotals] = useState<MonthlyTotalsRow[]>([]);
  const [catTotals, setCatTotals] = useState<MonthlyCategoryTotalsRow[]>([]);
  const [tagTotals, setTagTotals] = useState<MonthlyTaggedTypeTotalsRow[]>([]);

  const monthLabel = useMemo(
    () =>
      new Date(month).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [month],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [t, c, g] = await Promise.all([
          DataApi.monthlyTotals(month),
          DataApi.monthlyCategoryTotals(month),
          DataApi.monthlyTaggedTypeTotals(month, undefined),
        ]);
        if (!mounted) return;
        setTotals(t);
        setCatTotals(c);
        setTagTotals(g);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load dashboard");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [month]);

  const spend = totals.find((x) => x.type === "spend")?.total ?? 0;
  const earn = totals.find((x) => x.type === "earn")?.total ?? 0;
  const save = totals.find((x) => x.type === "save")?.total ?? 0;

  const categoryColumns: ColumnsType<MonthlyCategoryTotalsRow> = [
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (text) => text || "(uncategorized)",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (text) => <span className="capitalize">{text}</span>,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (value) => fmtCurrency(value),
    },
  ];

  const tagColumns: ColumnsType<MonthlyTaggedTypeTotalsRow> = [
    {
      title: "Tags",
      dataIndex: "tags",
      key: "tags",
      render: (tags: string[]) => tags?.join(", ") || "(no tags)",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (text) => <span className="capitalize">{text}</span>,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (value) => fmtCurrency(value),
    },
  ];

  const sortedCategories = useMemo(
    () =>
      [...catTotals]
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
        .slice(0, 10),
    [catTotals]
  );

  const sortedTags = useMemo(
    () =>
      [...tagTotals]
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
        .slice(0, 10),
    [tagTotals]
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", padding: "24px" }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2} style={{ margin: 0 }}>Dashboard — {monthLabel}</Title>
        </Col>
        <Col>
          <Space>
            <Button
              data-testid="prev-month"
              icon={<LeftOutlined />}
              onClick={() => setMonth((m) => addMonths(m, -1))}
            >
              Prev
            </Button>
            <DatePicker
              picker="month"
              value={dayjs(month)}
              onChange={(date) => date && setMonth(date.format("YYYY-MM-01"))}
              suffixIcon={<CalendarOutlined />}
            />
            <Button
              data-testid="this-month"
              onClick={() => setMonth(startOfMonthISO())}
            >
              This Month
            </Button>
            <Button
              data-testid="next-month"
              icon={<RightOutlined />}
              iconPosition="end"
              onClick={() => setMonth((m) => addMonths(m, 1))}
            >
              Next
            </Button>
          </Space>
        </Col>
      </Row>

      {error && <Alert message={error} type="error" showIcon closable />}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <StatCard
            title="Spent"
            value={fmtCurrency(spend)}
            className="bg-red-50 border-red-200"
            testId="dashboard-spent-total"
          />
        </Col>
        <Col xs={24} md={8}>
          <StatCard
            title="Earned"
            value={fmtCurrency(earn)}
            className="bg-green-50 border-green-200"
            testId="dashboard-earned-total"
          />
        </Col>
        <Col xs={24} md={8}>
          <StatCard
            title="Saved"
            value={fmtCurrency(save)}
            className="bg-blue-50 border-blue-200"
            testId="dashboard-saved-total"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Top Categories">
            <Table
              dataSource={sortedCategories}
              columns={categoryColumns}
              rowKey={(record, index) => `${record.category}-${record.type}-${index}`}
              pagination={false}
              size="small"
              loading={loading}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Top Tags">
            <Table
              dataSource={sortedTags}
              columns={tagColumns}
              rowKey={(record, index) => `${record.tags?.join("-")}-${record.type}-${index}`}
              pagination={false}
              size="small"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
};
