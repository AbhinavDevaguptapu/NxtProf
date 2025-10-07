/**
 * EmployeeSetup component allows a user to complete their initial setup by providing their Employee ID
 * and an optional feedback sheet link. It validates the inputs, updates the user's document in Firestore, and
 * navigates to the home page upon successful submission.
 *
 * Features:
 * - Employee ID validation (must match the format NW followed by 7 digits).
 * - Feedback sheet link validation (must be a valid URL if provided).
 * - Animated UI using Framer Motion for smooth transitions.
 * - Displays error messages for invalid input or failed submission.
 * - Shows a loading spinner while saving data.
 *
 * Dependencies:
 * - React, React Router, Firebase Firestore, Framer Motion, Lucide React.
 * - Custom UI components: Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle.
 * - User authentication context via useUserAuth.
 *
 * @component
 * @returns {JSX.Element} The EmployeeSetup form UI.
 */
// src/pages/EmployeeSetup.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/integrations/firebase/client';
import { useUserAuth } from '@/context/UserAuthContext';
import { signOut } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { motion, Variants } from 'framer-motion';

const pageVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const cardVariants: Variants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: { scale: 1, opacity: 1, transition: { duration: 0.4 } },
};

const formVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } },
};

const fieldVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

export default function EmployeeSetup() {
    const functions = getFunctions();
    const { user } = useUserAuth();
    const navigate = useNavigate();

    const [employeeId, setEmployeeId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [exitLoading, setExitLoading] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [countdown, setCountdown] = useState(30);

    const isEmployeeIdValid = (id: string) => /^NW\d{7}$/.test(id);

    const isFormValid = isEmployeeIdValid(employeeId);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setIsInitializing(false);
        }
    }, [countdown]);

    const handleEmployeeIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmployeeId(e.target.value.toUpperCase());
    };

    const handleExit = async () => {
        if (!user) return;

        setExitLoading(true);
        setError(null);

        try {
            const deleteEmployee = httpsCallable(functions, 'deleteEmployee');
            await deleteEmployee({ uid: user.uid });
            await signOut(auth);
            navigate('/auth');
        } catch (err) {
            console.error(err);
            setError('Failed to delete account. Please try again.');
            setExitLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid || !user) {
            setError('Please ensure all fields are valid.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const employeesRef = collection(db, 'employees');

            // Check for duplicate employeeId
            const idQuery = query(employeesRef, where('employeeId', '==', employeeId));
            const idQuerySnapshot = await getDocs(idQuery);
            if (!idQuerySnapshot.empty) {
                setError('This Employee ID is already in use. Please refresh.');
                setLoading(false);
                return;
            }

            const ref = doc(db, 'employees', user.uid);
            const dataToUpdate = {
                employeeId,
                hasCompletedSetup: true,
            };

            await updateDoc(ref, dataToUpdate);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError('Failed to save details. Please try again.');
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="min-h-screen flex items-center justify-center bg-background p-4"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div
                variants={cardVariants}
                initial="hidden"
                animate="visible"
            >
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-2xl">Welcome, {user?.displayName || 'User'}!</CardTitle>
                        <CardDescription>
                            Please provide your Employee ID to continue.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <motion.form
                            onSubmit={handleSubmit}
                            className="space-y-4"
                            variants={formVariants}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.div variants={fieldVariants} className="space-y-2">
                                <label htmlFor="employeeId" className="text-sm font-medium">Employee ID</label>
                                <Input
                                    id="employeeId"
                                    placeholder="e.g., NW1234567"
                                    value={employeeId}
                                    onChange={handleEmployeeIdChange}
                                    maxLength={9}
                                    required
                                />
                                {!isEmployeeIdValid(employeeId) && employeeId.length > 0 && (
                                    <p className="text-xs text-destructive">
                                        Must be in the format NW followed by 7 numbers.
                                    </p>
                                )}
                            </motion.div>


                            {error && (
                                <motion.p
                                    variants={fieldVariants}
                                    className="text-sm text-destructive"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <motion.div variants={fieldVariants}>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={!isFormValid || loading || exitLoading}
                                        style={{
                                            background: 'black',
                                            color: 'white',
                                            boxShadow: 'none',
                                        }}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {loading ? 'Saving...' : 'Get Started'}
                                    </Button>
                                </motion.div>
                            </motion.div>
                            <motion.div variants={fieldVariants}>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    className="w-full mt-2"
                                    onClick={handleExit}
                                    disabled={loading || exitLoading || isInitializing}
                                >
                                    {exitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {exitLoading
                                        ? 'Exiting...'
                                        : isInitializing
                                        ? `Exit and Delete Account (${countdown}s)`
                                        : 'Exit and Delete Account'}
                                </Button>
                            </motion.div>
                        </motion.form>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
