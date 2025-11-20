import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SubscriptionTimer } from "./SubscriptionTimer";

interface AuthLayoutProps {
  children: React.ReactNode;
  showTimer?: boolean;
}

export const AuthLayout = ({ children, showTimer = true }: AuthLayoutProps) => {
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    
    getUser();
  }, []);

  if (!showTimer) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {userId && (
        <div className="sticky top-0 z-50 bg-background border-b border-border px-4 py-2 flex justify-end">
          <SubscriptionTimer userId={userId} />
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};
