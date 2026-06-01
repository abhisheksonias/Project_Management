import React, { useState, useRef, useEffect } from 'react';
import { Editor } from '@tiptap/react';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { User } from '@/features/users/services/userService';
import { cn } from '@/lib/utils';

interface MentionAutocompleteForEditorProps {
  users: User[];
  editor: Editor | null;
  onMentionSelect?: (userId: string, userName: string) => void;
}

export const MentionAutocompleteForEditor: React.FC<MentionAutocompleteForEditorProps> = ({
  users,
  editor,
  onMentionSelect,
}) => {
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { from, to } = editor.state.selection;
      const textBeforeCursor = editor.state.doc.textBetween(0, from, ' ');
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
        const hasSpace = textAfterAt.includes(' ');

        if (!hasSpace && textAfterAt.length < 50) {
          setMentionQuery(textAfterAt);
          setShowAutocomplete(true);
          
          // Calculate position
          const editorElement = editor.view.dom;
          const rect = editorElement.getBoundingClientRect();
          const coords = editor.view.coordsAtPos(from);
          
          setPosition({
            top: coords.top + window.scrollY + 20,
            left: coords.left + window.scrollX,
          });
        } else {
          setShowAutocomplete(false);
        }
      } else {
        setShowAutocomplete(false);
      }
    };

    editor.on('selectionUpdate', handleUpdate);
    editor.on('update', handleUpdate);

    return () => {
      editor.off('selectionUpdate', handleUpdate);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  useEffect(() => {
    if (mentionQuery && users.length > 0) {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
          (user.email ?? '').toLowerCase().includes(mentionQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
      setSelectedIndex(0);
    } else {
      setFilteredUsers(users.slice(0, 5));
    }
  }, [mentionQuery, users]);

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

  const handleSelectUser = (user: User) => {
    if (!editor) return;

    const { from } = editor.state.selection;
    const textBeforeCursor = editor.state.doc.textBetween(0, from, ' ');
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Delete from @ to cursor
      editor
        .chain()
        .focus()
        .deleteRange({ from: lastAtIndex, to: from })
        .insertContent(`@${user.name} `)
        .run();

      onMentionSelect?.(user.id, user.name);
    }

    setShowAutocomplete(false);
    setMentionQuery('');
  };

  if (!showAutocomplete || filteredUsers.length === 0 || !editor) {
    return null;
  }

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
                  {user.email ? (
                    <span className="text-xs text-muted-foreground">{user.email}</span>
                  ) : null}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

