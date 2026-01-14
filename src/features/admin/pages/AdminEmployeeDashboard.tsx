import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Search,
  Menu,
  Users as UsersIcon,
  ServerCrash,
  UserPlus,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import EmployeeDetailView from "../components/EmployeeDetailView";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import EmployeeAvatar from "../components/EmployeeAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// --- Types (Unchanged) ---
interface Employee {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  feedbackSheetUrl?: string;
  isAdmin?: boolean;
  isCoAdmin?: boolean;
}

type ViewState = "loading" | "empty" | "error" | "data";

// --- Custom hook for employee data (Unchanged - All logic preserved) ---
function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const functions = getFunctions();
      const getEmployees = httpsCallable(
        functions,
        "getEmployeesWithAdminStatus"
      );
      const result = await getEmployees();
      const data = result.data as Employee[];
      if (!Array.isArray(data)) throw new Error("Unexpected response format");

      setEmployees(data);
      // Reselect the current user if they still exist.
      setSelected((prev) => data.find((emp) => emp.id === prev?.id) || null);
    } catch (err) {
      console.error("Error loading employees:", err);
      setError("Could not load employee data. Please try again.");
      setEmployees([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  return {
    employees,
    selectedEmployee: selected,
    setSelectedEmployee: setSelected,
    loading,
    error,
    refresh: loadEmployees,
  };
}

// --- Animation helper for list items ---
const getItemAnimation = (index: number) => ({
  initial: { opacity: 0, x: -8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      delay: index * 0.03,
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
});

// --- Enhanced Skeleton component for a list item ---
const EmployeeListItemSkeleton: React.FC<{ index?: number }> = ({
  index = 0,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.05, duration: 0.3 }}
    className="flex items-center gap-3 w-full p-3 rounded-xl"
  >
    <Skeleton className="h-11 w-11 rounded-full shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </motion.div>
);

// --- Employee List Item Component ---
const EmployeeListItem: React.FC<{
  employee: Employee;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}> = ({ employee, isSelected, onSelect, index }) => {
  const animation = getItemAnimation(index);

  return (
    <motion.button
      initial={animation.initial}
      animate={animation.animate}
      onClick={onSelect}
      aria-selected={isSelected}
      aria-label={`Select employee ${employee.name}`}
      className={cn(
        "flex items-center gap-2.5 w-full p-2.5 rounded-lg transition-colors text-left overflow-hidden",
        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
      )}
    >
      <EmployeeAvatar
        name={employee.name}
        isSelected={isSelected}
        className="h-8 w-8 shrink-0"
      />

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-medium text-sm truncate block",
              isSelected ? "text-primary-foreground" : "text-foreground"
            )}
          >
            {employee.name}
          </span>
          {employee.isAdmin && (
            <span
              className={cn(
                "text-[9px] font-medium px-1 rounded shrink-0",
                isSelected
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-indigo-100 text-indigo-700"
              )}
            >
              Admin
            </span>
          )}
          {employee.isCoAdmin && !employee.isAdmin && (
            <span
              className={cn(
                "text-[9px] font-medium px-1 rounded shrink-0",
                isSelected
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-orange-100 text-orange-700"
              )}
            >
              Co-Admin
            </span>
          )}
        </div>
        <span
          className={cn(
            "text-xs truncate block",
            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {employee.email}
        </span>
      </div>
    </motion.button>
  );
};

// --- Enhanced Employee List Component ---
const EmployeeList: React.FC<{
  employees: Employee[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (emp: Employee) => void;
  onDone?: () => void;
}> = ({ employees, selectedId, loading, onSelect, onDone }) => {
  const [search, setSearch] = useState("");

  // Filter logic preserved
  const filteredEmployees = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return employees;
    return employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
    );
  }, [employees, search]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Enhanced header section */}
      <div className="p-4 pb-3 border-b bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <UsersIcon className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">Employees</h2>
          </div>
          <Badge variant="secondary" className="font-semibold text-xs px-2.5">
            {employees.length}
          </Badge>
        </div>

        {/* Enhanced search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            type="search"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search employees by name or email"
            className="pl-9 h-10 bg-muted/50 border-transparent focus:border-border focus:bg-background transition-colors"
          />
        </div>
      </div>

      {/* List content with scroll area */}
      <ScrollArea className="flex-1">
        <nav
          className="p-2 space-y-1"
          role="listbox"
          aria-label="Employee list"
        >
          {loading ? (
            // Enhanced skeleton loading
            Array.from({ length: 8 }).map((_, i) => (
              <EmployeeListItemSkeleton key={i} index={i} />
            ))
          ) : filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp, index) => (
              <EmployeeListItem
                key={emp.id}
                employee={emp}
                isSelected={emp.id === selectedId}
                index={index}
                onSelect={() => {
                  onSelect(emp);
                  onDone?.();
                }}
              />
            ))
          ) : (
            // Enhanced empty search state
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground px-4"
            >
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <UsersIcon className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No Results</h3>
              <p className="text-sm max-w-[200px]">
                No employees match "{search}"
              </p>
            </motion.div>
          )}
        </nav>
      </ScrollArea>
    </div>
  );
};

