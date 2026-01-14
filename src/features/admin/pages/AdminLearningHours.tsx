"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useAdminLearningPoints } from "@/features/learning-hours/hooks/useAdminLearningPoints";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Loader2,
  Calendar as CalendarIcon,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  LayoutGrid,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { LearningPoint } from "@/features/learning-hours/types";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { httpsCallable, getFunctions } from "firebase/functions";
import { useToast } from "@/components/ui/use-toast";
import { useUserAuth } from "@/context/UserAuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

// --- Components ---

const PointDetails = ({ point }: { point: LearningPoint }) => {
  const detailItems = [
    { label: "Problem", value: point.problem },
    { label: "Core Point Missed", value: point.core_point_missed },
    { label: "Situation", value: point.situation },
    { label: "Behavior", value: point.behavior },
    { label: "Impact", value: point.impact },
    { label: "Action Item", value: point.action_item, fullWidth: true },
    { label: "Framework Category", value: point.framework_category },
    { label: "Subcategory", value: point.subcategory },
    { label: "Task Link", value: point.task_link, isLink: true },
  ].filter((item) => item.value);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="p-6 bg-muted/40 border-t"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {detailItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              "space-y-1.5 p-4 rounded-xl bg-background border shadow-sm",
              item.fullWidth && "md:col-span-2 lg:col-span-3"
            )}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {item.label}
            </p>
            {item.isLink ? (
              <a
                href={item.value}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline break-all"
              >
                {item.value}
              </a>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {item.value}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const LearningPointSkeletonRow = () => (
  <TableRow>
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-48" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-5 w-16" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-32" />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-24" />
    </TableCell>
  </TableRow>
);

const AdminLearningHours = () => {
  const [date, setDate] = useState<Date>(new Date());
  const { learningPoints, employees, isLoading, refetch } =
    useAdminLearningPoints(date);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDateSynced, setIsDateSynced] = useState<boolean>(false);
  const { toast } = useToast();
  const { isAdmin, isCoAdmin } = useUserAuth();
  const isAdminUser = isAdmin || isCoAdmin;

  const checkSyncStatus = useCallback(async () => {
    if (!isAdminUser) return;
    try {
      const dateString = format(date, "yyyy-MM-dd");
      const docRef = doc(db, "learning_hours", dateString);
      const docSnap = await getDoc(docRef);
      setIsDateSynced(docSnap.exists() && docSnap.data().synced === true);
    } catch (error) {
      console.error("Error checking sync status:", error);
      setIsDateSynced(false);
    }
  }, [date, isAdminUser]);

  const handleSyncByDate = async () => {
    if (!date) return;
    setIsSyncing(true);
    try {
      const syncFunction = httpsCallable(
        getFunctions(),
        "syncLearningHoursByDate"
      );
      const dateString = format(date, "yyyy-MM-dd");
      const result = (await syncFunction({ date: dateString })) as any;
      const message = result.data.message;

      toast({
        title: message.includes("Already synced")
          ? "Already Synced"
          : "Sync Complete",
        description: message,
        variant: message.includes("Failed") ? "destructive" : "default",
      });

      if (!message.includes("Failed")) {
        refetch();
        setIsDateSynced(true);
      }
    } catch (error: any) {
      console.error("Failed to sync:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [date, refetch]);

  useEffect(() => {
    if (isAdminUser) checkSyncStatus();
  }, [date, isAdminUser, checkSyncStatus]);

  const employeeMap = useMemo(() => {
    return employees.reduce((acc, emp) => {
      acc[emp.id] = emp.name;
      return acc;
    }, {} as Record<string, string>);
  }, [employees]);

  const filteredLearningPoints = useMemo(() => {
    let points = learningPoints;

    // Employee Filter
    if (selectedEmployeeId !== "all") {
      points = points.filter((point) => point.userId === selectedEmployeeId);
    }

    // Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      points = points.filter(
        (point) =>
          point.task_name.toLowerCase().includes(query) ||
          (employeeMap[point.userId] || "").toLowerCase().includes(query) ||
          point.point_type.toLowerCase().includes(query) ||
          point.situation.toLowerCase().includes(query)
      );
    }

    return points;
  }, [learningPoints, selectedEmployeeId, searchQuery, employeeMap]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 container mx-auto p-4 md:p-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Learning Points Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and manage accumulated learning points.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal border-border/60 hover:bg-muted/50",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  if (d) {
                    const correctedDate = new Date(
                      Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
                    );
                    setDate(correctedDate);
                  }
                  setIsDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {isAdminUser && (
            <Button
              onClick={handleSyncByDate}
              disabled={isSyncing || isDateSynced}
              className={cn(
                "min-w-[140px] shadow-sm",
                isDateSynced
                  ? "bg-green-50 text-green-700 hover:bg-green-100 border-green-200 border dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
                  : ""
              )}
              variant={isDateSynced ? "outline" : "default"}
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isDateSynced ? (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isSyncing
                ? "Syncing..."
                : isDateSynced
                ? "Sheet Synced"
                : "Sync to Sheet"}
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border/60 shadow-lg overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-lg">
              Points for {format(date, "MMM do")}
            </h2>
            <Badge variant="secondary" className="ml-2 font-normal">
              {filteredLearningPoints.length} total
            </Badge>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search points..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background"
              />
            </div>
            <Select
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-background">
          <Table>
            <TableHeader className="bg-muted/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Employee</TableHead>
                <TableHead className="w-[300px]">Task</TableHead>
                <TableHead className="w-[120px]">Point Type</TableHead>
                <TableHead className="w-[200px]">Recipient</TableHead>
                <TableHead className="text-right w-[150px]">Time</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <LearningPointSkeletonRow key={i} />
                ))
              ) : filteredLearningPoints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Search className="h-6 w-6 opacity-50" />
                      </div>
                      <p className="font-medium">No learning points found</p>
                      <p className="text-sm mt-1">
                        Try adjusting your filters or search query.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredLearningPoints.map((point) => {
                    const isOpen = openRowId === point.id;
                    const employeeName = employeeMap[point.userId] || "Unknown";

                    return (
                      <React.Fragment key={point.id}>
                        <motion.tr
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setOpenRowId(isOpen ? null : point.id)}
                          className={cn(
                            "cursor-pointer group hover:bg-muted/30 transition-colors border-b last:border-0",
                            isOpen && "bg-muted/40"
                          )}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                {employeeName.substring(0, 2)}
                              </div>
                              <span>{employeeName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="line-clamp-1 font-medium text-foreground/80 group-hover:text-primary transition-colors">
                              {point.task_name}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "capitalize",
                                point.point_type === "R1"
                                  ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                                  : point.point_type === "R2"
                                  ? "border-purple-200 text-purple-700 bg-purple-50"
                                  : "border-orange-200 text-orange-700 bg-orange-50"
                              )}
                            >
                              {point.point_type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {point.recipient}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                            {format(point.createdAt.toDate(), "h:mm a")}
                          </TableCell>
                          <TableCell>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-180"
                              )}
                            />
                          </TableCell>
                        </motion.tr>

                        <AnimatePresence>
                          {isOpen && (
                            <TableRow className="border-0 hover:bg-transparent">
                              <TableCell colSpan={6} className="p-0 border-b">
                                <PointDetails point={point} />
                              </TableCell>
                            </TableRow>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AdminLearningHours;
