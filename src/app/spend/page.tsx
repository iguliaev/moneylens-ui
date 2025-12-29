"use client";

import { DataApi } from "@providers/data-provider/api";
import type {
  MonthlyTotalsRow,
  Transaction,
  Category,
  BankAccount,
  Tag,
} from "@providers/data-provider/types";
import TagsMultiSelect from "@components/tags/multi-select";
import { StatCard } from "@/components/StatCard";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Button,
  DatePicker,
  Select,
  Input,
  Form,
  Space,
  Typography,
  Alert,
  Card,
  Row,
  Col,
  Table,
  InputNumber,
  Checkbox,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  RedoOutlined,
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

function fmtCurrency(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "GBP",
  }).format(n);
}

// Build YYYY-MM-01 in local time (no UTC conversion)
function startOfMonthStr(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

// Given YYYY-MM-01, return YYYY-MM-DD for the month's last day
function endOfMonthFromStart(start: string) {
  const [y, m] = start.split("-").map(Number);
  const last = new Date(y, m, 0);
  return `${y}-${String(m).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

export default function SpendPage() {
  const [month, setMonth] = useState<string>(startOfMonthStr());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monthlyTotals, setMonthlyTotals] = useState<MonthlyTotalsRow[]>([]);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Filters
  const [filters, setFilters] = useState<{
    categoryId: string;
    from: string;
    to: string;
    bankAccountId: string;
    tag: string;
  }>(() => {
    const from = month;
    const to = endOfMonthFromStart(month);
    return { categoryId: "", from, to, bankAccountId: "", tag: "" };
  });

  // Create form state
  const [form, setForm] = useState<{
    date: string;
    categoryId: string;
    amount: string;
    bank_account_id: string;
    tags: string[];
    notes: string;
  }>({
    date: new Date().toISOString().slice(0, 10),
    categoryId: "",
    amount: "",
    bank_account_id: "",
    tags: [],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Selection state for deletions
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  // Filtered totals state (only shown when filters applied)
  const [filteredTotal, setFilteredTotal] = useState<number | null>(null);

  // Editing state per row
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<
    Partial<Omit<Transaction, "amount" | "tags">> & {
      amount?: number | string;
      tags?: string[] | string | null;
    }
  >({});

  const monthLabel = useMemo(
    () =>
      new Date(month).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [month],
  );

  // Extract reload logic as a plain function (not useCallback)
  // This function will be recreated on every render with fresh closure values
  const fetchTransactions = async () => {
    const end = endOfMonthFromStart(month);
    const from = filters.from || month;
    const to = filters.to || end;

    const hasNonEmpty = !!(
      filters.categoryId ||
      filters.bankAccountId ||
      filters.tag
    );
    const isDefaultRange = from === month && to === end;
    const isApplied = hasNonEmpty || !isDefaultRange;

    const [totalsRes, rowsRes, filteredSum] = await Promise.all([
      DataApi.monthlyTotals(month),
      DataApi.listTransactions({
        type: "spend",
        from,
        to,
        categoryId: filters.categoryId || undefined,
        bankAccountId: filters.bankAccountId || undefined,
        tagsAny: filters.tag ? [filters.tag] : undefined,
        orderBy: "date",
        orderDir: "desc",
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      isApplied
        ? DataApi.sumTransactionsAmount({
            type: "spend",
            from,
            to,
            categoryId: filters.categoryId || undefined,
            bank_account:
              (filters.bankAccountId &&
                bankAccounts.find((b) => b.id === filters.bankAccountId)
                  ?.name) ||
              undefined,
            tagsAny: filters.tag ? [filters.tag] : undefined,
          })
        : Promise.resolve(null),
    ]);
    setMonthlyTotals(totalsRes);
    setRows(rowsRes);
    setFilteredTotal(filteredSum as number | null);
  };

  // Load initial reference data (categories, bank accounts, tags) on mount
  // This only runs once when the component mounts
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [cats, bas, tags] = await Promise.all([
          DataApi.listCategories("spend"),
          DataApi.listBankAccounts(),
          DataApi.listTags(),
        ]);
        if (!mounted) return;
        setCategories(cats);
        setBankAccounts(bas);
        setAllTags(tags);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load reference data");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []); // Only run once on mount

  // Fetch transactions whenever dependencies change
  // This runs when month, page, filters, or bankAccounts change
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        await fetchTransactions();
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load transactions");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, page, filters, bankAccounts]);

  useEffect(() => {
    // when month changes, sync default filter range
    setFilters((f) => ({ ...f, from: month, to: endOfMonthFromStart(month) }));
  }, [month]);

  // Reset page to 1 when month or filters change
  useEffect(() => {
    setPage(1);
  }, [month, filters]);

  // Since monthlyTotals is already filtered by month, just pick spend
  const totalSpend = monthlyTotals.find((x) => x.type === "spend")?.total ?? 0;

  // Derived: whether filters are applied vs default month window and empty fields
  const filtersApplied = useMemo(() => {
    const end = endOfMonthFromStart(month);
    const from = filters.from || month;
    const to = filters.to || end;
    const hasNonEmpty = !!(
      filters.categoryId ||
      filters.bankAccountId ||
      filters.tag
    );
    const isDefaultRange = from === month && to === end;
    return hasNonEmpty || !isDefaultRange;
  }, [
    filters.categoryId,
    filters.bankAccountId,
    filters.tag,
    filters.from,
    filters.to,
    month,
  ]);

  // Handlers: create
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      await DataApi.createSpend({
        date: form.date,
        categoryId: form.categoryId || null,
        amount: parseFloat(form.amount || "0"),
        bank_account_id: form.bank_account_id || null,
        bank_account: form.bank_account_id
          ? (bankAccounts.find((b) => b.id === form.bank_account_id)?.name ??
            null)
          : null,
        tags: form.tags.length ? form.tags : null,
        notes: form.notes || null,
      });
      // Reset and reload
      setForm((f) => ({ ...f, amount: "", notes: "" }));
      await fetchTransactions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to create spending");
    } finally {
      setSaving(false);
    }
  }

  // Handlers: edit row
  function startEdit(row: Transaction) {
    // Normalize tags into string[] (tag names) for the edit form
    const normalizedTags = Array.isArray((row as any).tags)
      ? (row as any).tags
          .map((tg: any) => (typeof tg === "string" ? tg : tg?.name))
          .filter(Boolean)
      : [];
    setEditingId(row.id);
    setEditDraft({ ...row, tags: normalizedTags });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }
  async function saveEdit() {
    if (!editingId) return;
    try {
      setSaving(true);
      const changes: any = {};
      const fields: (keyof Transaction)[] = [
        "date",
        "category",
        "category_id",
        "bank_account_id",
        "bank_account",
        "amount",
        "notes",
        "tags",
      ];
      for (const k of fields) {
        if (k in editDraft) changes[k] = (editDraft as any)[k];
      }
      if (typeof changes.amount === "string")
        changes.amount = parseFloat(changes.amount);
      // ensure tags is string[]
      if (typeof changes.tags === "string") {
        changes.tags = (changes.tags as string)
          .split(",")
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
      if ("bank_account_id" in changes) {
        changes.bank_account = changes.bank_account_id
          ? (bankAccounts.find((b) => b.id === changes.bank_account_id)?.name ??
            null)
          : null;
      }
      await DataApi.updateTransaction(editingId, changes);
      setEditingId(null);
      setEditDraft({});
      await fetchTransactions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to update spending");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOne(id: string) {
    try {
      setSaving(true);
      await DataApi.deleteTransaction(id);
      setSelected((s) => {
        const c = { ...s };
        delete c[id];
        return c;
      });
      await fetchTransactions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    try {
      setSaving(true);
      await DataApi.deleteTransactions(ids);
      setSelected({});
      await fetchTransactions();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete selected");
    } finally {
      setSaving(false);
    }
  }

  const allOnPageSelected =
    rows.length > 0 && rows.every((r) => selected[r.id]);

  // Calculate if there are more pages (if we got fewer rows than pageSize, we're on the last page)
  const hasNextPage = rows.length >= pageSize;
  function toggleSelectAllPage() {
    const next: Record<string, boolean> = { ...selected };
    if (allOnPageSelected) {
      for (const r of rows) delete next[r.id];
    } else {
      for (const r of rows) next[r.id] = true;
    }
    setSelected(next);
  }

  function toggleRow(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", padding: "24px" }}>
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={2} style={{ margin: 0 }}>Spend — {monthLabel}</Title>
        </Col>
        <Col>
          <DatePicker
            picker="month"
            value={dayjs(month)}
            onChange={(date) => date && setMonth(date.format("YYYY-MM-01"))}
            format="YYYY-MM"
            suffixIcon={<CalendarOutlined />}
            data-testid="spend-month-input"
          />
        </Col>
      </Row>

      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <StatCard
            title="Total Spent (Current Month)"
            value={fmtCurrency(totalSpend)}
            className="bg-red-50 border-red-200"
            testId="spend-total-current-month"
          />
        </Col>
        {filtersApplied && (
          <Col xs={24} md={8}>
            <StatCard
              title="Total Spent (Filtered)"
              value={fmtCurrency(filteredTotal ?? 0)}
              className="bg-blue-50 border-blue-200"
              testId="spend-total-filtered"
            />
          </Col>
        )}
      </Row>

      <Card title="Filters">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Category</label>
                <Select
                  style={{ width: "100%" }}
                  value={filters.categoryId || undefined}
                  onChange={(value) =>
                    setFilters({ ...filters, categoryId: value || "" })
                  }
                  placeholder="All"
                  allowClear
                >
                  {categories.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>From</label>
                <DatePicker
                  style={{ width: "100%" }}
                  value={filters.from ? dayjs(filters.from) : null}
                  onChange={(date) =>
                    setFilters({ ...filters, from: date ? date.format("YYYY-MM-DD") : "" })
                  }
                  data-testid="spend-filter-from"
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>To</label>
                <DatePicker
                  style={{ width: "100%" }}
                  value={filters.to ? dayjs(filters.to) : null}
                  onChange={(date) =>
                    setFilters({ ...filters, to: date ? date.format("YYYY-MM-DD") : "" })
                  }
                  data-testid="spend-filter-to"
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Bank Account</label>
                <Select
                  style={{ width: "100%" }}
                  value={filters.bankAccountId || undefined}
                  onChange={(value) =>
                    setFilters({ ...filters, bankAccountId: value || "" })
                  }
                  placeholder="All"
                  allowClear
                >
                  {bankAccounts.map((b) => (
                    <Option key={b.id} value={b.id}>
                      {b.name}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Tag</label>
                <Select
                  style={{ width: "100%" }}
                  value={filters.tag || undefined}
                  onChange={(value) =>
                    setFilters({ ...filters, tag: value || "" })
                  }
                  placeholder="All"
                  allowClear
                >
                  {allTags.map((t) => (
                    <Option key={t.id} value={t.name}>
                      {t.name}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
          </Row>
          <Row>
            <Col>
              <Space>
                <Button
                  icon={<CheckOutlined />}
                  onClick={() => {
                    setPage(1);
                    fetchTransactions();
                  }}
                >
                  Apply
                </Button>
                <Button
                  icon={<RedoOutlined />}
                  onClick={() => {
                    setFilters({
                      categoryId: "",
                      from: month,
                      to: endOfMonthFromStart(month),
                      bankAccountId: "",
                      tag: "",
                    });
                    setPage(1);
                    fetchTransactions();
                  }}
                >
                  Reset
                </Button>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card title="Add New Spending">
        <form onSubmit={handleCreate}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Date</label>
                <DatePicker
                  style={{ width: "100%" }}
                  value={dayjs(form.date)}
                  onChange={(date) =>
                    setForm({ ...form, date: date ? date.format("YYYY-MM-DD") : "" })
                  }
                  data-testid="spend-form-date"
                  required
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Category</label>
                <Select
                  style={{ width: "100%" }}
                  value={form.categoryId || undefined}
                  onChange={(value) => setForm({ ...form, categoryId: value || "" })}
                  placeholder="— Select —"
                  data-testid="spend-form-category"
                >
                  {categories.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Amount</label>
                <InputNumber
                  style={{ width: "100%" }}
                  value={form.amount ? parseFloat(form.amount) : undefined}
                  onChange={(value) => setForm({ ...form, amount: value?.toString() || "" })}
                  min={0}
                  step={0.01}
                  precision={2}
                  data-testid="spend-form-amount"
                  required
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Bank Account</label>
                <Select
                  style={{ width: "100%" }}
                  value={form.bank_account_id || undefined}
                  onChange={(value) => setForm({ ...form, bank_account_id: value || "" })}
                  placeholder="— Select —"
                  data-testid="spend-form-bank-account"
                >
                  {bankAccounts.map((b) => (
                    <Option key={b.id} value={b.id}>
                      {b.name}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Tags</label>
                <TagsMultiSelect
                  options={allTags.map((t) => t.name)}
                  value={form.tags}
                  onChange={(vals) => setForm({ ...form, tags: vals })}
                  placeholder="Select tags"
                  testId="spend-form-tags"
                />
              </Space>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Space direction="vertical" size={0} style={{ width: "100%" }}>
                <label style={{ fontSize: "12px", color: "#8c8c8c" }}>Notes</label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  data-testid="spend-form-notes"
                />
              </Space>
            </Col>
            <Col xs={24} style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={saving}
                data-testid="spend-add-transaction"
              >
                {saving ? "Saving…" : "Add Spending"}
              </Button>
            </Col>
          </Row>
        </form>
      </Card>

      <Card
        title="Transactions"
        extra={
          <Space>
            <Button
              icon={<LeftOutlined />}
              disabled={page <= 1 || rows.length === 0}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="spend-prev-page"
            />
            <span style={{ fontSize: "14px", padding: "0 8px" }}>Page {page}</span>
            <Button
              icon={<RightOutlined />}
              disabled={!hasNextPage || rows.length === 0}
              onClick={() => setPage((p) => p + 1)}
              data-testid="spend-next-page"
            />
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={!Object.values(selected).some(Boolean) || saving}
              onClick={deleteSelected}
              data-testid="spend-delete-selected"
            >
              Delete Selected
            </Button>
          </Space>
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: "14px" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "#8c8c8c" }}>
                <th style={{ padding: "8px", width: "40px" }}>
                  <Checkbox
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllPage}
                    data-testid="spend-select-all"
                  />
                </th>
                <th style={{ padding: "8px" }}>Date</th>
                <th style={{ padding: "8px" }}>Category</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Amount</th>
                <th style={{ padding: "8px" }}>Bank Account</th>
                <th style={{ padding: "8px" }}>Tags</th>
                <th style={{ padding: "8px" }}>Notes</th>
                <th style={{ padding: "8px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr
                  key={t.id}
                  style={{ borderTop: "1px solid #f0f0f0", verticalAlign: "top" }}
                  data-testid="spend-row"
                >
                  <td style={{ padding: "8px" }}>
                    <Checkbox
                      checked={!!selected[t.id]}
                      onChange={() => toggleRow(t.id)}
                      data-testid="spend-row-select"
                    />
                  </td>
                  <td style={{ padding: "8px" }}>
                    {editingId === t.id ? (
                      <DatePicker
                        value={dayjs((editDraft.date as any) ?? t.date)}
                        onChange={(date) =>
                          setEditDraft({ ...editDraft, date: date ? date.format("YYYY-MM-DD") : "" })
                        }
                        data-testid="spend-edit-date"
                      />
                    ) : (
                      new Date(t.date).toLocaleDateString()
                    )}
                  </td>
                  <td style={{ padding: "8px" }} data-testid="spend-row-category">{editingId === t.id ? (
                      <Select
                        style={{ minWidth: "120px" }}
                        value={
                          (editDraft.category_id as any) ??
                          (t as any).category_id ??
                          undefined
                        }
                        onChange={(value) =>
                          setEditDraft({
                            ...editDraft,
                            category_id: value || "",
                          })
                        }
                        placeholder="— Select —"
                      >
                        {categories.map((c) => (
                          <Option key={c.id} value={c.id}>
                            {c.name}
                          </Option>
                        ))}
                      </Select>
                    ) : t.category || (t as any).category_id ? (
                      (categories.find((c) => c.id === (t as any).category_id)
                        ?.name ?? "—")
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    style={{ padding: "8px", textAlign: "right" }}
                    data-testid="spend-row-amount"
                  >
                    {editingId === t.id ? (
                      <InputNumber
                        style={{ width: "120px", textAlign: "right" }}
                        value={parseFloat(String((editDraft.amount as any) ?? t.amount))}
                        onChange={(value) =>
                          setEditDraft({
                            ...editDraft,
                            amount: value?.toString() || "",
                          })
                        }
                        min={0}
                        step={0.01}
                        precision={2}
                        data-testid="spend-edit-amount"
                      />
                    ) : (
                      fmtCurrency(t.amount)
                    )}
                  </td>
                  <td style={{ padding: "8px" }} data-testid="spend-row-bank-account">
                    {editingId === t.id ? (
                      <Select
                        style={{ minWidth: "120px" }}
                        value={
                          (editDraft as any).bank_account_id ??
                          (t as any).bank_account_id ??
                          undefined
                        }
                        onChange={(value) =>
                          setEditDraft({
                            ...editDraft,
                            bank_account_id: value || "",
                          })
                        }
                        placeholder="— Select —"
                      >
                        {bankAccounts.map((b) => (
                          <Option key={b.id} value={b.id}>
                            {b.name}
                          </Option>
                        ))}
                      </Select>
                    ) : (
                      t.bank_account || "—"
                    )}
                  </td>
                  <td style={{ padding: "8px" }} data-testid="spend-row-tags">{editingId === t.id ? (
                      <TagsMultiSelect
                        options={allTags.map((tg) => tg.name)}
                        value={
                          Array.isArray(editDraft.tags)
                            ? (editDraft.tags as string[])
                            : t.tags && Array.isArray(t.tags)
                              ? (t.tags as any[]).map((tg) =>
                                  typeof tg === "string" ? tg : tg?.name,
                                )
                              : []
                        }
                        onChange={(vals) =>
                          setEditDraft({ ...editDraft, tags: vals })
                        }
                        testId="spend-edit-tags"
                      />
                    ) : t.tags && Array.isArray(t.tags) ? (
                      (t.tags as any[])
                        .map((tg) => (typeof tg === "string" ? tg : tg?.name))
                        .join(", ")
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "8px" }} data-testid="spend-row-notes">
                    {editingId === t.id ? (
                      <Input
                        value={(editDraft.notes as any) ?? t.notes ?? ""}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            notes: e.target.value,
                          })
                        }
                        data-testid="spend-edit-notes"
                      />
                    ) : (
                      t.notes || "—"
                    )}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    {editingId === t.id ? (
                      <Space>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          disabled={saving}
                          onClick={saveEdit}
                          title="Save changes"
                          data-testid="spend-save-edit"
                        />
                        <Button
                          icon={<CloseOutlined />}
                          onClick={cancelEdit}
                          title="Cancel editing"
                        />
                      </Space>
                    ) : (
                      <Space>
                        <Button
                          icon={<EditOutlined />}
                          onClick={() => startEdit(t)}
                          title="Edit transaction"
                          data-testid="spend-start-edit"
                        />
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          disabled={saving}
                          onClick={() => deleteOne(t.id)}
                          title="Delete transaction"
                          data-testid="spend-delete-transaction"
                        />
                      </Space>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </Space>
  );
}
