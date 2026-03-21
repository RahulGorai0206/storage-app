import { getToken } from './auth';
import type { GitBlob, GitTreeItem } from '../types';

const API_BASE = 'https://api.github.com';

function getHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

// ===== Git Database API (Atomic Uploads) =====

/**
 * Create a Git blob from Base64-encoded content.
 */
export async function createBlob(owner: string, repo: string, base64Content: string): Promise<GitBlob> {
  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/blobs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      content: base64Content,
      encoding: 'base64',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create blob: ${response.status} ${err}`);
  }

  return (await response.json()) as GitBlob;
}

/**
 * Get the current branch reference SHA.
 */
export async function getBranchRef(owner: string, repo: string, branch: string): Promise<string> {
  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get branch ref: ${response.status}`);
  }

  const data = await response.json() as { object: { sha: string } };
  return data.object.sha;
}

/**
 * Get the tree SHA for a commit.
 */
export async function getCommitTree(owner: string, repo: string, commitSha: string): Promise<string> {
  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/commits/${commitSha}`, {
    headers: getHeaders(),
  });

  if (!response.ok) throw new Error(`Failed to get commit: ${response.status}`);

  const data = await response.json() as { tree: { sha: string } };
  return data.tree.sha;
}

/**
 * Create a new Git tree with the specified items.
 */
export async function createTree(
  owner: string,
  repo: string,
  baseTreeSha: string,
  items: GitTreeItem[]
): Promise<string> {
  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: items,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Failed to create tree: ${response.status} ${err}`);
  }

  const data = await response.json() as { sha: string };
  return data.sha;
}

/**
 * Create a commit with the given tree and parent.
 */
export async function createCommit(
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parentSha: string
): Promise<string> {
  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents: [parentSha],
    }),
  });

  if (!response.ok) throw new Error(`Failed to create commit: ${response.status}`);

  const data = await response.json() as { sha: string };
  return data.sha;
}

/**
 * Update branch reference to point to a new commit.
 */
export async function updateBranchRef(owner: string, repo: string, branch: string, commitSha: string): Promise<void> {
  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      sha: commitSha,
      force: false,
    }),
  });

  if (!response.ok) throw new Error(`Failed to update branch ref: ${response.status}`);
}

/**
 * Full atomic upload: blobs → tree → commit → ref update.
 * Returns array of { blobSha, rawUrl } for each chunk in order.
 */
export async function atomicUpload(
  owner: string,
  repo: string,
  branch: string,
  repoPath: string, // virtual path in repo, e.g., "documents/"
  chunks: Array<{ fileName: string; base64Content?: string; read?: () => Promise<{ base64Content: string, sha256: string }> }>,
  commitMessage: string,
  onProgress?: () => void,
  isCancelled?: () => boolean
): Promise<Array<{ blobSha: string; rawUrl: string; sha256Hash?: string }>> {
  // Step 1: Create blobs (strictly 1-by-1 sequentially to prevent network drops and timeouts)
  const blobResults: Array<{ blobSha: string; rawUrl: string; sha256Hash?: string }> = [];

  for (let i = 0; i < chunks.length; i++) {
    if (isCancelled && isCancelled()) {
      throw new Error('STATUS_CANCELLED');
    }
    const chunk = chunks[i];
    
    console.log(`\n[GitHub API] ⏳ Reading chunk ${i + 1}/${chunks.length} from disk to memory...`);
    const content = chunk.read ? await chunk.read() : { base64Content: chunk.base64Content!, sha256: undefined };
    
    console.log(`[GitHub API] 🚀 Uploading ${(content.base64Content.length / 1024 / 1024).toFixed(2)} MB of Base64 to GitHub as Git Blob...`);
    const blob = await createBlob(owner, repo, content.base64Content);
    console.log(`[GitHub API] ✅ Blob ${i + 1} finalized: ${blob.sha}`);
    
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoPath}${chunk.fileName}`;
    
    if (onProgress) onProgress();
    blobResults.push({ blobSha: blob.sha, rawUrl, sha256Hash: content.sha256 });
  }

  // Step 2: Get current branch state
  console.log(`[GitHub API] 🔍 Fetching branch HEAD state...`);
  const currentCommitSha = await getBranchRef(owner, repo, branch);
  const baseTreeSha = await getCommitTree(owner, repo, currentCommitSha);

  // Step 3: Create tree with all chunk files
  console.log(`[GitHub API] 🌳 Creating new Git Tree...`);
  const treeItems: GitTreeItem[] = chunks.map((chunk, idx) => ({
    path: `${repoPath}${chunk.fileName}`,
    mode: '100644' as const,
    type: 'blob' as const,
    sha: blobResults[idx].blobSha,
  }));

  const newTreeSha = await createTree(owner, repo, baseTreeSha, treeItems);

  // Step 4: Create commit
  console.log(`[GitHub API] 📝 Creating Git Commit...`);
  const newCommitSha = await createCommit(owner, repo, commitMessage, newTreeSha, currentCommitSha);

  // Step 5: Update branch reference
  console.log(`[GitHub API] 🎯 Updating Branch Ref to new commit...`);
  await updateBranchRef(owner, repo, branch, newCommitSha);

  console.log(`[GitHub API] 🎉 Multi-chunk Upload Fully Committed!`);
  return blobResults;
}

/**
 * Delete files from the repo by creating a tree without them.
 */
export async function deleteFromRepo(
  owner: string,
  repo: string,
  branch: string,
  filePaths: string[],
  commitMessage: string
): Promise<void> {
  const currentCommitSha = await getBranchRef(owner, repo, branch);
  const baseTreeSha = await getCommitTree(owner, repo, currentCommitSha);

  // Setting sha to null with mode 100644 effectively deletes
  const treeItems = filePaths.map((filePath) => ({
    path: filePath,
    mode: '100644' as const,
    type: 'blob' as const,
    sha: null as unknown as string, // null sha deletes
  }));

  const newTreeSha = await createTree(owner, repo, baseTreeSha, treeItems);
  const newCommitSha = await createCommit(owner, repo, commitMessage, newTreeSha, currentCommitSha);
  await updateBranchRef(owner, repo, branch, newCommitSha);
}

/**
 * Upload a small file (< 25MB) directly via the Contents API.
 */
export async function uploadSmallFile(
  owner: string,
  repo: string,
  branch: string,
  repoPath: string,
  base64Content: string,
  commitMessage: string
): Promise<{ blobSha: string; rawUrl: string }> {
  // The GitHub Contents API (PUT /contents/...) strictly requires the SHA of the previous 
  // file to allow overwrites, which fails frequently in caching edge cases causing false 422 errors.
  // Instead, we route small files through our robust `atomicUpload` pipeline (Blobs -> Tree -> Commit)
  // because the Git Database Tree API inherently replaces files at a path without needing its previous SHA.

  const lastSlashIndex = repoPath.lastIndexOf('/');
  const dirPath = lastSlashIndex !== -1 ? repoPath.substring(0, lastSlashIndex + 1) : '';
  const fileName = lastSlashIndex !== -1 ? repoPath.substring(lastSlashIndex + 1) : repoPath;

  const results = await atomicUpload(
    owner,
    repo,
    branch,
    dirPath,
    [{ fileName, base64Content }],
    commitMessage
  );

  return results[0];
}

/**
 * Check if a repository exists and is accessible.
 */
export async function checkRepo(owner: string, repo: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/repos/${owner}/${repo}`, {
      headers: getHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}
