export function matchesToolPattern(toolName: string, pattern: string): boolean {
  // Exact match for patterns without wildcards (backward compatibility)
  if (!pattern.includes('*')) {
    return toolName === pattern;
  }
  
  // Convert glob pattern to regex with proper escaping
  const escapedPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '.*'); // Replace * with .*
  
  const regex = new RegExp(`^${escapedPattern}$`);
  return regex.test(toolName);
}