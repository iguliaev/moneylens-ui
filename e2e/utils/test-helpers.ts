import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import type { Database, TablesInsert } from './backend-types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for test setup/teardown
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } }
);

export async function createTestUser() {
  const email = `test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw error;
  // `data.user` structure comes from supabase-js response shape
  return { email, password, userId: (data as any).user.id };
}

export async function deleteTestUser(userId: string) {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('input[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

// Seed minimal reference data (categories, bank accounts, tags) for a given user
export async function seedReferenceDataForUser(userId: string) {
  const now = new Date().toISOString();

  // Categories for each type
  const categories: TablesInsert<'categories'>[] = [
    { user_id: userId, type: 'spend', name: 'Groceries', description: 'Groceries', created_at: now, updated_at: now },
    { user_id: userId, type: 'earn', name: 'Salary', description: 'Salary', created_at: now, updated_at: now },
    { user_id: userId, type: 'save', name: 'Savings', description: 'Savings', created_at: now, updated_at: now },
  ];
  await supabaseAdmin.from('categories').upsert(categories, { onConflict: 'user_id,type,name' });

  // One bank account
  const bankAccounts: TablesInsert<'bank_accounts'>[] = [
    { user_id: userId, name: 'Main Account', description: 'Primary bank account', created_at: now, updated_at: now },
  ];
  await supabaseAdmin.from('bank_accounts').upsert(bankAccounts, { onConflict: 'user_id,name' });

  // A couple of tags
  const tags: TablesInsert<'tags'>[] = [
    { user_id: userId, name: 'essentials', description: 'Essential expenses', created_at: now, updated_at: now },
    { user_id: userId, name: 'monthly', description: 'Monthly items', created_at: now, updated_at: now },
  ];
  await supabaseAdmin.from('tags').upsert(tags, { onConflict: 'user_id,name' });
}

// Cleanup reference data that was seeded for a given user
export async function cleanupReferenceDataForUser(userId: string) {
  // Best-effort cleanup; ignore errors so tests can still tear down user
  try {
    await supabaseAdmin.from('categories').delete().eq('user_id', userId);
  } catch {
    // noop
  }
  try {
    await supabaseAdmin.from('bank_accounts').delete().eq('user_id', userId);
  } catch {
    // noop
  }
  try {
    await supabaseAdmin.from('tags').delete().eq('user_id', userId);
  } catch {
    // noop
  }
}
