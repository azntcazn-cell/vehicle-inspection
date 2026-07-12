"use client";

import { useState } from "react";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";

const baseLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/history", label: "History" },
];
const adminLinks = [
  { href: "/vehicles", label: "Vehicles" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/checklist", label: "Checklist" },
];

export function NavBar({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const links = isAdmin ? [...baseLinks, ...adminLinks] : baseLinks;

  return (
    <nav className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="font-semibold text-neutral-900"
            onClick={() => setOpen(false)}
          >
            Vehicle Inspections
          </Link>
          <div className="hidden items-center gap-6 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-neutral-600 hover:text-neutral-900"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <span className="text-sm text-neutral-500">{name}</span>
          <SignOutButton />
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
          className="flex h-9 w-9 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 sm:hidden"
        >
          {open ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-neutral-200 px-4 py-3 sm:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-3">
            <span className="text-sm text-neutral-500">{name}</span>
            <SignOutButton />
          </div>
        </div>
      )}
    </nav>
  );
}
