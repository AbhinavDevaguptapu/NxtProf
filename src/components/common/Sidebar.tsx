"use client"

import { useAdminAuth } from "@/context/AdminAuthContext"
import { useUserAuth } from "@/context/UserAuthContext"
import type { ViewType, ViewState } from "@/layout/AppShell"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetTrigger,
} from "@/components/ui/sheet"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
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
    Menu,
    ChevronRight,
    LucideIcon,
    Bot,
    UsersRound
} from "lucide-react"
import { useState } from "react"
import { motion } from "framer-motion"

// --- Data Definitions ---
const userNavItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "standups", label: "Standups", icon: ClipboardList },
    { id: "learning-hours", label: "Learning Hours", icon: GraduationCap },
    { id: "admin-learning-hours", label: "Today's Learning Points", icon: GraduationCap },
    { id: "task-analyzer", label: "AI LH-Points Analysis", icon: Bot },
    { id: "feedback", label: "AI Feedback", icon: MessageSquareQuote },
    { id: "peer-feedback", label: "Peer Feedback", icon: UsersRound },
    { id: "attendance", label: "Attendance", icon: CalendarCheck },
    { id: "onboardingKit", label: "Onboarding Kit", icon: Box },
]

const adminNavItems = [
    { id: "home", label: "Dashboard", icon: Home },
    { id: "standups", label: "Standups", icon: ClipboardList },
    { id: "learning-hours", label: "Learning Hours", icon: GraduationCap },
    { id: "admin-learning-hours", label: "Today's Learning Points", icon: GraduationCap },
    { id: "task-analyzer", label: "AI LH-Points Analysis", icon: Bot },
    { id: "admin-peer-feedback", label: "Peer Feedback", icon: UsersRound },
    { id: "manage-employees", label: "Manage Employees", icon: Users },
    { id: "attendance", label: "Manage Attendance", icon: CalendarCheck },
]

// --- Prop Interfaces ---
interface SidebarProps {
    activeView: ViewType
    setActiveView: (view: ViewState) => void
}

interface SidebarContentProps extends SidebarProps {
    onItemClick?: () => void
}

// --- Reusable Sub-Components ---

const Logo = ({ onClick }: { onClick: () => void }) => (
    <div className="flex items-center space-x-3 cursor-pointer" onClick={onClick}>
        <div className="flex-shrink-0 bg-primary/10 p-2 rounded-lg">
            <FileText className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            NxtProf
        </h1>
    </div>
)

const NavItem = ({
    item,
    isActive,
    onClick,
}: {
    item: { id: string; label: string; icon: LucideIcon }
    isActive: boolean
    onClick: () => void
}) => (
    <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
        <Button
            variant={isActive ? "secondary" : "ghost"}
            className="w-full justify-start text-sm font-medium h-11 px-3 rounded-lg"
            onClick={onClick}
        >
            <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
            <span className="truncate">{item.label}</span>
            {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
        </Button>
    </motion.div>
)

const UserProfile = ({ onProfileClick, onLogout }: { onProfileClick: () => void, onLogout: () => void }) => {
    const { user } = useUserAuth()
    const { admin } = useAdminAuth()

    return (
        <div className="px-4 pt-4 mt-auto border-t border-gray-200 dark:border-gray-800">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-start p-2 h-auto rounded-lg"
                    >
                        <div className="flex items-center space-x-3 min-w-0">
                            <Avatar className="h-9 w-9 border">
                                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} />
                                <AvatarFallback>
                                    {user?.displayName?.charAt(0) ?? user?.email?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start min-w-0 flex-1 text-left">
                                <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                    {user?.displayName || "User"}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {admin ? "Administrator" : "Team Member"}
                                </span>
                            </div>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" side="top" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-semibold leading-none">{user?.displayName}</p>
                            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-600 focus:text-red-600 dark:focus:text-red-500">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

// --- Main Components ---

const SidebarContent = ({ activeView, setActiveView, onItemClick }: SidebarContentProps) => {
    const { admin } = useAdminAuth()
    const { logout } = useUserAuth()
    const navItems = admin ? adminNavItems : userNavItems

    const handleNavClick = (view: ViewType) => {
        setActiveView({ view })
        onItemClick?.()
    }

    const handleProfileClick = () => {
        setActiveView({ view: "profile" })
        onItemClick?.()
    }

    const handleLogout = () => {
        logout()
        onItemClick?.()
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
            <div className="px-4 py-5">
                <Logo onClick={() => handleNavClick('home')} />
            </div>

            <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
                {navItems.map((item) => (
                    <NavItem
                        key={item.id}
                        item={item}
                        isActive={activeView === item.id}
                        onClick={() => handleNavClick(item.id as ViewType)}
                    />
                ))}
            </nav>

            <UserProfile onProfileClick={handleProfileClick} onLogout={handleLogout} />
        </div>
    )
}

export const Sidebar = ({ activeView, setActiveView }: SidebarProps) => {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <>
            <header className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between h-16 px-4">
                    <Logo onClick={() => setActiveView({ view: "home" })} />
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Open Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-[280px] bg-white dark:bg-gray-950">
                            <SheetHeader>
                                <VisuallyHidden>
                                    <SheetTitle>Main Menu</SheetTitle>
                                    <SheetDescription>
                                        Navigate through the application sections.
                                    </SheetDescription>
                                </VisuallyHidden>
                            </SheetHeader>
                            <SidebarContent
                                activeView={activeView}
                                setActiveView={setActiveView}
                                onItemClick={() => setMobileOpen(false)}
                            />
                        </SheetContent>
                    </Sheet>
                </div>
            </header>

            <aside className="hidden lg:flex flex-col w-72 h-screen fixed left-0 top-0 z-10">
                <SidebarContent activeView={activeView} setActiveView={setActiveView} />
            </aside>
        </>
    )
}