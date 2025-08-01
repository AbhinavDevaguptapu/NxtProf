import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Menu, Users as UsersIcon, ServerCrash, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import AdminEmployeeDetail from "./AdminEmployeeDetail";
import AttendanceSummaryCard from "../components/AttendanceSummaryCard";
import ActionsCard from "../components/ActionsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import EmployeeAvatar from "../components/EmployeeAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// --- Types ---
interface Employee {
    id: string;
    name:string;
    email: string;
    employeeId?: string;
    feedbackSheetUrl?: string;
    isAdmin?: boolean;
}

type ViewState = "loading" | "empty" | "error" | "data";

// --- Custom hook for employee data (Unchanged) ---
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
            const getEmployees = httpsCallable(functions, "getEmployeesWithAdminStatus");
            const result = await getEmployees();
            const data = result.data as Employee[];
            if (!Array.isArray(data)) throw new Error("Unexpected response format");
            
            setEmployees(data);
            // Reselect the current user if they still exist, otherwise select the first.
            setSelected(prev => data.find(emp => emp.id === prev?.id) || data[0] || null);
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
        refresh: loadEmployees
    };
}

// --- NEW: Skeleton component for a list item ---
const EmployeeListItemSkeleton: React.FC = () => (
    <div className="flex items-center gap-3 w-full p-2 rounded-lg">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    </div>
);

// --- UPDATED: Employee List Item Component ---
const EmployeeListItem: React.FC<{
    employee: Employee;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ employee, isSelected, onSelect }) => (
    <button
        onClick={onSelect}
        className={cn(
            "flex items-center gap-3 w-full p-2 rounded-lg transition-colors text-left",
            isSelected
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
        )}
    >
        <EmployeeAvatar name={employee.name} isSelected={isSelected} />
        <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{employee.name}</div>
            <div className={cn("text-xs truncate", isSelected ? "text-accent-foreground/80" : "text-muted-foreground")}>
                {employee.email}
            </div>
        </div>
        {employee.isAdmin && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                Admin
            </span>
        )}
    </button>
);

