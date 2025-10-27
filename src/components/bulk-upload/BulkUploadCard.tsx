"use client";

import React, { useState } from "react";
import { DataApi, RpcError } from "@/providers/data-provider/api";
import type {
  BulkUploadPayload,
  BulkUploadResult,
  BulkUploadError,
} from "@/providers/data-provider/types";

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

export function BulkUploadCard() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [errors, setErrors] = useState<BulkUploadError[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    setErrors([]);
    setFileError(null);

    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setFile(null);
      setFileError("File is too large. Maximum allowed size is 1MB.");
      return;
    }

    if (selected.type && selected.type !== "application/json") {
      // Some browsers may not set type for .json files; we'll still allow by extension
      if (!selected.name.toLowerCase().endsWith(".json")) {
        setFile(null);
        setFileError("Invalid file type. Please upload a JSON file.");
        return;
      }
    }

    setFile(selected);
  };

  // Helper to clear the native file input element's value
  const clearFileInput = () => {
    const input = document.getElementById("bulk-upload-input") as HTMLInputElement | null;
    if (input) input.value = "";
  };

  const handleUpload = async () => {
    setFileError(null);
    setResult(null);
    setErrors([]);

    if (!file) {
      setFileError("No file selected.");
      return;
    }

    setIsUploading(true);
    try {
      const text = await file.text();
      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        setFileError("Failed to parse JSON file. Please ensure it is valid JSON.");
        setIsUploading(false);
        return;
      }

      // Support both array and { transactions: [...] }
      let transactions: unknown[] = [];
      if (Array.isArray(parsed)) {
        transactions = parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        if (obj.transactions && Array.isArray(obj.transactions)) {
          transactions = obj.transactions as unknown[];
        } else {
          setFileError("JSON must be an array of transactions or an object with a 'transactions' array.");
          setIsUploading(false);
          return;
        }
      } else {
        setFileError("JSON must be an array of transactions or an object with a 'transactions' array.");
        setIsUploading(false);
        return;
      }

      // Basic client-side validation for shape
      const payload: BulkUploadPayload = { transactions: transactions as any[] };

      // Call DataApi RPC method
      const res = await DataApi.bulkUploadTransactions(payload);

      setResult(res as BulkUploadResult);
      setFile(null);
      clearFileInput();
    } catch (err: unknown) {
      // Prefer the typed RpcError with structured details
      if (err instanceof RpcError) {
        setErrors(err.details ?? []);
      } else if (err instanceof Error) {
        setFileError(err.message);
      } else {
        setFileError(String(err));
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium mb-3">Bulk Transaction Upload</h3>

      <p className="text-sm text-gray-600 mb-4">
        Upload a JSON file containing an array of transactions or an object with a
        `transactions` array. Max file size: 1MB.
      </p>

      <div className="space-y-3">
        <div>
          <input
            id="bulk-upload-input"
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className=""
            aria-label="Select JSON file with transactions"
          />
        </div>

        {file && (
          <div className="text-sm text-gray-700">
            Selected file: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)
          </div>
        )}

        {fileError && <div className="text-sm text-red-600">{fileError}</div>}

        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60`}
          >
            {isUploading ? "Uploading..." : "Upload Transactions"}
          </button>

          <button
            onClick={() => {
              setFile(null);
              setFileError(null);
              setResult(null);
              setErrors([]);
              clearFileInput();
            }}
            className="px-3 py-2 border rounded text-sm"
          >
            Clear
          </button>
        </div>

        {result && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <div className="text-sm text-green-800">
              Inserted {result.inserted_count} of {result.total_count} transactions.
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded max-h-56 overflow-auto">
            <div className="text-sm text-red-800 font-medium mb-2">Errors</div>
            <ul className="list-decimal pl-5 space-y-1 text-sm text-red-700">
              {errors.map((e) => (
                <li key={e.index}>
                  Row {e.index}: {e.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="mt-4 text-sm text-gray-700">
          <summary className="cursor-pointer">Example format</summary>
          <pre className="mt-2 bg-gray-100 p-3 rounded text-xs overflow-auto">
{`[
  {
    "date": "2025-10-15",
    "type": "spend",
    "category": "Groceries",
    "amount": 45.67,
    "tags": ["essentials", "weekly"],
    "notes": "Weekly shopping"
  },
  {
    "date": "2025-10-16",
    "type": "earn",
    "category": "Salary",
    "amount": 3000.00
  }
]`}
          </pre>
          <p className="mt-2 text-gray-600">
            <strong>Required fields:</strong> date (YYYY-MM-DD), type (earn/spend/save), amount
            <br />
            <strong>Optional fields:</strong> category, bank_account, tags, notes
          </p>
        </details>
      </div>
    </div>
  );
}
