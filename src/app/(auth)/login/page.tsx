
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function LoginPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
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

      // In a single-user model, we might not even need a user document,
      // but it can be useful for storing profile info. We check for the 'my-company-details'
      // document as an indicator of first-time setup for this single user.
      const companyDocRef = doc(firestore, `clients`, 'my-company-details');
      const companyDocSnap = await getDoc(companyDocRef);

      if (!companyDocSnap.exists()) {
        await setDoc(companyDocRef, {
            name: `${googleUser.displayName}'s Company`,
            address: 'Your Company Address',
            vat: 'Your VAT Number',
            iban: 'Your IBAN',
            vatRate: 0,
        });

        toast({
            title: "Account Initialized",
            description: "Welcome to ChronoPay! Please fill in your company details in Settings.",
        });

      } else {
        toast({
            title: "Login Successful",
            description: "Welcome back!",
        });
      }
      
      router.push('/dashboard');

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

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Use your Google account to sign in.</CardDescription>
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
