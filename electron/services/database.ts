import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { VirtualNode, PhysicalChunk } from '../types';

let db: Database.Database;

export function initDatabase(userDataPath: string): void {
  const dbPath = path.join(userDataPath, 'github-drive.db');
  db = new Database(dbPath);

  // Performance & integrity PRAGMAs
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS Virtual_Nodes (
      node_id TEXT PRIMARY KEY,
      parent_id TEXT,
      logical_name TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('DIRECTORY','FILE')),
      total_size INTEGER DEFAULT 0,
      mime_type TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES Virtual_Nodes(node_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS Physical_Chunks (
      chunk_id TEXT PRIMARY KEY,
      node_id TEXT NOT NULL,
      sequence_index INTEGER NOT NULL,
      git_blob_sha TEXT,
      chunk_size INTEGER NOT NULL,
      raw_url TEXT,
      sha256_hash TEXT,
      FOREIGN KEY (node_id) REFERENCES Virtual_Nodes(node_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS App_Settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_nodes_parent ON Virtual_Nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_node ON Physical_Chunks(node_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_sequence ON Physical_Chunks(node_id, sequence_index);
  `);
}

export function getDatabase(): Database.Database {
  return db;
}

// ===== Virtual Nodes =====

export function getChildren(parentId: string | null): VirtualNode[] {
  if (parentId === null) {
    return db.prepare(
      'SELECT * FROM Virtual_Nodes WHERE parent_id IS NULL ORDER BY entity_type DESC, logical_name ASC'
    ).all() as VirtualNode[];
  }
  return db.prepare(
    'SELECT * FROM Virtual_Nodes WHERE parent_id = ? ORDER BY entity_type DESC, logical_name ASC'
  ).all(parentId) as VirtualNode[];
}

export function getNode(nodeId: string): VirtualNode | null {
  return (db.prepare('SELECT * FROM Virtual_Nodes WHERE node_id = ?').get(nodeId) as VirtualNode) || null;
}

export function insertNode(
  parentId: string | null,
  logicalName: string,
  entityType: 'DIRECTORY' | 'FILE',
  totalSize: number = 0,
  mimeType: string | null = null
): VirtualNode {
  const nodeId = uuidv4();
  db.prepare(`
    INSERT INTO Virtual_Nodes (node_id, parent_id, logical_name, entity_type, total_size, mime_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(nodeId, parentId, logicalName, entityType, totalSize, mimeType);
  return getNode(nodeId) as VirtualNode;
}

export function updateNode(nodeId: string, updates: Partial<Pick<VirtualNode, 'logical_name' | 'total_size' | 'mime_type'>>): VirtualNode {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.logical_name !== undefined) {
    setClauses.push('logical_name = ?');
    values.push(updates.logical_name);
  }
  if (updates.total_size !== undefined) {
    setClauses.push('total_size = ?');
    values.push(updates.total_size);
  }
  if (updates.mime_type !== undefined) {
    setClauses.push('mime_type = ?');
    values.push(updates.mime_type);
  }

  setClauses.push("updated_at = datetime('now')");
  values.push(nodeId);

  db.prepare(`UPDATE Virtual_Nodes SET ${setClauses.join(', ')} WHERE node_id = ?`).run(...values);
  return getNode(nodeId) as VirtualNode;
}

export function deleteNode(nodeId: string): void {
  db.prepare('DELETE FROM Virtual_Nodes WHERE node_id = ?').run(nodeId);
}

export function getPath(nodeId: string): VirtualNode[] {
  const path: VirtualNode[] = [];
  let current = getNode(nodeId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? getNode(current.parent_id) : null;
  }
  return path;
}

// ===== Physical Chunks =====

export function getChunks(nodeId: string): PhysicalChunk[] {
  return db.prepare(
    'SELECT * FROM Physical_Chunks WHERE node_id = ? ORDER BY sequence_index ASC'
  ).all(nodeId) as PhysicalChunk[];
}

export function insertChunk(
  nodeId: string,
  sequenceIndex: number,
  chunkSize: number,
  gitBlobSha: string | null = null,
  rawUrl: string | null = null,
  sha256Hash: string | null = null
): PhysicalChunk {
  const chunkId = uuidv4();
  db.prepare(`
    INSERT INTO Physical_Chunks (chunk_id, node_id, sequence_index, git_blob_sha, chunk_size, raw_url, sha256_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(chunkId, nodeId, sequenceIndex, gitBlobSha, chunkSize, rawUrl, sha256Hash);
  return db.prepare('SELECT * FROM Physical_Chunks WHERE chunk_id = ?').get(chunkId) as PhysicalChunk;
}

export function updateChunk(chunkId: string, updates: Partial<Pick<PhysicalChunk, 'git_blob_sha' | 'raw_url' | 'sha256_hash'>>): void {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.git_blob_sha !== undefined) { setClauses.push('git_blob_sha = ?'); values.push(updates.git_blob_sha); }
  if (updates.raw_url !== undefined) { setClauses.push('raw_url = ?'); values.push(updates.raw_url); }
  if (updates.sha256_hash !== undefined) { setClauses.push('sha256_hash = ?'); values.push(updates.sha256_hash); }

  values.push(chunkId);
  if (setClauses.length > 0) {
    db.prepare(`UPDATE Physical_Chunks SET ${setClauses.join(', ')} WHERE chunk_id = ?`).run(...values);
  }
}

export function deleteChunks(nodeId: string): void {
  db.prepare('DELETE FROM Physical_Chunks WHERE node_id = ?').run(nodeId);
}

// ===== App Settings =====

export function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM App_Settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || null;
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO App_Settings (key, value) VALUES (?, ?)').run(key, value);
}

// ===== Bulk operations =====

export function findFileNode(parentId: string | null, logicalName: string): VirtualNode | null {
  const query = parentId === null
    ? "SELECT * FROM Virtual_Nodes WHERE parent_id IS NULL AND logical_name = ? AND entity_type = 'FILE'"
    : "SELECT * FROM Virtual_Nodes WHERE parent_id = ? AND logical_name = ? AND entity_type = 'FILE'";
  
  const params = parentId === null ? [logicalName] : [parentId, logicalName];
  return (db.prepare(query).get(...params) as VirtualNode) || null;
}

export function upsertNodeWithChunks(
  nodeId: string,
  parentId: string | null,
  logicalName: string,
  totalSize: number,
  mimeType: string | null,
  chunks: Array<{ sequenceIndex: number; chunkSize: number; gitBlobSha: string; rawUrl: string; sha256Hash: string }>
): VirtualNode {
  const transaction = db.transaction(() => {
    const existing = db.prepare('SELECT node_id FROM Virtual_Nodes WHERE node_id = ?').get(nodeId);
    
    if (existing) {
      db.prepare("UPDATE Virtual_Nodes SET total_size = ?, mime_type = ?, updated_at = datetime('now') WHERE node_id = ?").run(totalSize, mimeType, nodeId);
      db.prepare('DELETE FROM Physical_Chunks WHERE node_id = ?').run(nodeId);
    } else {
      db.prepare(`
        INSERT INTO Virtual_Nodes (node_id, parent_id, logical_name, entity_type, total_size, mime_type)
        VALUES (?, ?, ?, 'FILE', ?, ?)
      `).run(nodeId, parentId, logicalName, totalSize, mimeType);
    }

    for (const chunk of chunks) {
      insertChunk(nodeId, chunk.sequenceIndex, chunk.chunkSize, chunk.gitBlobSha, chunk.rawUrl, chunk.sha256Hash);
    }
    return getNode(nodeId) as VirtualNode;
  });
  return transaction();
}
