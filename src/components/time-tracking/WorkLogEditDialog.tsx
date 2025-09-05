import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface WorkLog {
  id: string;
  hours: string;
  note: string | null;
  created_at: string;
  projects: { name: string; type: string };
  tasks: { name: string; status: string } | null;
}

interface WorkLogEditDialogProps {
  workLog: WorkLog | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const WorkLogEditDialog: React.FC<WorkLogEditDialogProps> = ({
  workLog,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    hours: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (workLog) {
      setFormData({
        hours: workLog.hours || '',
        note: workLog.note || '',
      });
    }
  }, [workLog]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workLog) return;

    // Validate hours format (HH:MM)
    const hoursRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!hoursRegex.test(formData.hours)) {
      toast({
        title: 'Error',
        description: 'Please enter hours in HH:MM format (e.g., 08:30)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('work_logs')
        .update({
          hours: formData.hours,
          note: formData.note.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workLog.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Work log updated successfully',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating work log:', error);
      toast({
        title: 'Error',
        description: 'Failed to update work log',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ hours: '', note: '' });
    onClose();
  };

  if (!workLog) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Work Log</DialogTitle>
          <DialogDescription>
            Update your work log entry for {workLog.projects.name}
            {workLog.tasks && ` - ${workLog.tasks.name}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hours">Hours *</Label>
            <Input
              id="hours"
              type="text"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="08:30"
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter time in HH:MM format (e.g., 08:30 for 8 hours 30 minutes)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Add a note about what you worked on..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Work Log'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
