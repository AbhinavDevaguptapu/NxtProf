import { motion } from "framer-motion";
import { Users, UserCheck, UserMinus, UserX, UserRoundPlus } from "lucide-react";
import { StatCard } from "@/components/common/StatCard";

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
};

type SessionStatisticsProps = {
    stats: Record<string, number>;
};

export const SessionStatistics = ({ stats }: SessionStatisticsProps) => (
    <motion.div
        className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        <motion.div variants={itemVariants}><StatCard title="Total Employees" value={stats.total} icon={<Users />} /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Present" value={stats.present} icon={<UserCheck />} /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Absent" value={stats.absent} icon={<UserMinus />} /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Missed" value={stats.missed} icon={<UserX />} /></motion.div>
        <motion.div variants={itemVariants}><StatCard title="Not Available" value={stats.notAvailable} icon={<UserRoundPlus />} /></motion.div>
    </motion.div>
);
