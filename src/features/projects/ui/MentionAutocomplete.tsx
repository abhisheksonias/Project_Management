import React, { useState, useRef, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { User } from '@/features/users/services/userService';
import { cn } from '@/lib/utils';

interface MentionAutocompleteProps {
  users: User[];
  text: string;
  onTextChange: (text: string) => void;
  onMentionSelect: (userId: string, userName: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  users,
  text,
  onTextChange,
  onMentionSelect,
  textareaRef,
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showAutocomplete) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredUsers.length > 0) {
        e.preventDefault();
        const selectedUser = filteredUsers[selectedIndex];
        if (selectedUser) {
          handleSelectUser(selectedUser);
        }
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAutocomplete, filteredUsers, selectedIndex]);

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const position = textarea.selectionStart;
      setCursorPosition(position);

      // Check if we're typing @
      const textBeforeCursor = text.substring(0, position);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        // Check if there's a space after @ (meaning mention is complete)
        const hasSpace = textAfterAt.includes(' ');

        if (!hasSpace) {
          setMentionQuery(textAfterAt);
          setShowAutocomplete(true);
        } else {
          setShowAutocomplete(false);
        }
      } else {
        setShowAutocomplete(false);
      }
    }
  }, [text, textareaRef]);

  useEffect(() => {
    if (mentionQuery && users.length > 0) {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredUsers(users.slice(0, 5)); // Show first 5 users by default
    }
  }, [mentionQuery, users]);

  const handleSelectUser = (user: User) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterCursor = text.substring(cursorPosition);
      const newText =
        text.substring(0, lastAtIndex) + `@${user.name} ` + textAfterCursor;

      onTextChange(newText);
      onMentionSelect(user.id, user.name);

      // Set cursor position after the mention
      setTimeout(() => {
        const newPosition = lastAtIndex + user.name.length + 2; // +2 for '@' and ' '
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }

    setShowAutocomplete(false);
    setMentionQuery('');
  };

  if (!showAutocomplete || filteredUsers.length === 0) {
    return null;
  }

  // Calculate position for popover
  const getPopoverPosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };
    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();
    
    // Approximate position based on cursor (simple calculation)
    const lineHeight = 24; // Approximate line height
    const lines = (text.substring(0, cursorPosition).match(/\n/g) || []).length;
    const top = rect.top + (lines * lineHeight) + 30;
    
    return {
      top,
      left: rect.left + 10,
    };
  };

  const position = getPopoverPosition();

  return (
    <div
      className="fixed z-50 bg-white rounded-lg border shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <Command className="w-[250px]">
        <CommandList>
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup>
            {filteredUsers.map((user, index) => (
              <CommandItem
                key={user.id}
                onSelect={() => handleSelectUser(user)}
                className={cn(
                  'cursor-pointer',
                  index === selectedIndex && 'bg-accent'
                )}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

