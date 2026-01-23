/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  const m = s1.length;
  const n = s2.length;
  
  // Create distance matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return dp[m][n];
}

/**
 * Calculate similarity ratio between two strings (0-1, where 1 is identical)
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLength;
}

/**
 * Calculate name similarity with special handling for names
 * Handles reversed names, partial matches, nicknames, etc.
 */
export function nameSimilarity(name1: string, name2: string): number {
  const n1 = name1.toLowerCase().trim();
  const n2 = name2.toLowerCase().trim();
  
  // Exact match
  if (n1 === n2) return 1;
  
  // Direct similarity
  const directSimilarity = stringSimilarity(n1, n2);
  
  // Check reversed name order (e.g., "Jean Dupont" vs "Dupont Jean")
  const parts1 = n1.split(/\s+/);
  const parts2 = n2.split(/\s+/);
  
  let reversedSimilarity = 0;
  if (parts1.length >= 2 && parts2.length >= 2) {
    const reversed1 = [...parts1].reverse().join(' ');
    reversedSimilarity = stringSimilarity(reversed1, n2);
  }
  
  // Check if first or last name matches
  let partialMatch = 0;
  for (const part1 of parts1) {
    for (const part2 of parts2) {
      if (part1.length >= 2 && part2.length >= 2) {
        const partSim = stringSimilarity(part1, part2);
        if (partSim > partialMatch) partialMatch = partSim;
      }
    }
  }
  
  // Weighted combination
  return Math.max(directSimilarity, reversedSimilarity, partialMatch * 0.8);
}

/**
 * Calculate email similarity with special handling for email addresses
 */
export function emailSimilarity(email1: string, email2: string): number {
  const e1 = email1.toLowerCase().trim();
  const e2 = email2.toLowerCase().trim();
  
  if (e1 === e2) return 1;
  
  const [local1, domain1] = e1.split('@');
  const [local2, domain2] = e2.split('@');
  
  // Same domain gives a small boost
  const domainMatch = domain1 === domain2 ? 0.1 : 0;
  
  // Compare local parts
  const localSimilarity = stringSimilarity(local1, local2);
  
  // Overall email similarity
  const overallSimilarity = stringSimilarity(e1, e2);
  
  return Math.max(overallSimilarity, localSimilarity * 0.9 + domainMatch);
}

/**
 * Normalize phone number for comparison
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-9); // Keep last 9 digits
}

/**
 * Calculate phone similarity
 */
export function phoneSimilarity(phone1: string | null | undefined, phone2: string | null | undefined): number {
  if (!phone1 || !phone2) return 0;
  
  const p1 = normalizePhone(phone1);
  const p2 = normalizePhone(phone2);
  
  if (p1 === p2) return 1;
  if (p1.length < 5 || p2.length < 5) return 0;
  
  // Check if one contains the other
  if (p1.includes(p2) || p2.includes(p1)) return 0.9;
  
  // Calculate digit-based similarity
  return stringSimilarity(p1, p2);
}

/**
 * Calculate overall duplicate score between two records
 */
export interface DuplicateScoreResult {
  score: number;
  nameScore: number;
  emailScore: number;
  phoneScore: number;
  reasons: string[];
}

export function calculateDuplicateScore(
  record1: { name: string; email: string; phone?: string | null },
  record2: { name: string; email: string; phone?: string | null }
): DuplicateScoreResult {
  const nameScore = nameSimilarity(record1.name, record2.name);
  const emailScore = emailSimilarity(record1.email, record2.email);
  const phoneScore = phoneSimilarity(record1.phone, record2.phone);
  
  const reasons: string[] = [];
  
  if (nameScore >= 0.8) reasons.push(`Noms similaires (${Math.round(nameScore * 100)}%)`);
  if (emailScore >= 0.8) reasons.push(`Emails similaires (${Math.round(emailScore * 100)}%)`);
  if (phoneScore >= 0.8) reasons.push(`Téléphones similaires (${Math.round(phoneScore * 100)}%)`);
  
  // Weighted score calculation
  // Email exact match is strongest indicator, then phone, then name
  let score = 0;
  
  if (emailScore === 1) {
    score = 1; // Exact email match
  } else if (phoneScore === 1) {
    score = 0.95; // Exact phone match
  } else {
    // Weighted average with bonuses for high individual scores
    score = nameScore * 0.4 + emailScore * 0.4 + phoneScore * 0.2;
    
    // Boost if multiple fields match well
    if (nameScore >= 0.7 && emailScore >= 0.7) score = Math.max(score, 0.85);
    if (nameScore >= 0.7 && phoneScore >= 0.8) score = Math.max(score, 0.85);
  }
  
  return { score, nameScore, emailScore, phoneScore, reasons };
}

/**
 * Find duplicate groups in a list of records
 */
export function findDuplicateGroups<T extends { id: string; name: string; email: string; phone?: string | null }>(
  records: T[],
  threshold: number = 0.6
): { group: T[]; score: number; reasons: string[] }[] {
  const groups: { group: T[]; score: number; reasons: string[] }[] = [];
  const processed = new Set<string>();
  
  for (let i = 0; i < records.length; i++) {
    if (processed.has(records[i].id)) continue;
    
    const group: T[] = [records[i]];
    let groupScore = 0;
    let groupReasons: string[] = [];
    
    for (let j = i + 1; j < records.length; j++) {
      if (processed.has(records[j].id)) continue;
      
      const result = calculateDuplicateScore(records[i], records[j]);
      
      if (result.score >= threshold) {
        group.push(records[j]);
        groupScore = Math.max(groupScore, result.score);
        groupReasons = [...new Set([...groupReasons, ...result.reasons])];
      }
    }
    
    if (group.length > 1) {
      group.forEach((r) => processed.add(r.id));
      groups.push({ group, score: groupScore, reasons: groupReasons });
    }
  }
  
  // Sort by score descending
  return groups.sort((a, b) => b.score - a.score);
}
