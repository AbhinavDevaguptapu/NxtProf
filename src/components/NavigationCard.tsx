// src/components/NavigationCard.tsx

import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NavigationCardProps {
    to: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    className?: string;
}

export function NavigationCard({ to, icon, title, description, className }: NavigationCardProps) {
    const cardVariants = {
        hover: {
            y: -5,
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        }
    };

    return (
        <motion.div whileHover="hover" variants={cardVariants} className="h-full">
            <Link to={to} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg block h-full">
                <Card className={cn(
                    "h-full transition-colors duration-200 ease-in-out bg-card hover:bg-accent",
                    className
                )}>
                    <CardHeader className="p-4 sm:p-6">
                        <div className="mb-3 text-primary">
                            {icon}
                        </div>
                        <CardTitle className="text-lg">{title}</CardTitle>
                        <CardDescription className="text-sm">{description}</CardDescription>
                    </CardHeader>
                </Card>
            </Link>
        </motion.div>
    );
}