import { ChevronDown } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * A vertically scrollable area that shows a fade + chevron indicator at the
 * top/bottom edges whenever there is more content to scroll to.
 */
export function Scrollable({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState({ top: false, bottom: false });

    const update = () => {
        const el = ref.current;
        if (!el) return;
        const top = el.scrollTop > 2;
        const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2;
        setEdges((prev) =>
            prev.top === top && prev.bottom === bottom
                ? prev
                : { top, bottom },
        );
    };

    // Recompute on every render (content can change) ...
    useEffect(update);

    // ... and whenever the container is resized.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new ResizeObserver(update);
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    return (
        <div className="relative">
            <div ref={ref} onScroll={update} className={cn('overflow-y-auto', className)}>
                {children}
            </div>

            <div
                className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 h-5 rounded-t-lg bg-gradient-to-b from-card to-transparent transition-opacity duration-200',
                    edges.top ? 'opacity-100' : 'opacity-0',
                )}
            />
            <div
                className={cn(
                    'pointer-events-none absolute inset-x-0 bottom-0 flex h-7 items-end justify-center rounded-b-lg bg-gradient-to-t from-card to-transparent transition-opacity duration-200',
                    edges.bottom ? 'opacity-100' : 'opacity-0',
                )}
            >
                <ChevronDown className="mb-0.5 h-4 w-4 text-muted-foreground" />
            </div>
        </div>
    );
}
