import type { ReactNode } from 'react';

/**
 * Page header in the house style: a teal "eyebrow" label (dot + uppercase
 * tracked text), a bold title, an optional description, and an optional action.
 */
export function PageHeader({
    eyebrow,
    title,
    description,
    action,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
                {eyebrow && (
                    <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] text-lux-teal-dark uppercase dark:text-lux-teal">
                        <span className="h-1.5 w-1.5 rounded-full bg-lux-teal" />
                        {eyebrow}
                    </span>
                )}
                <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                    {title}
                </h1>
                {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {action}
        </div>
    );
}

/** Shared teal-gradient primary button classes (house style). */
export const primaryButtonClass =
    'gap-2 bg-gradient-to-b from-[#16c2ad] to-lux-teal-dark text-white shadow-md shadow-lux-teal/20 hover:brightness-105';
