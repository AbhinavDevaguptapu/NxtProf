import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useMemo } from 'react';

type LearningPoint = {
    point_type: 'R1' | 'R2' | 'R3';
};

interface LearningPointsChartProps {
    learningPoints: LearningPoint[];
}

const COLORS = {
    R1: '#0088FE', // Blue
    R2: '#00C49F', // Green
    R3: '#FFBB28', // Yellow
};

const LearningPointsChart = ({ learningPoints }: LearningPointsChartProps) => {
    const chartData = useMemo(() => {
        const counts = learningPoints.reduce((acc, point) => {
            acc[point.point_type] = (acc[point.point_type] || 0) + 1;
            return acc;
        }, {} as Record<'R1' | 'R2' | 'R3', number>);

        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [learningPoints]);

    if (learningPoints.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Learning Points Distribution</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-64">
                    <p className="text-muted-foreground">No learning points submitted this month.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Learning Points Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default LearningPointsChart;