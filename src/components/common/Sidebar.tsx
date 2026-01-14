"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { useUserAuth } from "@/context/UserAuthContext";
import type { ViewType, ViewState } from "@/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
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
  UsersRound,
  BookCheck,
  Archive,
  ChevronLeft,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

// --- Data Definitions ---
const userNavItems = [
  { id: "home", label: "Home", icon: Home },
  { id: "standups", label: "Standups", icon: ClipboardList },
  { id: "learning-hours", label: "Learning Hours", icon: GraduationCap },
  { id: "feedback", label: "Students Feedback", icon: MessageSquareQuote },
  { id: "daily-observations", label: "Daily Observations", icon: BookCheck },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "peer-feedback", label: "Peer Feedback", icon: UsersRound },
  { id: "onboardingKit", label: "Onboarding Kit", icon: Box },
];

const adminNavItems = [
  { id: "home", label: "Dashboard", icon: Home },
  { id: "standups", label: "Standups", icon: ClipboardList },
  { id: "learning-hours", label: "Learning Hours", icon: GraduationCap },
  { id: "admin-peer-feedback", label: "Peer Feedback", icon: UsersRound },
  { id: "daily-observations", label: "Daily Observations", icon: BookCheck },
  { id: "manage-employees", label: "Manage Employees", icon: Users },
  { id: "user-approval", label: "User Approval", icon: UserCheck },
  { id: "archived-employees", label: "Archived Employees", icon: Archive },
  { id: "attendance", label: "Manage Attendance", icon: CalendarCheck },
  { id: "onboardingKit", label: "Onboarding Kit", icon: Box },
];

// --- Prop Interfaces ---
interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

interface SidebarContentProps extends SidebarProps {
  onItemClick?: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

// --- Reusable Sub-Components ---

const Logo = ({ onClick }: { onClick: () => void }) => (
  <div
    className="flex items-center gap-3 cursor-pointer group"
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => e.key === "Enter" && onClick()}
  >
    <div className="flex-shrink-0 bg-primary/10 p-2.5 rounded-xl transition-colors group-hover:bg-primary/15">
      <FileText className="h-6 w-6 text-primary" />
    </div>
    <div className="flex flex-col">
      <h1 className="text-lg font-bold text-foreground tracking-tight">
        NxtProf
      </h1>
      <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">
        Team Management
      </span>
    </div>
  </div>
);

