import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function useFollow(targetUserId: string | null | undefined) {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!targetUserId) return;
    (async () => {
      const { count: c } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followed_id", targetUserId);
      setCount(c ?? 0);
      if (user) {
        const { data } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("followed_id", targetUserId)
          .maybeSingle();
        setIsFollowing(!!data);
      }
    })();
  }, [targetUserId, user]);

  const toggle = async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    setLoading(true);
    if (isFollowing) {
      const { error } = await supabase.from("follows").delete()
        .eq("follower_id", user.id).eq("followed_id", targetUserId);
      if (!error) { setIsFollowing(false); setCount((c) => Math.max(0, c - 1)); }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: user.id, followed_id: targetUserId,
      });
      if (!error) { setIsFollowing(true); setCount((c) => c + 1); }
    }
    setLoading(false);
  };

  return { isFollowing, count, loading, toggle, canFollow: !!user && user.id !== targetUserId };
}
