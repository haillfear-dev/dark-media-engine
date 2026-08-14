"use client";
import { useFormStatus } from "react-dom";
export function PendingButton({ idle, pending = "ANALISANDO TOPIC...", className }: { idle: string; pending?: string; className?: string }) { const { pending: isPending } = useFormStatus(); return <button className={className} disabled={isPending} aria-live="polite">{isPending ? pending : idle}</button>; }
