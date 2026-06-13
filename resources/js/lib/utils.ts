import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

/**
 * Current CSRF token from the <meta name="csrf-token"> tag, for native
 * (full-page) form submissions — used so login/logout navigate at the
 * top level (which is immune to the https→http mixed-content block that
 * silently breaks Inertia XHR redirects behind an HTTPS proxy).
 */
export function csrfToken(): string {
    if (typeof document === 'undefined') return '';
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
    );
}
