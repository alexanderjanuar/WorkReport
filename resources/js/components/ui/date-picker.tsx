import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const;
const MONTHS = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
] as const;
const MONTHS_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
] as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** Serialise a local Date to `YYYY-MM-DD` (no timezone drift). */
function toISO(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse a `YYYY-MM-DD` string into a local-midnight Date, or null. */
function fromISO(value?: string | null): Date | null {
    if (!value) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

/** Indonesian display label, e.g. "9 Jun 2026". */
function formatDisplay(d: Date): string {
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** 6×7 grid of dates covering the month view (Monday-first). */
function buildGrid(year: number, month: number): Date[] {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Monday = 0
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
        cells.push(new Date(year, month, 1 - offset + i));
    }
    return cells;
}

export type DatePickerProps = {
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    align?: 'start' | 'center' | 'end';
};

export function DatePicker({
    value,
    onChange,
    min,
    max,
    id,
    placeholder = 'Pilih tanggal',
    disabled,
    className,
    align = 'start',
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const selected = React.useMemo(() => fromISO(value), [value]);
    const minDate = React.useMemo(() => fromISO(min), [min]);
    const maxDate = React.useMemo(() => fromISO(max), [max]);
    const today = React.useMemo(() => {
        const d = new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }, []);

    // Which month is on screen — synced to the selection (or today) each open.
    const [view, setView] = React.useState(() => selected ?? today);
    React.useEffect(() => {
        if (open) setView(selected ?? today);
    }, [open, selected, today]);

    const isDisabled = React.useCallback(
        (d: Date) =>
            (minDate != null && d.getTime() < minDate.getTime()) ||
            (maxDate != null && d.getTime() > maxDate.getTime()),
        [minDate, maxDate],
    );

    const grid = React.useMemo(
        () => buildGrid(view.getFullYear(), view.getMonth()),
        [view],
    );

    const shiftMonth = (delta: number) =>
        setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));

    const pick = (d: Date) => {
        if (isDisabled(d)) return;
        onChange(toISO(d));
        setOpen(false);
    };

    const todayDisabled = isDisabled(today);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    id={id}
                    disabled={disabled}
                    data-empty={selected == null}
                    className={cn(
                        'flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-white/60 px-3 text-left text-sm shadow-none transition-colors hover:border-lux-teal/50 focus-visible:border-lux-teal focus-visible:ring-2 focus-visible:ring-lux-teal/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/5',
                        className,
                    )}
                >
                    <CalendarDays className="h-4 w-4 shrink-0 text-lux-teal-dark/70" />
                    <span
                        className={cn(
                            'flex-1 truncate',
                            selected
                                ? 'text-foreground'
                                : 'text-muted-foreground/60',
                        )}
                    >
                        {selected ? formatDisplay(selected) : placeholder}
                    </span>
                </button>
            </PopoverTrigger>

            <PopoverContent align={align} className="w-[17.5rem] p-3">
                {/* month navigation */}
                <div className="mb-2 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => shiftMonth(-1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-lux-teal/10 hover:text-lux-teal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-teal/20"
                        aria-label="Bulan sebelumnya"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="text-sm font-semibold text-foreground">
                        {MONTHS[view.getMonth()]} {view.getFullYear()}
                    </div>
                    <button
                        type="button"
                        onClick={() => shiftMonth(1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-lux-teal/10 hover:text-lux-teal-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-teal/20"
                        aria-label="Bulan berikutnya"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* weekday header */}
                <div className="grid grid-cols-7 gap-0.5">
                    {WEEKDAYS.map((w) => (
                        <div
                            key={w}
                            className="flex h-8 items-center justify-center text-[0.7rem] font-medium text-muted-foreground/70"
                        >
                            {w}
                        </div>
                    ))}
                </div>

                {/* day grid */}
                <div className="grid grid-cols-7 gap-0.5">
                    {grid.map((d) => {
                        const outside = d.getMonth() !== view.getMonth();
                        const isSelected = selected != null && sameDay(d, selected);
                        const isToday = sameDay(d, today);
                        const off = isDisabled(d);

                        return (
                            <button
                                key={toISO(d)}
                                type="button"
                                disabled={off}
                                onClick={() => pick(d)}
                                className={cn(
                                    'flex h-9 w-9 items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-teal/30',
                                    !isSelected &&
                                        !off &&
                                        'hover:bg-lux-teal/10 hover:text-lux-teal-dark',
                                    isSelected &&
                                        'bg-lux-teal font-semibold text-white shadow-sm shadow-lux-teal/30 hover:bg-lux-teal',
                                    !isSelected &&
                                        isToday &&
                                        'font-semibold text-lux-teal-dark ring-1 ring-inset ring-lux-teal/50',
                                    !isSelected &&
                                        !isToday &&
                                        !outside &&
                                        'text-foreground',
                                    outside &&
                                        !isSelected &&
                                        'text-muted-foreground/40',
                                    off && 'cursor-not-allowed opacity-40 hover:bg-transparent',
                                )}
                            >
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>

                {/* quick action */}
                <div className="mt-2 border-t border-border/60 pt-2">
                    <button
                        type="button"
                        disabled={todayDisabled}
                        onClick={() => pick(today)}
                        className="w-full rounded-lg py-1.5 text-xs font-medium text-lux-teal-dark transition-colors hover:bg-lux-teal/10 disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:hover:bg-transparent"
                    >
                        Hari ini
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
