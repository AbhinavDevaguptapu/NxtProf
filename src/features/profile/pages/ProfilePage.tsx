import { useState, useEffect } from "react";
import { useUserAuth } from "@/context/UserAuthContext";
import { db, storage } from "@/integrations/firebase/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { ViewState } from "@/layout/AppShell";

interface ProfilePageProps {
    setActiveView: (view: ViewState) => void;
}

export default function ProfilePage({ setActiveView }: ProfilePageProps) {
    const { user, loading: userLoading } = useUserAuth();
    const { toast } = useToast();

    const [name, setName] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [feedbackSheetUrl, setFeedbackSheetUrl] = useState("");
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingPage, setIsLoadingPage] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchEmployeeData = async () => {
            setIsLoadingPage(true);
            const userDocRef = doc(db, "employees", user.uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.name || user.displayName || "");
                setEmployeeId(data.employeeId || "N/A");
                setFeedbackSheetUrl(data.feedbackSheetUrl || "");
                setImagePreviewUrl(user.photoURL || null);
            }
            setIsLoadingPage(false);
        };

        fetchEmployeeData();
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
                toast({ title: "Invalid Image", description: "Please select an image file smaller than 2MB.", variant: "destructive" });
                return;
            }
            setProfileImageFile(file);
            setImagePreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            let newPhotoURL = user.photoURL;

            if (profileImageFile) {
                const storageRef = ref(storage, `avatars/${user.uid}/${profileImageFile.name}`);
                const snapshot = await uploadBytes(storageRef, profileImageFile);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            }

            await updateProfile(user, { displayName: name, photoURL: newPhotoURL });

            const userDocRef = doc(db, "employees", user.uid);
            await updateDoc(userDocRef, { name, feedbackSheetUrl, photoURL: newPhotoURL });

            toast({ title: "Success", description: "Your profile has been updated." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingPage || userLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-2xl">Your Profile</CardTitle>
                    <CardDescription>Manage your personal and application-specific information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={imagePreviewUrl || undefined} />
                            <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="grid w-full items-center gap-1.5">
                            <Label htmlFor="picture">Profile Picture</Label>
                            <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} disabled={isSaving} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="employeeId">Employee ID</Label>
                        <Input id="employeeId" value={employeeId} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sheetUrl">Feedback Sheet URL</Label>
                        <Input id="sheetUrl" value={feedbackSheetUrl} onChange={(e) => setFeedbackSheetUrl(e.target.value)} disabled={isSaving} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSave} disabled={isSaving} className="ml-auto">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    );
}