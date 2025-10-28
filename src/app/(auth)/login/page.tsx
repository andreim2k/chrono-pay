
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, useUser, setDocumentNonBlocking } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // This effect should only run on the client after hydration
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) {
        toast({
            variant: 'destructive',
            title: "Error",
            description: "Firebase is not initialized correctly.",
        });
        return;
    }
    
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      const userDocRef = doc(firestore, `users/${googleUser.uid}`);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        const userData = {
            id: googleUser.uid,
            name: googleUser.displayName,
            email: googleUser.email,
            avatarUrl: googleUser.photoURL,
            role: "Admin",
            // Add default company details
            companyName: `${googleUser.displayName}'s Company`,
            companyAddress: 'Your Company Address',
            companyVat: 'Your VAT Number',
            companyIban: 'Your IBAN',
            companyVatRate: 0.19, // Default to 19%
            companyBankName: 'Your Bank Name',
            companySwift: 'Your SWIFT/BIC'
        };
        setDocumentNonBlocking(userDocRef, userData, { merge: true });
        
        toast({
            title: "Account Initialized",
            description: "Welcome to ChronoSapient WorkPay! Please fill in your company details in Settings.",
        });
      } else {
        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
      }
      
      // The useEffect will handle the redirect
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: "Sign-in Failed",
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
        setIsSigningIn(false);
    }
  };

  // While loading auth state or if user is already logged in, show a loader.
  // The useEffect will handle the redirect.
  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Only render the login form if not loading and no user is present
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign In to ChronoSapient WorkPay</CardTitle>
        <CardDescription>Welcome! ChronoSapient WorkPay is your streamlined solution for invoicing. Sign in to manage your clients, projects, and billing with ease.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
            className="w-full" 
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
        >
          {isSigningIn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
            <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                <path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 111.3 512 0 398.5 0 256S111.3 0 244 0c69.9 0 131.9 28.9 176.4 75.4l-74.4 64.5C320.3 111.9 284.4 96 244 96c-82.6 0-149.2 66.8-149.2 149.2s66.6 149.2 149.2 149.2c87.3 0 134.9-59.3 140.2-92.4h-140.2v-70.3h237.9c1.2 6.5 1.8 13.3 1.8 20.5z"></path>
            </svg>
          }
          Sign in with Google
        </Button>
      </CardContent>
    </Card>
  );
}