// --- UPDATED: Employee List Component with Skeleton Loading ---
const EmployeeList: React.FC<{
    employees: Employee[];
    selectedId: string | null;
    loading: boolean;
    onSelect: (emp: Employee) => void;
    onDone?: () => void; // For closing sheet on mobile
}> = ({ employees, selectedId, loading, onSelect, onDone }) => {
    const [search, setSearch] = useState("");

    const filteredEmployees = useMemo(() => {
        const query = search.toLowerCase().trim();
        if (!query) return employees;
        return employees.filter(emp =>
            emp.name.toLowerCase().includes(query) ||
            emp.email.toLowerCase().includes(query)
        );
    }, [employees, search]);

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-4 border-b">
                <h2 className="text-lg font-semibold tracking-tight">Employees ({employees.length})</h2>
                <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name or email"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 w-full"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar">
                {loading ? (
                    <div className="p-2 space-y-1">
                        {Array.from({ length: 8 }).map((_, i) => <EmployeeListItemSkeleton key={i} />)}
                    </div>
                ) : filteredEmployees.length > 0 ? (
                    <nav className="p-2 space-y-1">
                        {filteredEmployees.map(emp => (
                            <EmployeeListItem
                                key={emp.id}
                                employee={emp}
                                isSelected={emp.id === selectedId}
                                onSelect={() => {
                                    onSelect(emp);
                                    onDone?.();
                                }}
                            />
                        ))}
                    </nav>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                        <UsersIcon className="h-12 w-12 mb-3" />
                        <h3 className="font-semibold">No Employees Found</h3>
                        <p className="text-sm">Your search for "{search}" did not return any results.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- NEW: Placeholder component for empty/error/loading states ---
const ContentPlaceholder: React.FC<{
    state: "loading" | "error" | "empty";
    message?: string;
}> = ({ state, message }) => {
    const states = {
        loading: {
            icon: Loader2,
            title: "Loading Employees...",
            description: "Please wait while we fetch the employee data.",
            className: "animate-spin"
        },
        error: {
            icon: ServerCrash,
            title: "An Error Occurred",
            description: message || "We couldn't load the data. Please try again later.",
            className: ""
        },
        empty: {
            icon: UserPlus,
            title: "Select an Employee",
            description: "Choose an employee from the list to see their details.",
            className: ""
        },
    };

    const { icon: Icon, title, description, className } = states[state];

    return (
        <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center text-center text-muted-foreground max-w-sm">
                <div className="mb-4 rounded-full bg-muted p-3">
                     <Icon className={cn("h-8 w-8 text-muted-foreground/70", className)} />
                </div>
                <h2 className="text-xl font-semibold text-foreground">{title}</h2>
                <p className="mt-2 text-sm">{description}</p>
            </div>
        </div>
    );
};


// --- UPDATED: Dashboard Content Component ---
const DashboardContent: React.FC<{
    viewState: ViewState;
    errorMessage?: string;
    employee?: Employee;
    onActionComplete: () => void;
}> = ({ viewState, errorMessage, employee, onActionComplete }) => {

    if (viewState !== "data" || !employee) {
        return <ContentPlaceholder state={viewState === "data" ? "empty" : viewState} message={errorMessage} />;
    }

    return (
        <div className="space-y-6">
            {/* Main Content Header (Desktop) */}
            <div className="hidden lg:flex items-center gap-4">
                <EmployeeAvatar name={employee.name} className="h-16 w-16" />
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                       <h1 className="text-2xl font-bold truncate">{employee.name}</h1>
                       {employee.isAdmin && (
                            <span className="px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                                Admin
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground truncate">{employee.email}</p>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 lg:gap-8">
                {/* Left Column: Feedback Details */}
                <div className="lg:col-span-3 order-2 lg:order-1 mt-6 lg:mt-0">
                    <AdminEmployeeDetail employeeId={employee.id} />
                </div>

                {/* Right Column: Summary & Actions */}
                <div className="lg:col-span-2 order-1 lg:order-2">
                    <Card>
                        <CardContent className="p-0">
                            <Tabs defaultValue="summary">
                                <TabsList className="grid w-full grid-cols-2 rounded-b-none rounded-t-lg">
                                    <TabsTrigger value="summary">Summary</TabsTrigger>
                                    <TabsTrigger value="actions">Actions</TabsTrigger>
                                </TabsList>
                                <TabsContent value="summary" className="p-4">
                                    <AttendanceSummaryCard employeeId={employee.id} />
                                </TabsContent>
                                <TabsContent value="actions" className="p-4">
                                    <ActionsCard
                                        employee={employee}
                                        onActionCompletes={onActionComplete}
                                    />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// --- UPDATED: Mobile Header Component ---
const MobileHeader: React.FC<{
    employees: Employee[];
    selectedEmployee: Employee | null;
    loading: boolean;
    setSelectedEmployee: (emp: Employee) => void;
}> = ({ employees, selectedEmployee, loading, setSelectedEmployee }) => {
    const [sheetOpen, setSheetOpen] = useState(false);

    return (
        <header className="lg:hidden p-4 border-b bg-background flex items-center gap-4 sticky top-0 z-10">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Open employee menu">
                        <Menu className="h-5 w-5"/>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
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
            <div className="flex items-center gap-3 min-w-0">
                {selectedEmployee && <EmployeeAvatar name={selectedEmployee.name} />}
                <div className="min-w-0">
                    <h2 className="font-semibold truncate">
                        {selectedEmployee?.name || "Manage Employees"}
                    </h2>
                    {selectedEmployee && (
                        <p className="text-sm text-muted-foreground truncate">
                            {selectedEmployee.email}
                        </p>
                    )}
                </div>
            </div>
        </header>
    );
};

// --- Main dashboard component ---
const AdminEmployeeDashboard: React.FC = () => {
    const {
        employees,
        selectedEmployee,
        setSelectedEmployee,
        loading,
        error,
        refresh
    } = useEmployees();

    const viewState: ViewState = useMemo(() => {
        if (loading && employees.length === 0) return "loading";
        if (error) return "error";
        return selectedEmployee ? "data" : "empty";
    }, [error, loading, selectedEmployee, employees.length]);

    const contentKey = selectedEmployee ? selectedEmployee.id : viewState;

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar for large screens */}
            <aside className="hidden lg:block w-80 flex-shrink-0 border-r bg-background">
                <EmployeeList
                    employees={employees}
                    selectedId={selectedEmployee?.id ?? null}
                    loading={loading && employees.length === 0}
                    onSelect={setSelectedEmployee}
                />
            </aside>

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0">
                <MobileHeader
                    employees={employees}
                    selectedEmployee={selectedEmployee}
                    loading={loading}
                    setSelectedEmployee={setSelectedEmployee}
                />

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 no-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={contentKey}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="h-full"
                        >
                            <DashboardContent
                                viewState={viewState}
                                errorMessage={error || undefined}
                                employee={selectedEmployee || undefined}
                                onActionComplete={refresh}
                            />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default AdminEmployeeDashboard;