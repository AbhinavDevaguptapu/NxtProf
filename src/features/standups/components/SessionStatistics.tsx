import { motion, Variants } from "framer-motion";
import { StatCard } from "@/components/common/StatCard";
// IMPROVEMENT: Imported a more semantically correct icon for "Not Available"
import { Users, UserCheck, UserX, UserMinus, Slash } from "lucide-react";

// --- Animation Variants (No changes needed) ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
};

// --- REFACTORED: Centralized configuration for stats ---
// This makes the component data-driven, scalable, and easier to maintain.
const statDetails = [
  {
    key: "total",
    title: "Total Employees",
    icon: <Users className="text-blue-500" />,
    color: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800/50",
  },
  {
    key: "present",
    title: "Present",
    icon: <UserCheck className="text-green-500" />,
    color: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800/50",
  },
  {
    key: "absent",
    title: "Absent",
    icon: <UserMinus className="text-red-500" />,
    color: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800/50",
  },
  {
    key: "missed",
    title: "Missed",
    icon: <UserX className="text-yellow-500" />,
    color: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800/50",
  },
  {
    key: "notAvailable",
    title: "Not Available",
    // IMPROVEMENT: Using a more neutral icon for a neutral status.
    icon: <Slash className="text-gray-500" />,
    color: "bg-gray-50 dark:bg-gray-800/20",
    borderColor: "border-gray-200 dark:border-gray-700/50",
  }
];

export const SessionStatistics = ({ stats }: { stats: Record<string, number> }) => (
  // IMPROVEMENT: Using <ul> for semantic list structure.
  <motion.ul
    className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
  >
    {/* REFACTORED: Mapping over the config array to render stat cards dynamically. */}
    {statDetails.map((detail) => (
      // IMPROVEMENT: Using <li> for list items and applying motion props directly.
      <motion.li key={detail.key} variants={itemVariants}>
        <StatCard
          title={detail.title}
          // IMPROVEMENT: Gracefully handle cases where a stat might be missing.
          value={stats[detail.key] ?? 0}
          icon={detail.icon}
        />
      </motion.li>
    ))}
  </motion.ul>
);