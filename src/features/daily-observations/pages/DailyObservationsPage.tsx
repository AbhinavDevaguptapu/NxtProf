import { useState, useMemo } from 'react';
import { useGetObservations } from '../hooks/useObservations';
import { ObservationFormModal } from '../components/ObservationFormModal';
import { ObservationCard } from '../components/ObservationCard';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Calendar as CalendarIcon, Info, Loader2, FileText, Search } from 'lucide-react';
import { format } from 'date-fns';
import { useUserAuth } from '@/context/UserAuthContext';
import { DialogTrigger } from '@/components/ui/dialog';

const DailyObservationsPage = () => {
    const [date, setDate] = useState<Date>(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { user } = useUserAuth();
    const { data: observations, isLoading, error } = useGetObservations(date);

    const filteredAndSortedObservations = useMemo(() => {
        if (!observations || !user) {
            return [];
        }
        const filtered = observations.filter(obs =>
            obs.observationText.toLowerCase().includes(searchQuery.toLowerCase()) ||
            obs.authorName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filtered.sort((a, b) => {
            if (a.userId === user.uid && b.userId !== user.uid) return -1;
            if (a.userId !== user.uid && b.userId === user.uid) return 1;
            return b.createdAt._seconds - a.createdAt._seconds;
        });
    }, [observations, user, searchQuery]);

    const isToday = date.toDateString() === new Date().toDateString();

    const InfoMessage = () => {
        if (!isToday) {
            return (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Viewing Past Observations</AlertTitle>
                    <AlertDescription>
                        You can only add or edit observations for the current day.
                    </AlertDescription>
                </Alert>
            );
        }
        return null;
    };

    return (
        <div className="container mx-auto p-4">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold">Daily Observations</h1>
                    <p className="text-sm sm:text-base text-muted-foreground">Share and review daily insights.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    {isToday && (
                        <ObservationFormModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full sm:w-auto">Add Observation</Button>
                            </DialogTrigger>
                        </ObservationFormModal>
                    )}
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={(d) => {
                                    if (d) setDate(d);
                                    setIsCalendarOpen(false);
                                }}
                                disabled={(d) => d > new Date() || d < new Date("2000-01-01")}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </header>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder="Search by author or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full"
                    />
                </div>
            </div>

            <div className="mb-6">
                <InfoMessage />
            </div>

            <div className="space-y-4">
                {isLoading && (
                    <div className="w-full flex flex-col justify-center items-center p-10 space-y-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">Loading observations...</p>
                    </div>
                )}
                {error && (
                    <Alert variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Error Loading Observations</AlertTitle>
                        <AlertDescription>{error.message || "Could not fetch observations."}</AlertDescription>
                    </Alert>
                )}
                {!isLoading && !error && filteredAndSortedObservations.length > 0 ? (
                    filteredAndSortedObservations.map(obs => <ObservationCard key={obs.id} observation={obs} />)
                ) : (
                    !isLoading && !error && (
                        <div className="text-center p-10 border-2 border-dashed rounded-lg bg-muted/50">
                            <div className="flex justify-center mb-4">
                                <FileText className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">
                                {searchQuery ? 'No Matching Observations' : 'No Observations Yet'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {searchQuery
                                    ? "Try a different search term."
                                    : isToday
                                    ? "Be the first to share an observation for today!"
                                    : "No observations were recorded on this day."}
                            </p>
                            {isToday && !searchQuery && (
                                <Button onClick={() => setIsAddModalOpen(true)}>Add Observation</Button>
                            )}
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default DailyObservationsPage;