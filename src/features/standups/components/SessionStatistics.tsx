import { motion, Variants } from "framer-motion";
import { StatCard } from "@/components/common/StatCard";
import { Users, UserCheck, UserX, UserMinus, Slash } from "lucide-react";

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

// --- Configuration ---
const statDetails = [
  {
    key: "total",
    title: "Total Team",
    icon: <Users className="h-5 w-5 text-primary" />,
    iconBg: "bg-primary/10",
    className: "border-border/50",
  },
  {
    key: "present",
    title: "Present",
    icon: <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />,
    iconBg: "bg-green-100/50 dark:bg-green-900/20",
    className: "border-green-200 dark:border-green-800/50",
  },
  {
    key: "absent",
    title: "Absent",
    icon: <UserMinus className="h-5 w-5 text-red-600 dark:text-red-400" />,
    iconBg: "bg-red-100/50 dark:bg-red-900/20",
    className: "border-red-200 dark:border-red-800/50",
  },
  {
    key: "missed",
    title: "Missed",
    icon: <UserX className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    iconBg: "bg-amber-100/50 dark:bg-amber-900/20",
    className: "border-amber-200 dark:border-amber-800/50",
  },
  {
    key: "notAvailable",
    title: "Not Available",
    icon: <Slash className="h-5 w-5 text-muted-foreground" />,
    iconBg: "bg-muted",
    className: "border-border",
  },
];

export const SessionStatistics = ({
  stats,
}: {
  stats: Record<string, number>;
}) => (
  <motion.div
    className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
    variants={containerVariants}
    initial="hidden"
    animate="visible"
  >
    {statDetails.map((detail) => (
      <motion.div
        key={detail.key}
        variants={itemVariants}
        className="col-span-1"
      >
        <StatCard
          title={detail.title}
          value={stats[detail.key] ?? 0}
          icon={detail.icon}
          className={detail.className}
          iconClassName={detail.iconBg}
        />
      </motion.div>
    ))}
  </motion.div>
);
