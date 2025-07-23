import { useAdminAuth } from '@/context/AdminAuthContext';
import { useUserAuth } from '@/context/UserAuthContext';
import { ViewType, ViewState } from '@/layout/AppShell';
import {
    Home,
    ClipboardList,
    GraduationCap,
    MessageSquareQuote,
    User,
    Box,
    CalendarCheck,
    Users,
    FileText,
    LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const userNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'standups', label: 'Standups', icon: ClipboardList },
    { id: 'learning-hours', label: 'Learning Hours', icon: GraduationCap },
    { id: 'feedback', label: 'AI Feedback', icon: MessageSquareQuote },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'onboardingKit', label: 'Onboarding Kit', icon: Box },
];

const adminNavItems = [
    { id: 'home', label: 'Dashboard', icon: Home },
    { id: 'standups', label: 'Standups', icon: ClipboardList },
    { id: 'learning-hours', label: 'Learning Hours', icon: GraduationCap },
    { id: 'attendance', label: 'Manage Attendance', icon: CalendarCheck },
    { id: 'manage-employees', label: 'Manage Employees', icon: Users },
];

interface SidebarProps {
    activeView: ViewType;
    setActiveView: (view: ViewState) => void;
}

export const Sidebar = ({ activeView, setActiveView }: SidebarProps) => {
    const { admin } = useAdminAuth();
    const { user, logout } = useUserAuth();

    const navItems = admin ? adminNavItems : userNavItems;

    return (
        <aside className="hidden md:flex flex-col w-64 bg-gray-50 dark:bg-gray-900 h-screen px-4 py-8 border-r dark:border-gray-700 fixed">
            <div className="flex items-center px-2 mb-10">
                <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <h2 className="ml-3 text-2xl font-bold text-gray-800 dark:text-white">NxtProf</h2>
            </div>

            <div className="flex flex-col justify-between flex-1">
                <nav className="flex-1 space-y-2">
                    {navItems.map((item) => (
                        <Button
                            key={item.id}
                            variant={activeView === item.id ? 'secondary' : 'ghost'}
                            className="w-full justify-start text-base py-6"
                            onClick={() => setActiveView({ view: item.id as ViewType })}
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.label}
                        </Button>
                    ))}
                </nav>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start items-center gap-3 px-2 py-8">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                                <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start">
                                <span className="font-semibold text-sm">{user?.displayName || user?.email}</span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount side="top">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setActiveView({ view: 'profile' })}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
};