const NavItem = ({
  item,
  isActive,
  onClick,
}: {
  item: { id: string; label: string; icon: LucideIcon };
  isActive: boolean;
  onClick: () => void;
}) => (
  <motion.div
    whileHover={{ x: 2 }}
    transition={{ duration: 0.15, ease: "easeOut" }}
  >
    <Button
      variant="ghost"
      className={`w-full justify-start text-sm font-medium h-10 px-3 rounded-lg transition-all duration-200 ${
        isActive
          ? "bg-primary/5 border-l-2 border-primary text-foreground font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l-2 border-transparent"
      }`}
      onClick={onClick}
    >
      <item.icon
        className={`mr-3 h-[18px] w-[18px] flex-shrink-0 transition-colors ${
          isActive ? "text-primary" : ""
        }`}
      />
      <span className="truncate">{item.label}</span>
      {isActive && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </Button>
  </motion.div>
);

const UserProfile = ({
  onProfileClick,
  onLogout,
}: {
  onProfileClick: () => void;
  onLogout: () => void;
}) => {
  const { user, isAdmin, isCoAdmin } = useUserAuth();

  const getRoleBadge = () => {
    if (isAdmin)
      return { label: "Admin", className: "bg-primary/10 text-primary" };
    if (isCoAdmin)
      return { label: "Co-Admin", className: "bg-muted text-muted-foreground" };
    return { label: "Member", className: "bg-muted text-muted-foreground" };
  };

  const role = getRoleBadge();

  return (
    <div className="px-3 py-4 mt-auto border-t border-border">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start p-2 h-auto rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 w-full">
              <Avatar className="h-10 w-10 border-2 border-border">
                <AvatarImage
                  src={user?.photoURL || undefined}
                  alt={user?.displayName || "User"}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user?.displayName?.charAt(0) ?? user?.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start min-w-0 flex-1 text-left">
                <span className="font-semibold text-sm text-foreground truncate max-w-[140px]">
                  {user?.displayName || "User"}
                </span>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md mt-0.5 ${role.className}`}
                >
                  {role.label}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" side="top" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1.5">
              <p className="text-sm font-semibold leading-none">
                {user?.displayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onProfileClick} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onLogout}
            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

// --- Main Components ---

const SidebarContent = ({
  activeView,
  setActiveView,
  onItemClick,
}: SidebarContentProps) => {
  const { admin } = useAdminAuth();
  const { isCoAdmin, logout } = useUserAuth();

  const [learningHoursOpen, setLearningHoursOpen] = useState(false);

  let navItems = userNavItems;
  let isAdminOrCoAdmin = false;
  if (admin || isCoAdmin) {
    navItems = adminNavItems
      .filter((item) => {
        if (item.id === "add-learning-points" && !isCoAdmin) {
          return false; // Hide for admins
        }
        if (
          (item.id === "manage-employees" ||
            item.id === "archived-employees") &&
          isCoAdmin &&
          !admin
        ) {
          return false; // Hide for co-admins (but show for admins)
        }
        if (item.id === "user-approval" && isCoAdmin && !admin) {
          return false; // Hide user approval for co-admins
        }
        return true;
      })
      .map((item) => {
        // For co-admin, change admin-peer-feedback to peer-feedback
        if (item.id === "admin-peer-feedback" && isCoAdmin && !admin) {
          return { ...item, id: "peer-feedback" };
        }
        return item;
      });
    // Add Students Feedback above Peer Feedback for co-admin
    if (isCoAdmin && !admin) {
      const peerFeedbackIndex = navItems.findIndex(
        (item) => item.id === "peer-feedback"
      );
      if (peerFeedbackIndex !== -1) {
        navItems.splice(peerFeedbackIndex, 0, {
          id: "feedback",
          label: "Students Feedback",
          icon: MessageSquareQuote,
        });
      } else {
        navItems.push({
          id: "feedback",
          label: "Students Feedback",
          icon: MessageSquareQuote,
        });
      }
    }
    isAdminOrCoAdmin = true;
  }

  const isUser = !isAdminOrCoAdmin;

  const learningHoursSubItems = [
    { id: "learning-hours", label: "Manage Sessions", icon: GraduationCap },
    ...(admin || isCoAdmin
      ? [
          {
            id: "add-learning-points",
            label: "Add Learning Points",
            icon: GraduationCap,
          },
        ]
      : []),
    {
      id: "learning-hours-points",
      label: "Employees Learning Points",
      icon: GraduationCap,
    },
  ];

  const userLearningHoursSubItems = [
    { id: "learning-hours", label: "Add Learning Points", icon: GraduationCap },
    {
      id: "learning-hours-points",
      label: "Employees Learning Points",
      icon: GraduationCap,
    },
  ];

  const handleNavClick = (view: ViewType) => {
    setActiveView({ view });
    onItemClick?.();
  };

  const handleProfileClick = () => {
    setActiveView({ view: "profile" });
    onItemClick?.();
  };

  const handleLogout = () => {
    logout();
    onItemClick?.();
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      <div className="px-4 py-5">
        <Logo onClick={() => handleNavClick("home")} />
      </div>

      <nav className="sidebar-nav flex-1 px-3 space-y-1 overflow-y-auto styled-scrollbar py-2">
        {navItems.map((item) => {
          if (item.id === "learning-hours" && (isAdminOrCoAdmin || isUser)) {
            const subItems = isAdminOrCoAdmin
              ? learningHoursSubItems
              : userLearningHoursSubItems;
            return (
              <Collapsible
                key={item.id}
                open={learningHoursOpen}
                onOpenChange={setLearningHoursOpen}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm font-medium h-10 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l-2 border-transparent transition-all duration-200"
                  >
                    <item.icon className="mr-3 h-[18px] w-[18px] flex-shrink-0" />
                    <span className="truncate">{item.label}</span>
                    <ChevronRight
                      className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                        learningHoursOpen ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 pl-6">
                  <motion.div
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="space-y-1"
                  >
                    {subItems.map((subItem) => (
                      <NavItem
                        key={subItem.id}
                        item={subItem}
                        isActive={activeView === subItem.id}
                        onClick={() => handleNavClick(subItem.id as ViewType)}
                      />
                    ))}
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            );
          }
          return (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeView === item.id}
              onClick={() => handleNavClick(item.id as ViewType)}
            />
          );
        })}
      </nav>

      <UserProfile
        onProfileClick={handleProfileClick}
        onLogout={handleLogout}
      />
    </div>
  );
};

export const Sidebar = ({
  activeView,
  setActiveView,
  isOpen,
  setIsOpen,
}: SidebarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

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
            <SheetContent
              side="left"
              className="p-0 w-[280px] bg-white dark:bg-gray-950"
            >
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
                isOpen={isOpen}
                setIsOpen={setIsOpen}
              />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="hidden lg:block">
        <aside
          className={`flex flex-col w-72 h-screen fixed left-0 top-0 z-20 transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarContent
            activeView={activeView}
            setActiveView={setActiveView}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />
        </aside>
        <button
          onClick={toggleSidebar}
          className="fixed top-1/2 z-30 bg-primary text-primary-foreground rounded-full p-1.5 shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-300 ease-in-out"
          style={{
            left: isOpen ? "calc(18rem - 12px)" : "12px",
            transform: "translateY(-50%)",
          }}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <ChevronLeft className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>
      </div>
    </>
  );
};
