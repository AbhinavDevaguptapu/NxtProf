// src/components/AppNavbar.tsx

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/integrations/firebase/client";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Context & Hooks
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useUserAuth } from "@/context/UserAuthContext";

// Icons
import {
  Home,
  LayoutDashboard,
  LogOut,
  Search,
  MessageSquareQuote,
  Users,
  GraduationCap,
  Box,
  CalendarCheck,
  User as UserIcon,
  
} from "lucide-react";

// The commands list remains unchanged
const navCommands = [
  { path: "/admin/employees", label: "Manage Employee", icon: <Users className="mr-2 h-4 w-4" /> },
  { path: "/feedback", label: "AI Feedback", icon: <MessageSquareQuote className="mr-2 h-4 w-4" /> },
  { path: "/standups", label: "Standups", icon: <Users className="mr-2 h-4 w-4" /> },
  { path: "/learning-hours", label: "Learning Hours", icon: <GraduationCap className="mr-2 h-4 w-4" /> },
  { path: "/onboardingKit", label: "Onboarding Kit", icon: <Box className="mr-2 h-4 w-4" /> },
  { path: "/attendance", label: "Attendance", icon: <CalendarCheck className="mr-2 h-4 w-4" /> },
];

export default function AppNavbar() {
  const navigate = useNavigate();

  // State for the search
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { user, loading } = useUserAuth();
  const { admin, isAdmin } = useAdminAuth();

  const isLoggedIn = !!user || !!admin;
  const displayName = user?.displayName || admin?.email || "User";
  const displayAvatar = user?.photoURL || undefined;

  // Filter commands based on the search query
  const filteredCommands = useMemo(() => {
    let commandsToFilter = navCommands;

    // If admin, remove AI Feedback
    if (isAdmin) {
      commandsToFilter = commandsToFilter.filter(command => command.path !== "/feedback");
    }

    if (!searchQuery) return commandsToFilter;

    return commandsToFilter.filter(command =>
      command.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, navCommands, isAdmin]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error("Failed to log out:", error);
    }
  };

  const runCommand = (path: string) => {
    setIsSearchOpen(false); // Close the popover
    setSearchQuery("");     // Clear the search bar
    navigate(path);
  };

  // When the popover closes, clear the search query
  const handleOpenChange = (open: boolean) => {
    setIsSearchOpen(open);
    if (!open) {
      setSearchQuery("");
    }
  };

  return (
    <header className="w-full bg-background border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">

          <div className="flex items-center gap-2 md:gap-4">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <LayoutDashboard className="h-6 w-6" />
              <span className="hidden sm:inline">NxtProf</span>
            </Link>
          </div>


          {/* Center section: The YouTube-style Search */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-3 w-full max-w-lg px-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/">
                      <Home className="h-5 w-5" />
                      <span className="sr-only">Home</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Home</p>
                </TooltipContent>
              </Tooltip>

              <Popover open={isSearchOpen} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                  <div
                    className="relative flex-1 cursor-text"
                    onClick={() =>
                      document.getElementById("navbar-search-input")?.focus()
                    }
                  >
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="navbar-search-input"
                      type="text"
                      placeholder="Search features..."
                      className="pl-9 w-full"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] mt-1 p-0"
                  align="start"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col space-y-1 p-1">
                    {filteredCommands.length > 0 ? (
                      filteredCommands.map((command) => (
                        <Button
                          key={command.path}
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => runCommand(command.path)}
                        >
                          {command.icon}
                          <span>{command.label}</span>
                        </Button>
                      ))
                    ) : (
                      <p className="p-4 text-sm text-center text-muted-foreground">
                        No results found.
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Right section: Profile Dropdown */}
          <div className="flex items-center gap-2">
            {!loading && isLoggedIn && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full p-1 hover:bg-muted/50 transition-colors">
                      {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <span className="w-9 h-9 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold">
                          {displayName?.slice(0, 1).toUpperCase() ?? "U"}
                        </span>
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem disabled><div className="font-medium">{displayName}</div></DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate(isAdmin ? '/admin/profile' : '/profile')}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
