"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-2 ml-1">
      {session.user.image && (
        <Image
          src={session.user.image}
          alt={`${session.user.name || "User"} avatar`}
          width={22}
          height={22}
          className="rounded-full ring-1 ring-white/[0.06]"
          loading="eager"
        />
      )}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded-md px-2 py-1 text-xs text-zinc-600 transition-all hover:bg-white/[0.04] hover:text-zinc-400"
      >
        Sign out
      </button>
    </div>
  );
}
