/**
 * Utility functions for parsing and handling @mentions in comments
 */

export interface Mention {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Parse @mentions from text
 * Format: @username or @user_id
 * Returns array of mentions with their positions
 */
export function parseMentions(
  text: string,
  userMap: Map<string, { id: string; name: string }>
): Mention[] {
  const mentions: Mention[] = [];
  // Match @ followed by word characters (allowing spaces, hyphens, etc.) until space or end
  // This handles both "@username" and "@username " formats
  const mentionRegex = /@([\w\s-]+?)(?=\s|$)/g;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionText = match[1].trim();
    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;

    // Try to find user by exact name match first, then partial match
    let foundUser: { id: string; name: string } | null = null;
    
    for (const [key, user] of userMap.entries()) {
      const userNameLower = user.name.toLowerCase().trim();
      const mentionTextLower = mentionText.toLowerCase();
      
      // Exact match (case-insensitive)
      if (userNameLower === mentionTextLower) {
        foundUser = user;
        break;
      }
      
      // Partial match - check if mention text matches part of user name
      if (userNameLower.includes(mentionTextLower) || mentionTextLower.includes(userNameLower)) {
        foundUser = user;
        break;
      }
      
      // ID match
      if (user.id.toLowerCase() === mentionTextLower) {
        foundUser = user;
        break;
      }
    }

    if (foundUser) {
      mentions.push({
        userId: foundUser.id,
        userName: foundUser.name,
        startIndex,
        endIndex,
      });
    }
  }

  return mentions;
}

/**
 * Extract unique user IDs from mentions
 */
export function extractMentionedUserIds(mentions: Mention[]): string[] {
  const userIds = new Set<string>();
  mentions.forEach((mention) => {
    userIds.add(mention.userId);
  });
  return Array.from(userIds);
}

/**
 * Highlight mentions in text (for display)
 */
export function highlightMentions(text: string, mentions: Mention[]): string {
  let result = text;
  // Sort mentions by start index in reverse to maintain positions when replacing
  const sortedMentions = [...mentions].sort((a, b) => b.startIndex - a.startIndex);

  sortedMentions.forEach((mention) => {
    const before = result.substring(0, mention.startIndex);
    const mentionText = result.substring(mention.startIndex, mention.endIndex);
    const after = result.substring(mention.endIndex);
    result = `${before}<span class="font-semibold text-primary">${mentionText}</span>${after}`;
  });

  return result;
}

