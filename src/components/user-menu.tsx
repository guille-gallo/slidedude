"use client";

import { useSession, signOut } from "next-auth/react";
import Image from "next/image";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <div className="flex items-center gap-2">
      {session.user.image && (
        <Image
          src={session.user.image}
          alt=""
          width={24}
          height={24}
          className="rounded-full"
          unoptimized
        />
      )}
      <span className="text-xs text-zinc-400">{session.user.email}</span>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="rounded px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
      >
        Sign out
      </button>
    </div>
  );
}
