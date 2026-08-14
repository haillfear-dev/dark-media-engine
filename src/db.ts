import { DatabaseSync } from "node:sqlite";
import path from "node:path";

let database: DatabaseSync | undefined;
export function db() {
  if (!database) {
    database = new DatabaseSync(path.resolve(process.env.DATABASE_PATH ?? "./data/content-os.db"));
    database.exec("PRAGMA foreign_keys=ON");
  }
  return database;
}
export type Row = Record<string, string | number | null>;
export const all = <T extends Row>(sql: string, ...args: (string | number | null)[]) => db().prepare(sql).all(...args) as T[];
export const one = <T extends Row>(sql: string, ...args: (string | number | null)[]) => db().prepare(sql).get(...args) as T | undefined;
