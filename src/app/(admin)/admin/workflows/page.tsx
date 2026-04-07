"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModalWrapper } from "@/components/shared/modal-wrapper";
import { EmptyState } from "@/components/shared/empty-state";
import {
  TASK_STATUS_LABELS,
  type TaskStatus,
  TASK_CATEGORY_LABELS,
  type TaskCategory,
} from "@/types/enums";
import { formatDate, getStatusVariant } from "@/lib/utils";
import { useProcessTasks } from "@/features/queries";
import { useUpdateTaskStatus, useCreateTask } from "@/features/mutations";
import { ListChecks, Plus, Search } from "lucide-react";
import type { Tables } from "@/types/database";

type TaskWithUser = Tables<"process_tasks"> & {
  users?: { first_name: string; last_name: string; company_name: string } | null;
};

export default function AdminWorkflowsPage() {
  const supabase = createClient();
  const { data: tasksRaw = [], isLoading: loading } = useProcessTasks();
  const tasks = tasksRaw as TaskWithUser[];
  const updateTaskStatusMutation = useUpdateTaskStatus();
  const createTaskMutation = useCreateTask();

  const [customers, setCustomers] = useState<
    { id: string; first_name: string; last_name: string; company_name: string }[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Yeni görev state
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState<string>("legal");
  const [newTaskCustomer, setNewTaskCustomer] = useState("");
  const [newTaskNotes, setNewTaskNotes] = useState("");

  // Müşterileri çek
  const fetchCustomers = useCallback(async () => {
    const { data } = await supabase
      .from("users")
      .select("id, first_name, last_name, company_name")
      .order("company_name", { ascending: true });
    setCustomers(data ?? []);
  }, [supabase]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchCustomers();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [fetchCustomers]);

  function handleUpdateTaskStatus(taskId: string, newStatus: TaskStatus) {
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  }

  function handleAddTask() {
    if (!newTaskCustomer || !newTaskName) {
      return;
    }

    // Sıra numarasını hesapla
    const customerTasks = tasks.filter((t) => t.user_id === newTaskCustomer);
    const maxOrder = customerTasks.reduce(
      (max, t) => Math.max(max, t.sort_order),
      0
    );

    createTaskMutation.mutate(
      {
        user_id: newTaskCustomer,
        task_name: newTaskName,
        task_category: newTaskCategory,
        notes: newTaskNotes || undefined,
        sort_order: maxOrder + 1,
      },
      {
        onSuccess: () => {
          setAddModalOpen(false);
          setNewTaskName("");
          setNewTaskNotes("");
        },
      },
    );
  }

  const filteredTasks = tasks.filter((t) => {
    if (selectedCustomer !== "all" && t.user_id !== selectedCustomer)
      return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        t.task_name.toLowerCase().includes(s) ||
        t.users?.company_name?.toLowerCase().includes(s) ||
        false
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Süreç Yönetimi
          </h1>
          <p className="text-muted-foreground">
            Müşteri süreç görevlerini oluşturun ve ilerletin.
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Yeni Görev
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Görev adı veya şirket ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Müşteri seç" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Müşteriler</SelectItem>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.company_name} — {c.first_name} {c.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task Matrix */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">
              Yükleniyor...
            </p>
          ) : filteredTasks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Görev</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tamamlanma</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task, idx) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {task.users?.company_name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.users?.first_name} {task.users?.last_name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{task.task_name}</p>
                      {task.notes && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {task.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TASK_CATEGORY_LABELS[
                          task.task_category as TaskCategory
                        ] ?? task.task_category ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(task.task_status)}>
                        {TASK_STATUS_LABELS[
                          task.task_status as TaskStatus
                        ] ?? task.task_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {task.completed_at
                        ? formatDate(task.completed_at)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={task.task_status}
                        onValueChange={(val) =>
                          handleUpdateTaskStatus(task.id, val as TaskStatus)
                        }
                      >
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            Object.entries(TASK_STATUS_LABELS) as [
                              TaskStatus,
                              string,
                            ][]
                          ).map(([val, label]) => (
                            <SelectItem key={val} value={val}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={<ListChecks className="h-12 w-12" />}
                title="Görev bulunamadı"
                description="Yeni görev ekleyin veya filtreleri değiştirin."
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yeni Görev Modal */}
      <ModalWrapper
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        title="Yeni Süreç Görevi"
        description="Müşteriye yeni bir süreç görevi atayın."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Müşteri</label>
            <Select value={newTaskCustomer} onValueChange={setNewTaskCustomer}>
              <SelectTrigger>
                <SelectValue placeholder="Müşteri seçin" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company_name} — {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Görev Adı</label>
            <Input
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              placeholder="Örn: LLC Kurulumu"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Kategori</label>
            <Select value={newTaskCategory} onValueChange={setNewTaskCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(TASK_CATEGORY_LABELS) as [
                    TaskCategory,
                    string,
                  ][]
                ).map(([val, label]) => (
                  <SelectItem key={val} value={val}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notlar (Opsiyonel)</label>
            <Textarea
              value={newTaskNotes}
              onChange={(e) => setNewTaskNotes(e.target.value)}
              placeholder="Görev hakkında ek bilgi..."
              rows={3}
            />
          </div>
          <Button className="w-full" onClick={handleAddTask}>
            Görev Oluştur
          </Button>
        </div>
      </ModalWrapper>
    </div>
  );
}
