export class KnowledgeDatabaseManager {
  private db: any;
  private static readonly MAX_STATE_BYTES = 1_500_000;

  constructor(db: any) {
    this.db = db;
    this.ensureTables();
  }

  private ensureTables(): void {
    if (!this.db) return;
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS knowledge_state_fallback (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
    } catch (error) {
      console.warn('[KnowledgeDatabaseManager] Failed to ensure fallback table:', error);
    }
  }

  public saveState(state: any): void {
    if (!this.db) return;
    try {
      const payload = this.safeStringify(state ?? {});
      if (!payload) return;

      if (Buffer.byteLength(payload, 'utf8') > KnowledgeDatabaseManager.MAX_STATE_BYTES) {
        console.warn('[KnowledgeDatabaseManager] State payload too large; skipping persist to avoid DB bloat');
        return;
      }

      const stmt = this.db.prepare(`
        INSERT INTO knowledge_state_fallback (id, state_json, updated_at)
        VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          state_json = excluded.state_json,
          updated_at = excluded.updated_at;
      `);
      stmt.run(payload, new Date().toISOString());
    } catch (error) {
      console.warn('[KnowledgeDatabaseManager] Failed to save state:', error);
    }
  }

  public loadState(): any | null {
    if (!this.db) return null;
    try {
      const row = this.db.prepare('SELECT state_json FROM knowledge_state_fallback WHERE id = 1').get();
      if (!row?.state_json) return null;
      return this.safeParse(row.state_json);
    } catch (error) {
      console.warn('[KnowledgeDatabaseManager] Failed to load state:', error);
      return null;
    }
  }

  public clearState(): void {
    if (!this.db) return;
    try {
      this.db.prepare('DELETE FROM knowledge_state_fallback WHERE id = 1').run();
    } catch (error) {
      console.warn('[KnowledgeDatabaseManager] Failed to clear state:', error);
    }
  }

  private safeStringify(value: any): string | null {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn('[KnowledgeDatabaseManager] Failed to stringify state:', error);
      return null;
    }
  }

  private safeParse(value: string): any | null {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      console.warn('[KnowledgeDatabaseManager] Failed to parse state JSON:', error);
      return null;
    }
  }
}
