"use client";
import { useFormStatus } from "react-dom";
export function PendingButton({ idle, pending = "ANALISANDO TOPIC...", className, disabled = false }: { idle: string; pending?: string; className?: string; disabled?: boolean }) { const { pending: isPending } = useFormStatus(); return <button className={className} disabled={disabled || isPending} aria-live="polite">{isPending ? pending : idle}</button>; }
