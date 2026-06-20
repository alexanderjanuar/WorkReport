import { Check, ChevronDown, Search } from 'lucide-react';
import * as React from 'react';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type SearchableOption = {
    value: string;
    label: string;
    /** Optional avatar/logo shown before the label. */
    logo?: string | null;
};

type Props = {
    value: string;
    onChange: (value: string) => void;
    options: SearchableOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyText?: string;
    /** Extra classes for the trigger button. */
    className?: string;
    id?: string;
};

export function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = 'Pilih…',
    searchPlaceholder = 'Cari…',
    emptyText = 'Tidak ditemukan.',
    className,
    id,
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selected = options.find((o) => o.value === value);
    const q = query.trim().toLowerCase();
    const filtered = q
        ? options.filter((o) => o.label.toLowerCase().includes(q))
        : options;

    React.useEffect(() => {
        if (!open) {
            setQuery('');
            return;
        }
        const t = setTimeout(() => inputRef.current?.focus(), 20);
        return () => clearTimeout(t);
    }, [open]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    id={id}
                    type="button"
                    className={cn(
                        'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-border bg-white/60 px-3 text-left text-sm shadow-none transition-colors focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 focus-visible:outline-none dark:bg-white/5',
                        className,
                    )}
                >
                    <span
                        className={cn(
                            'flex min-w-0 items-center gap-2 truncate',
                            !selected && 'text-muted-foreground',
                        )}
                    >
                        {selected?.logo ? (
                            <img
                                src={selected.logo}
                                alt=""
                                className="size-5 shrink-0 rounded-full object-cover ring-1 ring-border"
                            />
                        ) : null}
                        <span className="truncate">
                            {selected ? selected.label : placeholder}
                        </span>
                    </span>
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground/70" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="w-(--radix-popover-trigger-width) p-0"
            >
                <div className="flex items-center gap-2 border-b border-border px-3">
                    <Search className="size-4 shrink-0 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                    />
                </div>
                <div className="max-h-60 overflow-y-auto p-1">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            {emptyText}
                        </div>
                    ) : (
                        filtered.map((o) => (
                            <button
                                key={o.value}
                                type="button"
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                                className={cn(
                                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-lux-teal/10',
                                    o.value === value &&
                                        'bg-lux-teal/10 font-medium',
                                )}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    {o.logo ? (
                                        <img
                                            src={o.logo}
                                            alt=""
                                            className="size-6 shrink-0 rounded-full object-cover ring-1 ring-border"
                                        />
                                    ) : null}
                                    <span className="truncate">{o.label}</span>
                                </span>
                                {o.value === value && (
                                    <Check className="size-4 shrink-0 text-lux-teal-dark dark:text-lux-teal" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