// --- Enhanced Placeholder component for empty/error/loading states ---
const ContentPlaceholder: React.FC<{
  state: "loading" | "error" | "empty";
  message?: string;
}> = ({ state, message }) => {
  const states = {
    loading: {
      icon: Loader2,
      title: "Loading Employees",
      description: "Fetching employee data...",
      iconClassName: "animate-spin text-primary",
      bgClassName: "bg-primary/10",
    },
    error: {
      icon: ServerCrash,
      title: "Something Went Wrong",
      description: message || "We couldn't load the data. Please try again.",
      iconClassName: "text-destructive",
      bgClassName: "bg-destructive/10",
    },
    empty: {
      icon: Sparkles,
      title: "Select an Employee",
      description:
        "Choose an employee from the list to view their details and manage their profile.",
      iconClassName: "text-primary",
      bgClassName: "bg-primary/10",
    },
  };

  const {
    icon: Icon,
    title,
    description,
    iconClassName,
    bgClassName,
  } = states[state];

  return (
    <div className="flex items-center justify-center h-full p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center text-center max-w-md"
      >
        {/* Decorative background rings */}
        <div className="relative mb-6">
          <div
            className={cn(
              "absolute inset-0 rounded-full opacity-20 blur-xl scale-150",
              bgClassName
            )}
          />
          <div className={cn("relative p-5 rounded-2xl", bgClassName)}>
            <Icon className={cn("h-10 w-10", iconClassName)} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          {description}
        </p>

        {state === "empty" && (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground/70">
            <div className="h-px w-8 bg-border" />
            <span>or use search to find quickly</span>
            <div className="h-px w-8 bg-border" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

// --- Enhanced Dashboard Content Component (Logic preserved) ---
const DashboardContent: React.FC<{
  viewState: ViewState;
  errorMessage?: string;
  employee?: Employee;
  onActionComplete: () => void;
}> = ({ viewState, errorMessage, employee, onActionComplete }) => {
  if (viewState !== "data" || !employee) {
    return (
      <ContentPlaceholder
        state={viewState === "data" ? "empty" : viewState}
        message={errorMessage}
      />
    );
  }

  return (
    <EmployeeDetailView
      employee={employee}
      onActionComplete={onActionComplete}
    />
  );
};

// --- Enhanced Desktop Header Component ---
const DesktopHeader: React.FC<{
  employee: Employee | null;
}> = ({ employee }) => {
  if (!employee) return null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="hidden lg:flex items-center gap-4 px-8 py-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10"
    >
      <EmployeeAvatar name={employee.name} className="h-10 w-10" />
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-lg truncate">{employee.name}</h1>
        <p className="text-sm text-muted-foreground truncate">
          {employee.email}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {employee.isAdmin && (
          <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-100">
            Admin
          </Badge>
        )}
        {employee.isCoAdmin && (
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 hover:bg-orange-100">
            Co-Admin
          </Badge>
        )}
      </div>
    </motion.header>
  );
};

// --- Enhanced Mobile Header Component ---
const MobileHeader: React.FC<{
  employees: Employee[];
  selectedEmployee: Employee | null;
  loading: boolean;
  setSelectedEmployee: (emp: Employee) => void;
}> = ({ employees, selectedEmployee, loading, setSelectedEmployee }) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <header className="lg:hidden px-4 py-3 border-b bg-background/95 backdrop-blur-md flex items-center gap-3 sticky top-0 z-20">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            aria-label="Open employee menu"
            className="shrink-0 h-10 w-10 rounded-xl border-muted-foreground/20"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[320px] sm:w-[380px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Employees</SheetTitle>
            <SheetDescription>
              A list of all employees. Select one to view their details.
            </SheetDescription>
          </SheetHeader>
          <EmployeeList
            employees={employees}
            selectedId={selectedEmployee?.id ?? null}
            loading={loading}
            onSelect={setSelectedEmployee}
            onDone={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
      Selected employee info or title
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {selectedEmployee ? (
          <>
            <EmployeeAvatar
              name={selectedEmployee.name}
              className="h-9 w-9 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-[15px] truncate leading-tight">
                {selectedEmployee.name}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {selectedEmployee.email}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <UsersIcon className="h-4 w-4 text-primary" />
            </div>
            <h1 className="font-bold text-lg">Employees</h1>
          </div>
        )}
      </div>
      {/* Mobile badges */}
      {selectedEmployee &&
        (selectedEmployee.isAdmin || selectedEmployee.isCoAdmin) && (
          <div className="flex gap-1">
            {selectedEmployee.isAdmin && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
              >
                Admin
              </Badge>
            )}
            {selectedEmployee.isCoAdmin && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
              >
                Co-Admin
              </Badge>
            )}
          </div>
        )}
    </header>
  );
};

// --- Main dashboard component (All logic preserved) ---
const AdminEmployeeDashboard: React.FC = () => {
  const {
    employees,
    selectedEmployee,
    setSelectedEmployee,
    loading,
    error,
    refresh,
  } = useEmployees();

  // View state logic preserved
  const viewState: ViewState = useMemo(() => {
    if (loading && employees.length === 0) return "loading";
    if (error) return "error";
    return selectedEmployee ? "data" : "empty";
  }, [error, loading, selectedEmployee, employees.length]);

  const contentKey = selectedEmployee ? selectedEmployee.id : viewState;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Enhanced Sidebar for large screens */}
      <aside className="hidden lg:flex lg:flex-col w-80 xl:w-[340px] shrink-0 border-r bg-muted/20">
        <EmployeeList
          employees={employees}
          selectedId={selectedEmployee?.id ?? null}
          loading={loading && employees.length === 0}
          onSelect={setSelectedEmployee}
        />
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <MobileHeader
          employees={employees}
          selectedEmployee={selectedEmployee}
          loading={loading}
          setSelectedEmployee={setSelectedEmployee}
        />

        {/* Content wrapper */}
        <main className="flex-1 overflow-y-auto styled-scrollbar">
          {/* Main content with animations */}
          <div className="p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={contentKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="min-h-[calc(100vh-12rem)]"
              >
                <DashboardContent
                  viewState={viewState}
                  errorMessage={error || undefined}
                  employee={selectedEmployee || undefined}
                  onActionComplete={refresh}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminEmployeeDashboard;
