import { Check, ChevronDown, Link2 } from 'lucide-react';
import * as React from 'react';

import {
    Popover,
    PopoverAnchor,
    PopoverContent,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type ComboboxOption = {
    value: string;
    label: string;
    hint?: string;
};

type ComboboxProps = {
    /** Current free-text value (the manual label). */
    value: string;
    /** Fired when the user types — caller should clear any linked option. */
    onTextChange: (text: string) => void;
    /** Fired when the user picks an option from the list. */
    onSelect: (option: ComboboxOption) => void;
    options: ComboboxOption[];
    /** The currently linked option value, if any (shows a link badge). */
    linkedValue?: string;
    placeholder?: string;
    className?: string;
    id?: string;
};

export function Combobox({
    value,
    onTextChange,
    onSelect,
    options,
    linkedValue,
    placeholder,
    className,
    id,
}: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);

    const query = value.trim().toLowerCase();
    const filtered = query
        ? options.filter((o) => o.label.toLowerCase().includes(query))
        : options;

    const linked = linkedValue
        ? options.find((o) => o.value === linkedValue)
        : undefined;

    return (
        <Popover open={open && options.length > 0} onOpenChange={setOpen}>
            <PopoverAnchor asChild>
                <div ref={anchorRef} className="relative">
                    {linked && (
                        <Link2 className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-lux-teal-dark dark:text-lux-teal" />
                    )}
                    <input
                        id={id}
                        type="text"
                        value={value}
                        placeholder={placeholder}
                        autoComplete="off"
                        onFocus={() => setOpen(true)}
                        onClick={() => setOpen(true)}
                        onChange={(e) => {
                            onTextChange(e.target.value);
                            setOpen(true);
                        }}
                        className={cn(
                            'flex h-11 w-full rounded-xl border border-border bg-white/60 px-3 pr-9 text-sm shadow-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 focus-visible:outline-none dark:bg-white/5',
                            linked && 'pl-9',
                            className,
                        )}
                    />
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setOpen((o) => !o)}
                        className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Pilih item target"
                    >
                        <ChevronDown className="size-4" />
                    </button>
                </div>
            </PopoverAnchor>

            <PopoverContent
                align="start"
                sideOffset={4}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                    if (anchorRef.current?.contains(e.target as Node)) {
                        e.preventDefault();
                    }
                }}
                className="w-(--radix-popover-trigger-width) min-w-56 p-1"
            >
                {filtered.length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                        Tidak ada item cocok — teks Anda akan disimpan manual.
                    </p>
                ) : (
                    <div className="max-h-56 space-y-0.5 overflow-y-auto">
                        {filtered.map((o) => {
                            const isLinked = o.value === linkedValue;
                            return (
                                <button
                                    key={o.value}
                                    type="button"
                                    onClick={() => {
                                        onSelect(o);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-lux-teal/10',
                                        isLinked &&
                                            'bg-lux-teal/10 text-lux-teal-dark dark:text-lux-teal',
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            'size-3.5 shrink-0',
                                            isLinked
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    <span className="flex-1 truncate">
                                        {o.label}
                                    </span>
                                    {o.hint && (
                                        <span className="shrink-0 rounded-md bg-lux-teal/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-lux-teal-dark dark:text-lux-teal">
                                            {o.hint}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}
