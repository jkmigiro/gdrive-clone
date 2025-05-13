'use client';

import { signOut, useSession } from 'next-auth/react';

export default function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="bg-blue-500 p-4 text-white">
            <div className="container mx-auto flex justify-between items-center">
                <h1 className="text-xl font-bold">Google Drive Clone</h1>
                {session && (
                    <button onClick={() => signOut()} className="p-2 bg-red-500 rounded">
                        Sign Out
                    </button>
                )}
            </div>
        </nav>
    );
}