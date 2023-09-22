import pg from "pg";

/**
 * Escapes the provided value as if it were a literal in SQL.
 *
 * @param literal - The value to escape
 */
export function escapeLiteral(literal: string): string {
  return pg.Client.prototype.escapeLiteral(literal);
}

/**
 * Escapes the provided value as if it were an identifier in SQL.
 *
 * @param literal - The value to escape
 */
export function escapeIdentifier(id: string): string {
  return pg.Client.prototype.escapeIdentifier(id);
}
