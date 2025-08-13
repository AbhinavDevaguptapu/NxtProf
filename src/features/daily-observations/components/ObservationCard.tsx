"use client"

import { useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import type { Observation } from "../types"
import { useUserAuth } from "@/context/UserAuthContext"
import { useDeleteObservation } from "../hooks/useObservations"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Edit, Trash2 } from "lucide-react"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ObservationFormModal } from "./ObservationFormModal"

interface ObservationCardProps {
    observation: Observation
}

export const ObservationCard = ({ observation }: ObservationCardProps) => {
    const { user } = useUserAuth()
    const deleteMutation = useDeleteObservation()
    const [isEditing, setIsEditing] = useState(false)

    const isAuthor = user?.uid === observation.userId

    const handleDelete = () => {
        deleteMutation.mutate({ id: observation.id })
    }

    const observationCreatedAt = new Date(observation.createdAt._seconds * 1000)
    const observationDate = new Date(observation.observationDate._seconds * 1000)
    const today = new Date()
    observationDate.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)
    const isToday = observationDate.getTime() === today.getTime()

    const timeAgo = formatDistanceToNow(observationCreatedAt, { addSuffix: true })
    const fullDate = format(observationCreatedAt, "PPpp")

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-start gap-4">
                    <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${observation.authorName}&backgroundColor=d1d5db`} alt={observation.authorName} />
                        <AvatarFallback>{observation.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-semibold truncate">{observation.authorName || 'Unknown User'}</p>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className="text-sm text-muted-foreground cursor-help">{timeAgo}</p>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{fullDate}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pt-0">
                    <p className="whitespace-pre-wrap break-words">{observation.observationText}</p>
                </CardContent>
                {isAuthor && isToday && (
                    <CardFooter className="flex justify-end space-x-2 px-4 sm:px-6">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline" size="icon" onClick={() => setIsEditing(true)} className="flex-shrink-0">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Edit Observation</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <AlertDialog>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="icon" disabled={deleteMutation.isPending} className="flex-shrink-0">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Delete Observation</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent className="mx-4 max-w-md">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete your observation.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDelete}
                                        disabled={deleteMutation.isPending}
                                        className="w-full sm:w-auto"
                                    >
                                        {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                )}
            </Card>
            {isAuthor && <ObservationFormModal observation={observation} open={isEditing} onOpenChange={setIsEditing} />}
        </>
    )
}
