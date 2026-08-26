import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeadlineSetting() {
  const { data: settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [deadline, setDeadline] = useState("");
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("project_settings")
        .update({ deadline, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-settings"] });
      toast.success("Deadline updated");
      setOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDeadline(settings?.deadline ?? "");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Set project deadline
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Project deadline</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="deadline">Target completion date</Label>
          <Input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <Button onClick={() => save.mutate()} disabled={!deadline || save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
