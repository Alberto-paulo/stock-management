"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Toast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { Plus, StickyNote, Trash2 } from "lucide-react";

interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  user: { name: string };
  order: { id: string; status: string } | null;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [form, setForm] = useState({ title: "", content: "", orderId: "" });

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (res.ok) setNotes(await res.json());
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          orderId: form.orderId || undefined,
        }),
      });

      if (res.ok) {
        setToast({ message: "Anotação criada!", type: "success" });
        setDialogOpen(false);
        setForm({ title: "", content: "", orderId: "" });
        fetchNotes();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao criar anotação", type: "error" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setToast({ message: "Anotação removida!", type: "success" });
        fetchNotes();
      } else {
        const err = await res.json();
        setToast({ message: err.error || "Erro", type: "error" });
      }
    } catch {
      setToast({ message: "Erro ao remover", type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anotações</h1>
          <p className="text-slate-500">Notas internas e lembretes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Anotação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Anotação</DialogTitle>
              <DialogDescription>Crie uma nota interna</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>ID da Encomenda (opcional)</Label>
                <Input
                  value={form.orderId}
                  onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                  placeholder="Deixe vazio se não associar"
                />
              </div>
              <Button type="submit" className="w-full">Criar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <StickyNote className="h-4 w-4 text-yellow-500" />
                  {note.title}
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(note.id)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{note.content}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{note.user.name}</span>
                <span>{formatDateTime(note.createdAt)}</span>
              </div>
              {note.order && (
                <p className="mt-1 text-xs text-blue-500">Encomenda: {note.order.status}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {notes.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            Nenhuma anotação encontrada
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
