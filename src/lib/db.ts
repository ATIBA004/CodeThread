import { Pool, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;


export const pool =
  connectionString != null && connectionString.length > 0
    ? new Pool({ connectionString, max: 20 })
    : null;

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number }> {
  if (!pool) {
    throw new Error("Database is not configured (DATABASE_URL missing)");
  }
  const res = await pool.query<T>(text, params);
  return { rows: res.rows, rowCount: res.rowCount ?? 0 };
}
